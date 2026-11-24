import test from 'node:test';
import assert from 'node:assert/strict';
import { insuranceConfiguration } from '../src/modules/insurance/configuration.js';
import { ratePartnerPlans } from '../src/modules/insurance/client.js';
import { signQuote, verifyQuote } from '../../../packages/insurance/index.js';

const selection = {
  modelSlug: 'e-san',
  trim: 'BALANCED',
  colorId: 'silver',
  wheelId: 'w17-alloy',
  price: 1,
};
test('configured bookings use Catalog price before a physical car exists; browser money is ignored', async (t) => {
  const previous = process.env.CATALOG_API_URL;
  process.env.CATALOG_API_URL = 'http://127.0.0.1:3002/api/v1';
  t.after(() => {
    if (previous === undefined) delete process.env.CATALOG_API_URL;
    else process.env.CATALOG_API_URL = previous;
  });
  const vehicle = await insuranceConfiguration(
    selection,
    async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:3002/api/v1/cars/quote');
      assert.equal(JSON.parse(options.body).price, undefined);
      return new Response(
        JSON.stringify({
          data: {
            modelSlug: 'e-san',
            trim: 'BALANCED',
            total: '1850000.00',
            estimatedReady: { from: '2026-12-28' },
          },
        }),
      );
    },
  );
  assert.equal(vehicle.vehicleValue, 1850000);
  assert.equal(vehicle.trimCode, 'BALANCED');
  assert.equal(vehicle.year, 2026);
  assert.equal(vehicle.carId, undefined);
  await assert.rejects(insuranceConfiguration({ ...selection, wheelId: '' }), {
    code: 'INVALID_CONFIGURATION',
  });
  await assert.rejects(
    insuranceConfiguration(
      selection,
      async () => new Response('{}', { status: 422 }),
    ),
    { code: 'INVALID_CONFIGURATION' },
  );
  await assert.rejects(
    insuranceConfiguration(selection, async () => {
      throw new Error('offline');
    }),
    { code: 'CATALOG_UNAVAILABLE' },
  );
});
test('preview and saved car use identical premium, while the final quote binds the actual car and VIN', () => {
  const key = 'test-only-partner-key-'.repeat(3);
  const plan = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    slug: 'signature',
    name: 'Signature',
    finalAmount: 17005,
  };
  const plans = [{ ...plan, quoteToken: signQuote(plan, key) }];
  const vehicle = {
    modelSlug: 'e-san',
    modelName: 'E-san',
    trimCode: 'BALANCED',
    vehicleValue: 1850000,
    year: 2026,
  };
  const [preview] = ratePartnerPlans(plans, vehicle, key);
  const actual = {
    carId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    ...vehicle,
    vin: '12345678901234567',
  };
  const [saved] = ratePartnerPlans(plans, actual, key);
  assert.equal(preview.finalAmount, 22800);
  assert.equal(saved.finalAmount, preview.finalAmount);
  assert.deepEqual(verifyQuote(saved.quoteToken, key).vehicle, actual);
  assert.throws(() => ratePartnerPlans(plans, vehicle, 'wrong-key'.repeat(8)), {
    code: 'NOVA_INVALID_QUOTE',
  });
});
