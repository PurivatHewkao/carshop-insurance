// Integration tests against a real local MySQL.
// Uses MYSQL_HOST/PORT/USER/PASSWORD from .env, but always a separate database
// (TEST_MYSQL_DATABASE, default carshop_payment_test) that is rebuilt each run
// from "db schema/01_mysql_schema.sql" + database/migrations/*.sql.
// Run: npm test   (inside services/payment)
import 'dotenv/config';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = process.env.TEST_MYSQL_DATABASE || 'carshop_payment_test';
if (!/_test$/.test(TEST_DB))
  throw new Error('TEST_MYSQL_DATABASE must end with _test');

let admin; // connection with multipleStatements, on TEST_DB
let server;
let identityServer;
let base;
let closePool;
const ids = {};
const actors = {}; // name -> { userId, profileId }
// Bearer token -> { id: users.id, role } answered by the fake Identity below.
const sessions = {};

async function setupDatabase() {
  admin = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true,
    timezone: 'Z',
  });
  // Only the dedicated *_test database is ever dropped.
  await admin.query('DROP DATABASE IF EXISTS `' + TEST_DB + '`');
  const schema = await readFile(
    path.join(here, '../../../db schema/01_mysql_schema.sql'),
    'utf8',
  );
  await admin.query(schema.replaceAll('carshop_sql', TEST_DB));
  const migrationsDir = path.join(here, '../database/migrations');
  for (const file of (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await admin.query(await readFile(path.join(migrationsDir, file), 'utf8'));
  }
}

// One user per test actor. `profile` = which table gets the domain row.
const ACTORS = {
  admin: { role: 'ADMIN', profile: 'employee' },
  finance: { role: 'FINANCE', profile: 'employee' },
  manager: { role: 'MANAGER', profile: 'employee' },
  seller: { role: 'SELLER', profile: 'employee' },
  seller2: { role: 'SELLER', profile: 'employee' },
  stock: { role: 'STOCK', profile: 'employee' },
  customer: { role: 'CUSTOMER', profile: 'customer' },
  customer2: { role: 'CUSTOMER', profile: 'customer' },
};

async function seed() {
  for (const [name, { role, profile }] of Object.entries(ACTORS)) {
    const userId = randomUUID();
    const profileId = randomUUID();
    await admin.query(
      `INSERT INTO users (id, username, password_hash, role, email) VALUES (?, ?, 'x', ?, ?);
       INSERT INTO ${profile === 'employee' ? 'employees' : 'customers'}
         (id, user_id, first_name, last_name) VALUES (?, ?, ?, 'Test');`,
      [userId, name, role, name + '@example.test', profileId, userId, name],
    );
    actors[name] = { userId, profileId };
    sessions['tok-' + name] = { id: userId, role: role.toLowerCase() };
  }
  // Defaults used by makeOrder(): the order belongs to `customer`, sold by `seller`.
  ids.employee = actors.seller.profileId;
  ids.customer = actors.customer.profileId;
  ids.model = randomUUID();
  await admin.query(
    "INSERT INTO car_models (id, brand, model_name) VALUES (?, 'Toyoty', 'Test')",
    [ids.model],
  );
}

/** Minimal Identity: GET /api/v1/users/me with a Bearer token. */
async function startFakeIdentity() {
  identityServer = createServer((req, res) => {
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
    const user = req.url === '/api/v1/users/me' && sessions[token];
    res.setHeader('content-type', 'application/json');
    if (!user) {
      res.statusCode = 401;
      return res.end('{"error":{"code":"UNAUTHORIZED"}}');
    }
    res.end(JSON.stringify({ data: { ...user, status: 'active' } }));
  });
  identityServer.listen(0, '127.0.0.1');
  await new Promise((resolve) => identityServer.once('listening', resolve));
  process.env.IDENTITY_API_URL =
    'http://127.0.0.1:' + identityServer.address().port + '/api/v1';
}

