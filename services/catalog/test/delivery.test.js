import assert from 'node:assert/strict';
import test from 'node:test';
import { completeDelivery } from '../src/modules/production/delivery.js';

function fixture({
  orderStatus = 'PAID',
  production = 'READY',
  carStatus = 'RESERVED',
  paid = '1000000.00',
  refunded = '0.00',
  missing = false,
} = {}) {
  const order = {
    id: 'order-1',
    status: orderStatus,
    total_amount: '1000000.00',
  };
  const car = { status: carStatus, production_status: production };
  const writes = [];
  const db = {
    async query(sql, params) {
      if (sql.startsWith('SELECT id, status')) return [missing ? [] : [order]];
      if (sql.startsWith('SELECT status, production_status')) return [[car]];
      if (sql.includes('AS refunded')) return [[{ paid, refunded }]];
      writes.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  };
  return { db, writes };
}

for (const production of [null, 'READY']) {
  test(`fully paid ${production ?? 'stock'} car completes the order and is sold`, async () => {
    const { db, writes } = fixture({ production });
    await completeDelivery(db, 'car-1', 'order-1');
    assert.equal(writes.length, 2);
    assert.match(writes[0].sql, /status = 'COMPLETED'/);
    assert.deepEqual(writes[0].params, ['order-1']);
    assert.match(writes[1].sql, /status = 'SOLD'/);
    assert.match(
      writes[1].sql,
      /WHEN production_status IS NULL THEN NULL ELSE 'DELIVERED'/,
    );
    assert.deepEqual(writes[1].params, ['car-1']);
  });
}

for (const options of [
  { orderStatus: 'PENDING' },
  { orderStatus: 'CONFIRMED' },
  { paid: '50000.00' },
  { refunded: '0.01' },
  { production: 'IN_TRANSIT' },
  { carStatus: 'INACTIVE' },
  { missing: true },
]) {
  test(`delivery rejects ${JSON.stringify(options)} without updating either record`, async () => {
    const { db, writes } = fixture(options);
    await assert.rejects(completeDelivery(db, 'car-1', 'order-1'), {
      status: 409,
    });
    assert.equal(writes.length, 0);
  });
}

test('stale confirmation cannot deliver a different order for the same car', async () => {
  const { db, writes } = fixture();
  await assert.rejects(completeDelivery(db, 'car-1', 'old-order'), {
    code: 'DELIVERY_ORDER_NOT_FOUND',
  });
  assert.equal(writes.length, 0);
});

test('retry after delivery succeeds without changing records again', async () => {
  const { db, writes } = fixture({
    orderStatus: 'COMPLETED',
    carStatus: 'SOLD',
    production: 'DELIVERED',
  });
  await completeDelivery(db, 'car-1', 'order-1');
  assert.equal(writes.length, 0);
});
