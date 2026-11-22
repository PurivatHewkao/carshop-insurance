import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { migrate } from '../scripts/migrate.js';
import { seed, plans } from '../scripts/seed.js';
import { createApp } from '../src/app.js';
import { tokenHash } from '../src/modules/purchases.js';

const url = process.env.INSURANCE_TEST_DATABASE_URL;
test(
  'real MySQL: migrations, seeds, purchases, concurrency, authorization and persistence',
  { skip: !url },
  async (t) => {
    const database = decodeURIComponent(new URL(url).pathname.slice(1));
    assert.match(
      database,
      /_test$/,
      'Integration suite requires a separate database ending in _test',
    );
    const pool = mysql.createPool({
      uri: url,
      dateStrings: true,
      timezone: 'Z',
      connectionLimit: 5,
    });
    await migrate(pool);
    await migrate(pool);
    await seed(pool);
    await seed(pool);
    const server = createApp({ pool: () => pool, purchaseLimit: 100 }).listen(
      0,
      '127.0.0.1',
    );
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const get = (path, token) =>
      fetch(base + path, {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
    const post = (body) =>
      fetch(base + '/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    assert.equal((await get('/health')).status, 200);
    const list = await (await get('/plans?source=toyoty')).json();
    assert.equal(list.data.length, 4);
    assert.equal(list.data[1].finalAmount, 6165.5);
    assert.equal((await get('/plans/' + randomUUID())).status, 404);
    const request = {
      planId: plans[1].id,
      clientRequestId: randomUUID(),
      customer: {
        fullName: 'Insurance Integration Demo',
        phone: '0812345678',
        email: 'demo@example.com',
      },
      vehicle: {
        brand: 'Toyota',
        model: 'Yaris Ativ',
        year: 2026,
        registrationNumber: '',
      },
      source: 'toyoty',
      finalAmount: 1,
    };
    const ids = [];
    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      try {
      for (const id of ids) {
        await pool.execute(
          'DELETE p FROM insurance_policies p JOIN insurance_purchases b ON b.id=p.purchase_id WHERE b.client_request_id=?',
          [id],
        );
        await pool.execute(
          'DELETE FROM insurance_purchases WHERE client_request_id=?',
          [id],
        );
      }
      } finally { await pool.end(); }
    });
    ids.push(request.clientRequestId);
    const result = await post(request);
    assert.equal(result.status, 201);
    const { data } = await result.json();
    assert.equal(data.finalAmount, 6165.5);
    assert.equal(data.status, 'ISSUED_DEMO');
    assert.match(data.policyNumber, /^NOVA-\d{4}-[A-F0-9]{32}$/);
    assert.equal((await post(request)).status, 409);
    assert.equal((await get('/policies/' + data.policyId)).status, 401);
    assert.equal(
      (await get('/policies/' + data.policyId, 'a'.repeat(43))).status,
      403,
    );
    const receipt = await (
      await get('/policies/' + data.policyId, data.receiptToken)
    ).json();
    assert.equal(receipt.data.customerName, request.customer.fullName);
    assert.equal(receipt.data.finalAmount, 6165.5);
    assert.equal(receipt.data.receiptTokenHash, undefined);
    const [rows] = await pool.execute(
      'SELECT * FROM insurance_policies WHERE id=?',
      [data.policyId],
    );
    assert.equal(rows[0].receipt_token_hash, tokenHash(data.receiptToken));
    const concurrent = { ...request, clientRequestId: randomUUID() };
    ids.push(concurrent.clientRequestId);
    const attempts = await Promise.all([post(concurrent), post(concurrent)]);
    assert.deepEqual(attempts.map((r) => r.status).sort(), [201, 409]);
    const second = await attempts.find((r) => r.status === 201).json();
    assert.notEqual(second.data.policyId, data.policyId);
    assert.notEqual(second.data.policyNumber, data.policyNumber);
    const direct = {
      ...request,
      clientRequestId: randomUUID(),
      source: 'direct',
    };
    ids.push(direct.clientRequestId);
    const third = await (await post(direct)).json();
    assert.equal(third.data.finalAmount, 6490);
    assert.equal(third.data.discountAmount, 0);
    assert.equal(
      (await get('/policies/' + third.data.policyId, data.receiptToken)).status,
      403,
    );
    const unknown = {
      ...request,
      clientRequestId: randomUUID(),
      planId: randomUUID(),
    };
    assert.equal((await post(unknown)).status, 404);
    const [count] = await pool.execute(
      'SELECT COUNT(*) AS n FROM insurance_purchases WHERE client_request_id=?',
      [concurrent.clientRequestId],
    );
    assert.equal(count[0].n, 1);
    const otherPool = mysql.createPool(url);
    try {
      const [persisted] = await otherPool.execute(
        'SELECT id FROM insurance_policies WHERE id=?',
        [data.policyId],
      );
      assert.equal(persisted[0].id, data.policyId);
    } finally {
      await otherPool.end();
    }
  },
);
