// Insurance: deterministic recovery tests at the carshop/NOVA boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { requireInsuranceSyncKey } from '../src/modules/insurance/syncRoutes.js';
import {
  syncInsuranceRow,
  syncInsurance,
} from '../src/modules/insurance/worker.js';
import {
  prepareInsurance,
  enrichOrders,
} from '../src/modules/insurance/repository.js';
import {
  coverageDates,
  signQuote,
  verifyQuote,
  secretMatches,
  partnerEndpoint,
} from '../../../packages/insurance/index.js';
const orderId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('insurance sync requires its backend key, not a customer session', () => {
  assert.throws(
    () =>
      requireInsuranceSyncKey({ get: () => 'Bearer customer-token' }, {}, () =>
        assert.fail(),
      ),
    { status: 401 },
  );
});
const row = {
  order_id: orderId,
  status: 'AWAITING_PAYMENT',
  quote_token: 'signed-quote',
  delivery_date: '2026-12-01',
  customer_snapshot: JSON.stringify({ fullName: 'Demo' }),
  vehicle_snapshot: JSON.stringify({ vin: '123' }),
};
const pending = {
  orderId,
  requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  status: 'PENDING_APPROVAL',
};
test('insurance dates are calendar years, including leap days and invalid dates', () => {
  assert.deepEqual(coverageDates('2026-12-01'), {
    startsOn: '2026-12-01',
    endsOn: '2027-11-30',
  });
  assert.equal(coverageDates('2024-02-29').endsOn, '2025-02-28');
  assert.throws(() => coverageDates('2026-02-30'));
  assert.throws(() => coverageDates('2026-2-1'));
});
test('quotes resist price tampering and wrong keys; partner URLs reject plaintext remote hosts', () => {
  const secret = 'a'.repeat(48);
  const quote = signQuote({ finalAmount: 6165.5 }, secret);
  assert.equal(verifyQuote(quote, secret).finalAmount, 6165.5);
  assert.throws(() => verifyQuote(quote, 'b'.repeat(48)));
  assert.throws(() =>
    verifyQuote(
      quote.replace(
        quote.split('.')[0],
        Buffer.from('{"finalAmount":1}').toString('base64url'),
      ),
      secret,
    ),
  );
  assert.equal(secretMatches('x', undefined), false);
  assert.throws(() =>
    partnerEndpoint('http://remote.example/api', 'partner/plans'),
  );
  assert.equal(
    partnerEndpoint('http://127.0.0.1:3010/api', 'partner/plans'),
    'http://127.0.0.1:3010/api/partner/plans',
  );
});
test('car-only order never contacts NOVA or requires delivery date', async () => {
  assert.equal(await prepareInsurance({}), null);
});
test('historical orders remain readable before insurance migration, while DB outages are not hidden', async () => {
  const orders = [{ id: orderId, insurancePlan: 'Historical plan' }];
  assert.equal(
    await enrichOrders(orders, {
      query: async () => {
        throw Object.assign(new Error('table missing'), {
          code: 'ER_NO_SUCH_TABLE',
        });
      },
    }),
    orders,
  );
  await assert.rejects(
    enrichOrders(orders, {
      query: async () => {
        throw new Error('connection lost');
      },
    }),
  );
});
test('first send and lost-response retry use identical order and snapshot', async () => {
  const sent = [];
  const writes = [];
  const db = { query: async (...args) => writes.push(args) };
  await assert.rejects(
    syncInsuranceRow(db, row, async (path, body) => {
      sent.push({ path, body });
      throw new Error('response lost after commit');
    }),
  );
  assert.equal(writes.length, 0);
  await syncInsuranceRow(db, row, async (path, body) => {
    sent.push({ path, body });
    return pending;
  });
  assert.deepEqual(sent[0], sent[1]);
  assert.equal(writes[0][1][0], 'PENDING_APPROVAL');
});
test('pending requests poll instead of resubmitting and persist policy after approval', async () => {
  const writes = [];
  const issued = {
    ...pending,
    status: 'ISSUED',
    policyNumber: 'NOVA-DEMO',
    startsOn: '2026-12-01',
    endsOn: '2027-11-30',
  };
  await syncInsuranceRow(
    { query: async (...args) => writes.push(args) },
    { ...row, status: 'PENDING_APPROVAL' },
    async (path, body) => {
      assert.equal(path, `requests/${orderId}`);
      assert.equal(body, undefined);
      return issued;
    },
  );
  assert.equal(writes[0][1][0], 'ISSUED');
  assert.equal(JSON.parse(writes[0][1][2]).policyNumber, issued.policyNumber);
  await assert.rejects(
    syncInsuranceRow(
      { query: async () => assert.fail('invalid response must not persist') },
      row,
      async () => ({ ...issued, orderId: 'wrong' }),
    ),
  );
});
test('worker selects only paid/completed insured orders, backs off on outage and releases replica lock', async () => {
  const queries = [];
  const connection = {
    query: async (sql, args) => {
      queries.push({ sql, args });
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('SELECT n.*')) return [[{ ...row, attempts: 2 }]];
      return [[]];
    },
    release: () => queries.push({ sql: 'release' }),
  };
  const previous = process.env.NOVA_API_URL;
  delete process.env.NOVA_API_URL;
  try {
    await syncInsurance({ getConnection: async () => connection });
  } finally {
    if (previous !== undefined) process.env.NOVA_API_URL = previous;
  }
  assert.match(
    queries.find((entry) => entry.sql.includes('SELECT n.*')).sql,
    /o.status IN \('PAID', 'COMPLETED'\)/,
  );
  assert.equal(
    queries.find((entry) => entry.sql.includes('attempts = attempts + 1'))
      .args[0],
    20,
  );
  assert.ok(queries.some((entry) => entry.sql.includes('RELEASE_LOCK')));
  assert.equal(queries.at(-1).sql, 'release');
});