let vinCounter = 0;
async function makeOrder(
  total,
  status = 'CONFIRMED',
  { customerId = ids.customer, sellerId = ids.employee } = {},
) {
  const carId = randomUUID();
  const orderId = randomUUID();
  vinCounter += 1;
  await admin.query(
    `INSERT INTO cars (id, car_model_id, vin, color, manufacture_year, price, status)
       VALUES (?, ?, ?, 'white', 2026, ?, 'RESERVED');
     INSERT INTO orders (id, customer_id, seller_id, car_id, subtotal, discount, total_amount, status)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?);`,
    [
      carId,
      ids.model,
      'TESTVIN' + String(vinCounter).padStart(10, '0'),
      total,
      orderId,
      customerId,
      sellerId,
      carId,
      total,
      total,
      status,
    ],
  );
  return { orderId, carId };
}

// `as` = which actor is logged in (default: admin = Finance work). as: null = no login.
async function api(method, url, { body, key, as = 'admin' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (key) headers['idempotency-key'] = key;
  if (as) headers.authorization = 'Bearer tok-' + as;
  const res = await fetch(base + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    json: text ? JSON.parse(text) : null,
  };
}

async function orderStatus(orderId) {
  const [[row]] = await admin.query('SELECT status FROM orders WHERE id = ?', [
    orderId,
  ]);
  return row.status;
}
async function carStatus(carId) {
  const [[row]] = await admin.query('SELECT status FROM cars WHERE id = ?', [
    carId,
  ]);
  return row.status;
}

before(async () => {
  await setupDatabase();
  await admin.query('USE `' + TEST_DB + '`');
  await seed();
  await startFakeIdentity();
  process.env.MYSQL_DATABASE = TEST_DB;
  const { default: app } = await import('../src/app.js');
  ({ closeMysqlPool: closePool } = await import('../src/config/mysql.js'));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
});

after(async () => {
  await new Promise((resolve) => server?.close(resolve));
  await new Promise((resolve) => identityServer?.close(resolve));
  await closePool?.();
  await admin?.end();
});

describe('payments', () => {
  test('health still works', async () => {
    const res = await api('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.json.service, 'payment');
  });

  test('validation: missing Idempotency-Key, bad amount, transfer without reference', async () => {
    const { orderId } = await makeOrder('1000.00');
    let res = await api('POST', `/orders/${orderId}/payments`, {
      body: { amount: '100.00', paymentMethod: 'CASH' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'IDEMPOTENCY_KEY_REQUIRED');

    res = await api('POST', `/orders/${orderId}/payments`, {
      key: 'key-bad-amount-1',
      body: { amount: '10.999', paymentMethod: 'CASH' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.details[0].field, 'amount');

    res = await api('POST', `/orders/${orderId}/payments`, {
      key: 'key-no-ref-0001',
      body: { amount: '100.00', paymentMethod: 'BANK_TRANSFER' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.details[0].field, 'transactionReference');

    res = await api('POST', `/orders/not-a-uuid/payments`, {
      key: 'key-bad-id-0001',
      body: { amount: '1.00', paymentMethod: 'CASH' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'INVALID_ID');
  });

  test('order must exist and be CONFIRMED', async () => {
    let res = await api('POST', `/orders/${randomUUID()}/payments`, {
      key: 'key-missing-order',
      body: { amount: '1.00', paymentMethod: 'CASH' },
    });
    assert.equal(res.status, 404);
    const { orderId } = await makeOrder('1000.00', 'PENDING');
    res = await api('POST', `/orders/${orderId}/payments`, {
      key: 'key-pending-order',
      body: { amount: '1.00', paymentMethod: 'CASH' },
    });
    assert.equal(res.status, 409);
    assert.equal(res.json.error.code, 'ORDER_NOT_PAYABLE');
  });

  test('full flow: transfer pending -> confirm -> card rest -> order PAID', async () => {
    const { orderId } = await makeOrder('1000000.00');
    const transfer = {
      amount: '400000.00',
      paymentMethod: 'BANK_TRANSFER',
      transactionReference: 'TRF-001',
    };

    const first = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-flow-0001',
      body: transfer,
    });
    assert.equal(first.status, 201);
    assert.equal(first.json.data.status, 'PENDING');
    assert.equal(first.json.data.amount, '400000.00');

    // Same key + same body = replay, no second payment.
    const replay = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-flow-0001',
      body: transfer,
    });
    assert.equal(replay.status, 201);
    assert.equal(replay.headers.get('idempotent-replayed'), 'true');
    assert.equal(replay.json.data.id, first.json.data.id);

    // Same key + different body = 422.
    const reused = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-flow-0001',
      body: { ...transfer, amount: '1.00' },
    });
    assert.equal(reused.status, 422);
    assert.equal(reused.json.error.code, 'IDEMPOTENCY_KEY_REUSED');

    // Pending money counts against the balance.
    const tooMuch = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-flow-0002',
      body: { amount: '600000.01', paymentMethod: 'CASH' },
    });
    assert.equal(tooMuch.status, 422);
    assert.equal(tooMuch.json.error.code, 'AMOUNT_EXCEEDS_BALANCE');

    const confirm = await api('PATCH', `/payments/${first.json.data.id}`, {
      body: { status: 'SUCCESS' },
    });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.json.data.status, 'SUCCESS');
    assert.ok(confirm.json.data.paymentDate);
    const again = await api('PATCH', `/payments/${first.json.data.id}`, {
      body: { status: 'FAILED' },
    });
    assert.equal(again.status, 409);
    assert.equal(await orderStatus(orderId), 'CONFIRMED');

    const card = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-flow-0003',
      body: { amount: '600000.00', paymentMethod: 'CREDIT_CARD' },
    });
    assert.equal(card.status, 201);
    assert.equal(card.json.data.status, 'SUCCESS');
    assert.match(card.json.data.transactionReference, /^SIM-CC-/);
    assert.equal(await orderStatus(orderId), 'PAID');

    const history = await api('GET', `/orders/${orderId}/payments`);
    assert.equal(history.json.data.length, 2);
    assert.equal(history.json.summary.paidAmount, '1000000.00');
    assert.equal(history.json.summary.outstandingAmount, '0.00');
    assert.equal(history.json.summary.orderStatus, 'PAID');

    const paidOrder = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-flow-0004',
      body: { amount: '1.00', paymentMethod: 'CASH' },
    });
    assert.equal(paidOrder.status, 409);
  });

  test('parallel double-click with one Idempotency-Key creates one payment', async () => {
    const { orderId } = await makeOrder('900.00');
    const body = { amount: '900.00', paymentMethod: 'CREDIT_CARD' };
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        api('POST', `/orders/${orderId}/payments`, {
          key: 'pay-parallel-01',
          body,
        }),
      ),
    );
    assert.ok(
      results.every((r) => r.status === 201),
      JSON.stringify(results.map((r) => r.status)),
    );
    assert.equal(new Set(results.map((r) => r.json.data.id)).size, 1);
    const [[{ n }]] = await admin.query(
      'SELECT COUNT(*) AS n FROM payments WHERE order_id = ?',
      [orderId],
    );
    assert.equal(Number(n), 1);
    assert.equal(await orderStatus(orderId), 'PAID');
  });

  test('cash recorded by Finance is SUCCESS at once', async () => {
    const { orderId } = await makeOrder('250.00');
    const cash = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-cash-00001',
      body: { amount: '250.00', paymentMethod: 'CASH' },
    });
    assert.equal(cash.status, 201);
    assert.equal(cash.json.data.status, 'SUCCESS');
    assert.match(cash.json.data.transactionReference, /^CASH-/);
    assert.equal(await orderStatus(orderId), 'PAID');
  });

  test('rejected payment does not count; list filters and paging', async () => {
    const { orderId } = await makeOrder('500.00');
    const p = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-reject-001',
      body: {
        amount: '500.00',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: 'TRF-REJECT-1',
      },
    });
    const rejected = await api('PATCH', `/payments/${p.json.data.id}`, {
      body: { status: 'FAILED' },
    });
    assert.equal(rejected.json.data.status, 'FAILED');
    const summary = (await api('GET', `/orders/${orderId}/payments`)).json
      .summary;
    assert.equal(summary.outstandingAmount, '500.00');

    const failedList = await api('GET', '/payments?status=FAILED&limit=1');
    assert.equal(failedList.status, 200);
    assert.equal(failedList.json.meta.limit, 1);
    assert.ok(failedList.json.meta.total >= 1);
    assert.ok(failedList.json.data.every((x) => x.status === 'FAILED'));

    const badQuery = await api('GET', '/payments?status=NOPE');
    assert.equal(badQuery.status, 400);
    const badDate = await api('GET', '/payments?dateFrom=2026-02-30');
    assert.equal(badDate.status, 400);
  });
});

