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
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = process.env.TEST_MYSQL_DATABASE || 'carshop_payment_test';
if (!/_test$/.test(TEST_DB))
  throw new Error('TEST_MYSQL_DATABASE must end with _test');

let admin; // connection with multipleStatements, on TEST_DB
let server;
let base;
let closePool;
const ids = {};

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

async function seed() {
  const sellerUser = randomUUID();
  const customerUser = randomUUID();
  ids.employee = randomUUID();
  ids.customer = randomUUID();
  ids.model = randomUUID();
  await admin.query(
    `INSERT INTO users (id, username, password_hash, role, email) VALUES
       (?, 'seller01', 'x', 'SELLER', 'seller01@example.test'),
       (?, 'cust01', 'x', 'CUSTOMER', 'cust01@example.test');
     INSERT INTO employees (id, user_id, first_name, last_name) VALUES (?, ?, 'Sell', 'Er');
     INSERT INTO customers (id, user_id, first_name, last_name) VALUES (?, ?, 'Cus', 'Tomer');
     INSERT INTO car_models (id, brand, model_name) VALUES (?, 'Toyoty', 'Test');`,
    [
      sellerUser,
      customerUser,
      ids.employee,
      sellerUser,
      ids.customer,
      customerUser,
      ids.model,
    ],
  );
}

let vinCounter = 0;
async function makeOrder(total, status = 'CONFIRMED') {
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
      ids.customer,
      ids.employee,
      carId,
      total,
      total,
      status,
    ],
  );
  return { orderId, carId };
}

async function api(method, url, { body, key } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (key) headers['idempotency-key'] = key;
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
  process.env.MYSQL_DATABASE = TEST_DB;
  const { default: app } = await import('../src/app.js');
  ({ closeMysqlPool: closePool } = await import('../src/config/mysql.js'));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
});

after(async () => {
  await new Promise((resolve) => server?.close(resolve));
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

  test('rejected payment does not count; list filters and paging', async () => {
    const { orderId } = await makeOrder('500.00');
    const p = await api('POST', `/orders/${orderId}/payments`, {
      key: 'pay-reject-001',
      body: { amount: '500.00', paymentMethod: 'CASH' },
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
      body: { issuedBy: ids.employee, dueDate: '2099-12-31' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.status, 'ISSUED');
    assert.equal(created.json.data.amount, '2000.00');
    assert.equal(created.json.data.dueDate, '2099-12-31');
    assert.match(created.json.data.invoiceNumber, /^INV-\d{8}-[0-9A-F]{6}$/);

    const dup = await api('POST', `/orders/${orderId}/invoices`, {
      body: { issuedBy: ids.employee },
    });
    assert.equal(dup.status, 409);

    const noEmployee = await api('POST', `/orders/${orderId}/invoices`, {
      body: { issuedBy: randomUUID() },
    });
    assert.equal(noEmployee.status, 422);
    assert.equal(noEmployee.json.error.code, 'EMPLOYEE_NOT_FOUND');

    const pastDue = await api('POST', `/orders/${orderId}/invoices`, {
      body: { issuedBy: ids.employee, dueDate: '2000-01-01' },
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
      body: { issuedBy: ids.employee },
    });
    const cancelled = await api('POST', `/invoices/${inv.json.data.id}/cancel`);
    assert.equal(cancelled.json.data.status, 'CANCELLED');
    const reissued = await api('POST', `/orders/${second.orderId}/invoices`, {
      body: { issuedBy: ids.employee },
    });
    assert.equal(reissued.status, 201);

    const listed = await api('GET', `/orders/${second.orderId}/invoices`);
    assert.equal(listed.json.data.length, 2);
    const pending = await makeOrder('10.00', 'PENDING');
    const notYet = await api('POST', `/orders/${pending.orderId}/invoices`, {
      body: { issuedBy: ids.employee },
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
