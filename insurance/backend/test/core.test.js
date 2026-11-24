import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { pricing } from '../src/modules/plans.js';
import { validatePurchase } from '../src/modules/validation.js';
import {
  createPurchase,
  tokenHash,
  tokenMatches,
} from '../src/modules/purchases.js';
import { createApp } from '../src/app.js';
// Insurance: include the new partner/auth/approval regression tests in npm test.
import './partner.test.js';
import './rating.test.js';
import './upstream.test.js';
// Insurance: production serverless dispatch regression.
import './carshopSync.test.js';

const input = () => ({
  planId: randomUUID(),
  clientRequestId: randomUUID(),
  customer: {
    fullName: 'Demo Student',
    email: 'demo@example.com',
    phone: '0812345678',
  },
  vehicle: {
    brand: 'Toyota',
    model: 'Yaris Ativ',
    year: 2026,
    registrationNumber: '',
  },
  source: 'toyoty',
});
test('server pricing: direct, partner, decimal rounding and discount cap', () => {
  assert.deepEqual(pricing('6490.00', 'toyoty'), {
    originalAmount: 6490,
    discountAmount: 324.5,
    finalAmount: 6165.5,
  });
  assert.equal(pricing('17900.00', 'toyoty').finalAmount, 17005);
  assert.equal(pricing('50000.00', 'toyoty').discountAmount, 1000);
  assert.equal(pricing('3490.00', 'direct').finalAmount, 3490);
  assert.equal(pricing('6490.99', 'toyoty').finalAmount, 6166.44);
});
test('validation normalizes data, permits no registration, ignores client price', () => {
  const body = input();
  body.finalAmount = 1;
  body.customer.fullName = ' Demo Student ';
  const valid = validatePurchase(body);
  assert.equal(valid.fullName, 'Demo Student');
  assert.equal(valid.registrationNumber, '');
  assert.equal(valid.finalAmount, undefined);
});
test('validation rejects malformed nested data, phone, year, source and UUID', () => {
  for (const body of [
    null,
    {},
    { ...input(), customer: null },
    { ...input(), vehicle: { brand: 'Toyota', model: 'Demo', year: 9999 } },
    { ...input(), source: 'javascript:evil' },
    { ...input(), planId: 'bad' },
    { ...input(), customer: { fullName: 'A', email: 'bad', phone: 'xxx' } },
  ])
    assert.throws(() => validatePurchase(body), { code: 'VALIDATION_ERROR' });
});
test('receipt hash does not contain token and rejects incorrect tokens', () => {
  const token = randomBytes(32).toString('base64url');
  const hash = tokenHash(token);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.ok(tokenMatches(token, hash));
  assert.ok(!tokenMatches('wrong', hash));
  assert.ok(!tokenMatches(undefined, hash));
});
test('transaction rolls back if policy insertion fails', async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push('begin'),
    commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'),
    release: () => calls.push('release'),
    execute: async (sql) => {
      if (sql.startsWith('SELECT id')) return [[]];
      if (sql.startsWith('SELECT *')) return [[{ premium_amount: '6490.00' }]];
      if (sql.includes('INSERT INTO insurance_policies'))
        throw new Error('database unavailable');
      return [{}];
    },
  };
  await assert.rejects(
    createPurchase(
      { getConnection: async () => connection },
      validatePurchase(input()),
    ),
  );
  assert.deepEqual(calls, ['begin', 'rollback', 'release']);
});
test('HTTP boundary: health, CORS, validation, unauthorized, body limit and rate limit', async (t) => {
  const app = createApp({
    origin: 'http://localhost:5174',
    pool: () => ({ execute: async () => [[{ ok: 1 }]] }),
    purchaseLimit: 2,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const send = (path, options) => fetch(base + path, options);
  assert.equal((await send('/health')).status, 200);
  assert.equal(
    (await send('/health', { headers: { Origin: 'https://evil.example' } }))
      .status,
    403,
  );
  assert.equal((await send('/policies/' + randomUUID())).status, 401);
  assert.equal(
    (
      await send('/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await send('/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'x'.repeat(17000) }),
      })
    ).status,
    413,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await send('/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      // Insurance: direct purchases are disabled regardless of payload validity.
      403,
    );
  assert.equal(
    (
      await send('/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    ).status,
    // Insurance: the closed purchase boundary responds before the legacy limiter.
    403,
  );
});
