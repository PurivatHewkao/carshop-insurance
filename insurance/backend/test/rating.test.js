import test from 'node:test';
import assert from 'node:assert/strict';
import {
  configureVehicle,
  rateVehicle,
  ratingModels,
  ratingTrims,
  ratingColors,
} from '../../../packages/insurance/rating.js';
import { plans } from '../scripts/seed.js';
import { createApp } from '../src/app.js';
import { verifyQuote } from '../../../packages/insurance/index.js';
import { validatePartnerRequest } from '../src/modules/partner.js';

const config = (overrides = {}) => ({
  modelSlug: 'e-san',
  trimCode: 'ECO',
  colorCode: 'white',
  wheelCode: 'standard',
  ...overrides,
});
test('agreed annual premiums cover all twelve model/trim combinations', () => {
  const expected = {
    'e-san': [22200, 23600, 28100],
    khon: [27000, 29000, 33500],
    iburaporn: [29400, 31000, 36400],
    rushri: [29800, 31400, 36900],
  };
  for (const [modelSlug, amounts] of Object.entries(expected))
    ['ECO', 'BALANCED', 'HIGH_PERFORMANCE'].forEach((trimCode, i) => {
      const vehicle = configureVehicle(config({ modelSlug, trimCode }));
      assert.equal(
        rateVehicle(vehicle, 'signature').originalAmount,
        amounts[i],
      );
    });
});
test('factory options counted once, default wheel included, partner discount capped', () => {
  const vehicle = configureVehicle(
    config({
      trimCode: 'BALANCED',
      colorCode: 'pearl-white',
      wheelCode: 'upgrade',
    }),
  );
  assert.equal(vehicle.vehicleValue, 1885000);
  const quote = rateVehicle(vehicle, 'signature', 'toyoty');
  assert.equal(quote.sumInsured, 1500000);
  assert.equal(quote.originalAmount, 24000);
  assert.equal(quote.finalAmount, 23000);
  assert.equal(
    configureVehicle(config({ trimCode: 'BALANCED' })).vehicleValue,
    1840000,
  );
  assert.equal(rateVehicle(vehicle, 'essential', 'toyoty').finalAmount, 2375);
  assert.equal(rateVehicle(vehicle, 'smart-drive').collisionLimit, 200000);
  assert.equal(rateVehicle(vehicle, 'extra-care').fireTheftLimit, 1500000);
});
test('unsupported configurations and malformed money cannot be quoted', () => {
  for (const patch of [
    { modelSlug: 'toyoty-aufa' },
    { trimCode: 'OTHER' },
    { colorCode: 'sport-red' },
    { wheelCode: 'forged-free' },
  ])
    assert.throws(() => configureVehicle(config(patch)));
  for (const vehicleValue of [-1, 1.5, NaN, Infinity, 100000001])
    assert.throws(() =>
      rateVehicle({ ...configureVehicle(config()), vehicleValue }, 'signature'),
    );
});
test('HTTP quotes ignore browser prices, require partner auth, and bind signed quotes to the vehicle', async (t) => {
  const oldKey = process.env.NOVA_PARTNER_KEY;
  const key = 'nova-quote-test-only-'.repeat(3);
  process.env.NOVA_PARTNER_KEY = key;
  const rows = plans.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    insurance_type: p.type,
    premium_amount: p.amount,
    coverage: {},
    is_recommended: p.slug === 'signature',
  }));
  const server = createApp({
    origin: 'http://localhost:5174',
    pool: () => ({ execute: async () => [rows] }),
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (oldKey === undefined) delete process.env.NOVA_PARTNER_KEY;
    else process.env.NOVA_PARTNER_KEY = oldKey;
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const send = (path, body, auth = false) =>
    fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(body),
    });
  const response = await send('/quotes', {
    ...config(),
    vehicleValue: 1,
    finalAmount: 1,
    source: 'toyoty',
  });
  assert.equal(response.status, 200);
  const result = (await response.json()).data;
  assert.equal(result.vehicle.vehicleValue, 1690000);
  assert.equal(
    result.plans.find((p) => p.slug === 'signature').finalAmount,
    21200,
  );
  assert.equal(
    (await send('/quotes', config({ colorCode: 'sport-red' }))).status,
    400,
  );
  const vehicle = {
    carId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    modelSlug: 'e-san',
    modelName: 'E-san',
    trimCode: 'ECO',
    vehicleValue: 1690000,
    year: 2026,
    vin: '12345678901234567',
  };
  assert.equal((await send('/partner/quotes', { vehicle })).status, 401);
  const partner = await send('/partner/quotes', { vehicle }, true);
  assert.equal(partner.status, 200);
  const signed = (await partner.json()).data.find(
    (p) => p.slug === 'signature',
  );
  assert.deepEqual(verifyQuote(signed.quoteToken, key).vehicle, vehicle);
  const body = {
    orderId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    quoteToken: signed.quoteToken,
    deliveryDate: '2026-12-01',
    customer: { fullName: 'Demo', phone: '', email: 'demo@example.com' },
    vehicle: { brand: 'TOYOTY', model: 'E-san', year: 2026, vin: vehicle.vin },
  };
  assert.equal(validatePartnerRequest(body).plan.finalAmount, 21200);
  assert.throws(
    () =>
      validatePartnerRequest({
        ...body,
        vehicle: { ...body.vehicle, vin: '99999999999999999' },
      }),
    { code: 'QUOTE_VEHICLE_MISMATCH' },
  );
});

test('every factory option preserves coverage, ordered premiums and monotonic prices', () => {
  const slugs = ['essential', 'smart-drive', 'extra-care', 'signature'];
  for (const model of ratingModels)
    for (const trim of ratingTrims) {
      const base = configureVehicle(
        config({ modelSlug: model.slug, trimCode: trim.code }),
      );
      for (const color of ratingColors.filter(
        (c) => !c.trim || c.trim === trim.code,
      ))
        for (const wheelCode of ['standard', 'upgrade']) {
          const vehicle = configureVehicle(
            config({
              modelSlug: model.slug,
              trimCode: trim.code,
              colorCode: color.code,
              wheelCode,
            }),
          );
          const quotes = slugs.map((slug) =>
            rateVehicle(vehicle, slug, 'toyoty'),
          );
          quotes.forEach((quote, i) => {
            assert.ok(
              quote.finalAmount >=
                rateVehicle(base, slugs[i], 'toyoty').finalAmount,
            );
            assert.ok(quote.discountAmount <= 1000);
            assert.ok(
              quote.finalAmount <= rateVehicle(vehicle, slugs[i]).finalAmount,
            );
            if (i) assert.ok(quote.finalAmount > quotes[i - 1].finalAmount);
          });
          assert.equal(
            quotes[0].finalAmount,
            rateVehicle(base, 'essential', 'toyoty').finalAmount,
          );
          assert.equal(
            quotes[1].finalAmount,
            rateVehicle(base, 'smart-drive', 'toyoty').finalAmount,
          );
          assert.equal(quotes[1].collisionLimit, 200000);
          assert.equal(quotes[2].collisionLimit, 200000);
          assert.equal(quotes[2].fireTheftLimit, quotes[3].sumInsured);
          assert.equal(quotes[3].collisionLimit, quotes[3].sumInsured);
          assert.equal(quotes[3].repairType, 'GARAGE');
          assert.equal(quotes[3].deductible, 0);
        }
    }
});