describe('invoices', () => {
  test('issue, block duplicates, cancel, PAID when order paid', async () => {
    const { orderId } = await makeOrder('2000.00');
    const created = await api('POST', `/orders/${orderId}/invoices`, {
      as: 'manager',
      // issuedBy in the body is ignored: it is always the logged-in employee.
      body: { issuedBy: randomUUID(), dueDate: '2099-12-31' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.status, 'ISSUED');
    assert.equal(created.json.data.amount, '2000.00');
    assert.equal(created.json.data.dueDate, '2099-12-31');
    assert.equal(created.json.data.issuedBy, actors.manager.profileId);
    assert.match(created.json.data.invoiceNumber, /^INV-\d{8}-[0-9A-F]{6}$/);

    const dup = await api('POST', `/orders/${orderId}/invoices`, { body: {} });
    assert.equal(dup.status, 409);

    const pastDue = await api('POST', `/orders/${orderId}/invoices`, {
      body: { dueDate: '2000-01-01' },
    });
    assert.equal(pastDue.status, 400);

    // Paying the order in full turns the ISSUED invoice into PAID.
    await api('POST', `/orders/${orderId}/payments`, {
      key: 'inv-pay-00001',
      body: { amount: '2000.00', paymentMethod: 'CREDIT_CARD' },
    });
    const paid = await api('GET', `/invoices/${created.json.data.id}`);
    assert.equal(paid.json.data.status, 'PAID');
    const cannotCancel = await api(
      'POST',
      `/invoices/${created.json.data.id}/cancel`,
    );
    assert.equal(cannotCancel.status, 409);

    // A new order: cancel the ISSUED invoice, then a new one can be issued.
    const second = await makeOrder('300.00');
    const inv = await api('POST', `/orders/${second.orderId}/invoices`, {
      body: {},
    });
    const cancelled = await api('POST', `/invoices/${inv.json.data.id}/cancel`);
    assert.equal(cancelled.json.data.status, 'CANCELLED');
    const reissued = await api('POST', `/orders/${second.orderId}/invoices`, {
      body: {},
    });
    assert.equal(reissued.status, 201);

    const listed = await api('GET', `/orders/${second.orderId}/invoices`);
    assert.equal(listed.json.data.length, 2);
    const pending = await makeOrder('10.00', 'PENDING');
    const notYet = await api('POST', `/orders/${pending.orderId}/invoices`, {
      body: {},
    });
    assert.equal(notYet.status, 409);
    assert.equal(notYet.json.error.code, 'ORDER_NOT_INVOICEABLE');
  });
});

describe('refunds', () => {
  test('request -> reject -> request -> approve (partial), then full refund cancels order', async () => {
    const { orderId, carId } = await makeOrder('1000.00');
    const pay = await api('POST', `/orders/${orderId}/payments`, {
      key: 'ref-pay-00001',
      body: { amount: '1000.00', paymentMethod: 'CREDIT_CARD' },
    });
    const paymentId = pay.json.data.id;
    assert.equal(await orderStatus(orderId), 'PAID');

    const tooMuch = await api('POST', `/payments/${paymentId}/refunds`, {
      key: 'ref-req-00000',
      body: { amount: '1000.01', reason: 'too much' },
    });
    assert.equal(tooMuch.status, 422);

    const noReason = await api('POST', `/payments/${paymentId}/refunds`, {
      key: 'ref-req-0000x',
      body: { amount: '1.00' },
    });
    assert.equal(noReason.status, 400);

    const r1 = await api('POST', `/payments/${paymentId}/refunds`, {
      key: 'ref-req-00001',
      body: { amount: '300.00', reason: 'ลูกค้าขอคืนเงินบางส่วน' },
    });
    assert.equal(r1.status, 201);
    assert.equal(r1.json.data.status, 'REQUESTED');

    const open = await api('POST', `/payments/${paymentId}/refunds`, {
      key: 'ref-req-00002',
      body: { amount: '100.00', reason: 'second' },
    });
    assert.equal(open.status, 409);
    assert.equal(open.json.error.code, 'REFUND_ALREADY_REQUESTED');

    const rejectNoReason = await api(
      'POST',
      `/refunds/${r1.json.data.id}/reject`,
      { body: {} },
    );
    assert.equal(rejectNoReason.status, 400);
    const rejected = await api('POST', `/refunds/${r1.json.data.id}/reject`, {
      body: { reason: 'เอกสารไม่ครบ' },
    });
    assert.equal(rejected.json.data.status, 'REJECTED');
    assert.equal(rejected.json.data.reviewNote, 'เอกสารไม่ครบ');

    const r2 = await api('POST', `/payments/${paymentId}/refunds`, {
      key: 'ref-req-00003',
      body: { amount: '300.00', reason: 'ส่งใหม่' },
    });
    const approved = await api('POST', `/refunds/${r2.json.data.id}/approve`, {
      body: { refundReference: 'RF-001' },
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.json.data.status, 'REFUNDED');
    const twice = await api('POST', `/refunds/${r2.json.data.id}/approve`, {
      body: { refundReference: 'RF-002' },
    });
    assert.equal(twice.status, 409);

    // Partial refund: payment stays SUCCESS, order stays PAID.
    assert.equal(
      (await api('GET', `/payments/${paymentId}`)).json.data.status,
      'SUCCESS',
    );
    assert.equal(await orderStatus(orderId), 'PAID');
    // ...and a PAID order owes nothing more (not "outstanding 300").
    const afterPartial = await api('GET', `/orders/${orderId}/payments`);
    assert.equal(afterPartial.json.summary.refundedAmount, '300.00');
    assert.equal(afterPartial.json.summary.outstandingAmount, '0.00');

    const overLeft = await api('POST', `/payments/${paymentId}/refunds`, {
      key: 'ref-req-00004',
      body: { amount: '700.01', reason: 'rest' },
    });
    assert.equal(overLeft.status, 422);

    const r3 = await api('POST', `/payments/${paymentId}/refunds`, {
      key: 'ref-req-00005',
      body: { amount: '700.00', reason: 'ยกเลิกซื้อ' },
    });
    await api('POST', `/refunds/${r3.json.data.id}/approve`, {
      body: { refundReference: 'RF-003' },
    });

    assert.equal(
      (await api('GET', `/payments/${paymentId}`)).json.data.status,
      'REFUNDED',
    );
    assert.equal(await orderStatus(orderId), 'CANCELLED');
    assert.equal(await carStatus(carId), 'AVAILABLE');

    const history = await api('GET', `/orders/${orderId}/refunds`);
    assert.deepEqual(
      history.json.data.map((r) => r.status),
      ['REJECTED', 'REFUNDED', 'REFUNDED'],
    );
    const listed = await api('GET', '/refunds?status=REFUNDED');
    assert.ok(listed.json.meta.total >= 2);

    const notRefundable = await api('POST', `/payments/${paymentId}/refunds`, {
      key: 'ref-req-00006',
      body: { amount: '1.00', reason: 'x' },
    });
    assert.equal(notRefundable.status, 409);
  });
});

describe('login, roles and ownership', () => {
  test('every route except /health needs a valid session', async () => {
    assert.equal((await api('GET', '/health', { as: null })).status, 200);
    const anonymous = await api('GET', '/payments', { as: null });
    assert.equal(anonymous.status, 401);
    const badToken = await api('GET', '/payments', { as: 'nobody' });
    assert.equal(badToken.status, 401);
    const { orderId } = await makeOrder('100.00');
    const anonymousPay = await api('POST', `/orders/${orderId}/payments`, {
      as: null,
      key: 'auth-anon-0001',
      body: { amount: '100.00', paymentMethod: 'CREDIT_CARD' },
    });
    assert.equal(anonymousPay.status, 401);
    assert.equal(await orderStatus(orderId), 'CONFIRMED');
  });

  test('customer pays and requests refunds only for their own orders', async () => {
    const mine = await makeOrder('1000.00');
    const theirs = await makeOrder('1000.00', 'CONFIRMED', {
      customerId: actors.customer2.profileId,
    });

    const cash = await api('POST', `/orders/${mine.orderId}/payments`, {
      as: 'customer',
      key: 'own-cash-00001',
      body: { amount: '10.00', paymentMethod: 'CASH' },
    });
    assert.equal(cash.status, 403);
    assert.equal(cash.json.error.code, 'PAYMENT_METHOD_NOT_ALLOWED');

    const other = await api('POST', `/orders/${theirs.orderId}/payments`, {
      as: 'customer',
      key: 'own-other-0001',
      body: { amount: '10.00', paymentMethod: 'CREDIT_CARD' },
    });
    assert.equal(other.status, 404);
    const otherHistory = await api(
      'GET',
      `/orders/${theirs.orderId}/payments`,
      { as: 'customer' },
    );
    assert.equal(otherHistory.status, 404);

    const transferBody = {
      amount: '1000.00',
      paymentMethod: 'BANK_TRANSFER',
      transactionReference: 'TRF-OWN-1',
    };
    const transfer = await api('POST', `/orders/${mine.orderId}/payments`, {
      as: 'customer',
      key: 'own-trf-000001',
      body: transferBody,
    });
    assert.equal(transfer.status, 201);
    assert.equal(transfer.json.data.status, 'PENDING');
    const paymentId = transfer.json.data.id;

    // The same key from another user is not a replay of this payment.
    const otherUserKey = await api('POST', `/orders/${mine.orderId}/payments`, {
      as: 'admin',
      key: 'own-trf-000001',
      body: transferBody,
    });
    assert.equal(otherUserKey.status, 422);

    for (const as of ['customer', 'seller', 'manager']) {
      const res = await api('PATCH', `/payments/${paymentId}`, {
        as,
        body: { status: 'SUCCESS' },
      });
      assert.equal(res.status, 403, as + ' must not confirm payments');
    }
    const confirm = await api('PATCH', `/payments/${paymentId}`, {
      as: 'finance',
      body: { status: 'SUCCESS' },
    });
    assert.equal(confirm.status, 200);
    assert.equal(await orderStatus(mine.orderId), 'PAID');

    const myList = await api('GET', '/payments?limit=100', { as: 'customer' });
    assert.ok(myList.json.data.some((p) => p.id === paymentId));
    const otherList = await api('GET', '/payments?limit=100', {
      as: 'customer2',
    });
    assert.ok(!otherList.json.data.some((p) => p.id === paymentId));
    const hidden = await api('GET', `/payments/${paymentId}`, {
      as: 'customer2',
    });
    assert.equal(hidden.status, 404);

    const otherRefund = await api('POST', `/payments/${paymentId}/refunds`, {
      as: 'customer2',
      key: 'own-ref-other1',
      body: { amount: '1.00', reason: 'x' },
    });
    assert.equal(otherRefund.status, 404);
    const refund = await api('POST', `/payments/${paymentId}/refunds`, {
      as: 'customer',
      key: 'own-ref-000001',
      body: { amount: '100.00', reason: 'ขอคืนค่าอุปกรณ์เสริม' },
    });
    assert.equal(refund.status, 201);
    assert.equal(refund.json.data.requestedBy, actors.customer.userId);
    const selfApprove = await api(
      'POST',
      `/refunds/${refund.json.data.id}/approve`,
      { as: 'customer', body: { refundReference: 'RF-SELF' } },
    );
    assert.equal(selfApprove.status, 403);
    const approved = await api(
      'POST',
      `/refunds/${refund.json.data.id}/approve`,
      { as: 'finance', body: { refundReference: 'RF-OWN-1' } },
    );
    assert.equal(approved.status, 200);
    assert.equal(approved.json.data.reviewedBy, actors.finance.userId);
  });

  test('seller issues invoices only for orders they sold; customer cannot', async () => {
    const order = await makeOrder('5000.00');
    const url = `/orders/${order.orderId}/invoices`;
    const byCustomer = await api('POST', url, { as: 'customer', body: {} });
    assert.equal(byCustomer.status, 403);
    const byOtherSeller = await api('POST', url, { as: 'seller2', body: {} });
    assert.equal(byOtherSeller.status, 404);
    const bySeller = await api('POST', url, { as: 'seller', body: {} });
    assert.equal(bySeller.status, 201);
    assert.equal(bySeller.json.data.issuedBy, actors.seller.profileId);
    const invoiceId = bySeller.json.data.id;

    const sellerCancel = await api('POST', `/invoices/${invoiceId}/cancel`, {
      as: 'seller',
    });
    assert.equal(sellerCancel.status, 403);
    const customerSees = await api('GET', `/invoices/${invoiceId}`, {
      as: 'customer',
    });
    assert.equal(customerSees.status, 200);
    const otherSellerSees = await api('GET', `/invoices/${invoiceId}`, {
      as: 'seller2',
    });
    assert.equal(otherSellerSees.status, 404);
  });

  test('order-balances: names, car and money per order, scoped by role', async () => {
    const order = await makeOrder('3000.00');
    await api('POST', `/orders/${order.orderId}/payments`, {
      as: 'customer',
      key: 'bal-card-00001',
      body: { amount: '1000.00', paymentMethod: 'CREDIT_CARD' },
    });
    await api('POST', `/orders/${order.orderId}/payments`, {
      as: 'customer',
      key: 'bal-trf-000001',
      body: {
        amount: '500.00',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: 'TRF-BAL-1',
      },
    });
    const other = await makeOrder('10.00', 'CONFIRMED', {
      customerId: actors.customer2.profileId,
      sellerId: actors.seller2.profileId,
    });

    const mine = await api('GET', '/order-balances?limit=100', {
      as: 'customer',
    });
    assert.equal(mine.status, 200);
    const row = mine.json.data.find((o) => o.orderId === order.orderId);
    assert.equal(row.customerName, 'customer Test');
    assert.equal(row.sellerName, 'seller Test');
    assert.equal(row.car.name, 'Toyoty Test');
    assert.equal(row.totalAmount, '3000.00');
    assert.equal(row.paidAmount, '1000.00');
    assert.equal(row.pendingAmount, '500.00');
    assert.equal(row.outstandingAmount, '1500.00');
    assert.match(row.orderNumber, /^ORD-[0-9A-F]{8}$/);
    assert.ok(!mine.json.data.some((o) => o.orderId === other.orderId));

    const seller2 = await api('GET', '/order-balances?limit=100', {
      as: 'seller2',
    });
    assert.deepEqual(
      seller2.json.data.map((o) => o.orderId),
      [other.orderId],
    );
    const all = await api('GET', '/order-balances?limit=100', {
      as: 'manager',
    });
    assert.ok(all.json.data.some((o) => o.orderId === other.orderId));
    const stock = await api('GET', '/order-balances', { as: 'stock' });
    assert.equal(stock.json.data.length, 0);
  });

  test('finance requests: seller -> Finance reply', async () => {
    const order = await makeOrder('100.00');
    const body = { orderId: order.orderId, topic: 'x', message: 'y' };
    const notMine = await api('POST', '/finance-requests', {
      as: 'seller2',
      body,
    });
    assert.equal(notMine.status, 404);
    const byCustomer = await api('POST', '/finance-requests', {
      as: 'customer',
      body,
    });
    assert.equal(byCustomer.status, 403);
    const created = await api('POST', '/finance-requests', {
      as: 'seller',
      body: {
        orderId: order.orderId,
        topic: 'ตรวจยอดโอน',
        message: 'ลูกค้าโอนแล้วเมื่อเช้า',
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.status, 'OPEN');
    const replyUrl = `/finance-requests/${created.json.data.id}/reply`;

    const sellerReply = await api('POST', replyUrl, {
      as: 'seller',
      body: { reply: 'x' },
    });
    assert.equal(sellerReply.status, 403);
    const reply = await api('POST', replyUrl, {
      as: 'admin',
      body: { reply: 'ยอดเข้าแล้ว' },
    });
    assert.equal(reply.json.data.status, 'DONE');
    assert.equal(reply.json.data.repliedBy, actors.admin.userId);
    const again = await api('POST', replyUrl, {
      as: 'admin',
      body: { reply: 'ซ้ำ' },
    });
    assert.equal(again.status, 409);

    const seller2List = await api('GET', '/finance-requests', {
      as: 'seller2',
    });
    assert.ok(
      !seller2List.json.data.some((r) => r.id === created.json.data.id),
    );
    const sellerList = await api('GET', '/finance-requests', { as: 'seller' });
    assert.ok(sellerList.json.data.some((r) => r.id === created.json.data.id));
  });
});
