// Integration tests for the production queue against a real local MySQL.
// Uses MYSQL_HOST/PORT/USER/PASSWORD from .env but always a separate database
// (TEST_MYSQL_DATABASE, default carshop_catalog_test) rebuilt on every run from
// "db schema/01_mysql_schema.sql" + database/09_production_queue.sql.
// Run: npm test   (inside services/catalog)
import 'dotenv/config';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB =
  process.env.TEST_CATALOG_MYSQL_DATABASE || 'carshop_catalog_test';
if (!/_test$/.test(TEST_DB))
  throw new Error('test database name must end with _test');

let admin;
let server;
let identityServer;
let base;
let closePool;
let helpers; // date helpers from the repository
const actors = {};
const sessions = {};
const ids = {};

const MIGRATION = path.join(here, '../database/09_production_queue.sql');

async function setupDatabase() {
  admin = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true,
    timezone: 'Z',
  });
  await admin.query('DROP DATABASE IF EXISTS `' + TEST_DB + '`');
  const schema = await readFile(
    path.join(here, '../../../db schema/01_mysql_schema.sql'),
    'utf8',
  );
  await admin.query(schema.replaceAll('carshop_sql', TEST_DB));
  await admin.query(
    'ALTER TABLE car_models ADD COLUMN slug VARCHAR(120) NULL UNIQUE',
  );
  const migration = await readFile(MIGRATION, 'utf8');
  await admin.query(migration);
  await admin.query(migration); // must be safe to run twice
}

const ACTORS = {
  admin: { role: 'ADMIN', profile: 'employee' },
  stock: { role: 'STOCK', profile: 'employee' },
  seller: { role: 'SELLER', profile: 'employee' },
  finance: { role: 'FINANCE', profile: 'employee' },
  customer: { role: 'CUSTOMER', profile: 'customer' },
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
  ids.khon = randomUUID();
  ids.esan = randomUUID();
  await admin.query(
    `INSERT INTO car_models (id, brand, model_name, slug) VALUES
       (?, 'TOYOTY', 'Khon', 'toyoty-khon'), (?, 'TOYOTY', 'E-san', 'toyoty-esan')`,
    [ids.khon, ids.esan],
  );
}

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
/** A reserved car + its order. production: production_status; paid: add a SUCCESS deposit. */
async function makeCar({
  model = ids.khon,
  production = 'WAITING',
  order = 'CONFIRMED',
  paid = true,
} = {}) {
  const carId = randomUUID();
  vinCounter += 1;
  await admin.query(
    `INSERT INTO cars (id, car_model_id, vin, color, manufacture_year, price, status, production_status)
     VALUES (?, ?, ?, 'ขาวมุก', 2026, 2210000, 'RESERVED', ?)`,
    [carId, model, 'TYTO' + String(vinCounter).padStart(13, '0'), production],
  );
  let orderId = null;
  if (order) {
    orderId = randomUUID();
    await admin.query(
      `INSERT INTO orders (id, customer_id, seller_id, car_id, subtotal, discount, total_amount, status)
       VALUES (?, ?, ?, ?, 2210000, 0, 2210000, ?)`,
      [
        orderId,
        actors.customer.profileId,
        actors.seller.profileId,
        carId,
        order,
      ],
    );
    if (paid) {
      await admin.query(
        `INSERT INTO payments (id, order_id, amount, payment_method, payment_date, status)
         VALUES (?, ?, 50000, 'BANK_TRANSFER', NOW(3), 'SUCCESS')`,
        [randomUUID(), orderId],
      );
    }
  }
  return { carId, orderId };
}

async function api(method, url, { body, as = 'stock' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (as) headers.authorization = 'Bearer tok-' + as;
  const response = await fetch(base + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  await setupDatabase();
  await seed();
  await startFakeIdentity();
  process.env.MYSQL_DATABASE = TEST_DB;
  const { default: app } = await import('../src/app.js');
  ({ closeMysqlPool: closePool } = await import('../src/config/mysql.js'));
  helpers = await import('../src/modules/production/repository.js');
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/api/v1/production';
});

after(async () => {
  server?.close();
  identityServer?.close();
  await closePool?.();
  await admin?.end();
});

describe('migration', () => {
  test('09 after the configurator columns of 07: one ENUM with every status + production_note', async () => {
    const db = TEST_DB.replace(/_test$/, '_compat_test');
    await admin.query('DROP DATABASE IF EXISTS `' + db + '`');
    await admin.query('CREATE DATABASE `' + db + '`');
    await admin.query('USE `' + db + '`');
    try {
      // What 07_toyoty_configurator.sql leaves on cars (only the columns 09 cares about).
      await admin.query(
        `CREATE TABLE car_models (id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY);
         CREATE TABLE cars (
           id CHAR(36) NOT NULL PRIMARY KEY,
           car_model_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
           production_status ENUM('QUOTED','SCHEDULED','IN_PRODUCTION','IN_TRANSIT','READY','DELIVERED') NULL,
           build_week DATE NULL, eta_from DATE NULL, eta_to DATE NULL,
           first_eta_to DATE NULL, ready_date DATE NULL);
         INSERT INTO car_models VALUES ('m1');
         INSERT INTO cars (id, car_model_id, production_status) VALUES ('c1', 'm1', 'QUOTED');`,
      );
      const migration = await readFile(MIGRATION, 'utf8');
      await admin.query(migration);
      await admin.query(migration);
      const [columns] = await admin.query(
        `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cars'
           AND COLUMN_NAME IN ('production_status', 'production_note') ORDER BY COLUMN_NAME`,
        [db],
      );
      assert.deepEqual(
        columns.map((c) => c.name),
        ['production_note', 'production_status'],
      );
      assert.equal(
        columns[1].type,
        "enum('QUOTED','WAITING','SCHEDULED','IN_PRODUCTION','IN_TRANSIT','READY','DELIVERED','CANCELLED')",
      );
      const [[car]] = await admin.query(
        "SELECT production_status FROM cars WHERE id = 'c1'",
      );
      assert.equal(car.production_status, 'QUOTED'); // existing rows kept
    } finally {
      await admin.query('DROP DATABASE IF EXISTS `' + db + '`');
      await admin.query('USE `' + TEST_DB + '`');
    }
  });
});

describe('estimate', () => {
  test('GET /eta: earliest free week after the parts lead time, public', async () => {
    const { addDays, mondayOnOrAfter, todayUtc, PARTS_DAYS } = helpers;
    for (const trim of ['ECO', 'BALANCED', 'HIGH_PERFORMANCE']) {
      const res = await api(
        'GET',
        '/eta?model=toyoty-esan&trim=' + trim.toLowerCase(),
        { as: null },
      );
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const week = mondayOnOrAfter(addDays(todayUtc(), PARTS_DAYS[trim]));
      assert.deepEqual(
        {
          buildWeek: res.body.data.buildWeek,
          etaFrom: res.body.data.etaFrom,
          etaTo: res.body.data.etaTo,
        },
        {
          buildWeek: week,
          etaFrom: addDays(week, 7),
          etaTo: addDays(week, 14),
        },
      );
      assert.equal(res.body.data.modelName, 'TOYOTY E-san');
    }
    assert.equal(
      (await api('GET', '/eta?model=toyoty-esan&trim=SPORT', { as: null }))
        .status,
      400,
    );
    assert.equal(
      (await api('GET', '/eta?model=nope&trim=ECO', { as: null })).status,
      404,
    );
  });
});

describe('scheduling', () => {
  test('full week pushes the next car one week later; eta follows', async () => {
    const cap = await api('PUT', '/capacity/toyoty-khon', {
      body: { weeklyCapacity: 1 },
    });
    assert.equal(cap.status, 200, JSON.stringify(cap.body));
    const a = await makeCar();
    const b = await makeCar();
    const first = await api('POST', '/cars/' + a.carId + '/schedule', {
      body: { trim: 'ECO' },
    });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.data.status, 'SCHEDULED');
    const second = await api('POST', '/cars/' + b.carId + '/schedule', {
      body: { trim: 'ECO' },
    });
    assert.equal(second.status, 200, JSON.stringify(second.body));
    assert.equal(
      second.body.data.buildWeek,
      helpers.addDays(first.body.data.buildWeek, 7),
    );
    assert.equal(second.body.data.firstEtaTo, second.body.data.etaTo);
    // The public estimate now skips both booked weeks.
    const eta = await api('GET', '/eta?model=toyoty-khon&trim=ECO', {
      as: null,
    });
    assert.equal(
      eta.body.data.buildWeek,
      helpers.addDays(first.body.data.buildWeek, 14),
    );
    // Scheduling again is refused.
    const again = await api('POST', '/cars/' + a.carId + '/schedule');
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'NOT_WAITING');
    await api('PUT', '/capacity/toyoty-khon', { body: { weeklyCapacity: 5 } });
  });

  test('needs an approved order with a paid deposit, and stock/admin role', async () => {
    const pending = await makeCar({ order: 'PENDING' });
    let res = await api('POST', '/cars/' + pending.carId + '/schedule');
    assert.equal(res.body.error.code, 'ORDER_NOT_CONFIRMED');
    const unpaid = await makeCar({ paid: false });
    res = await api('POST', '/cars/' + unpaid.carId + '/schedule');
    assert.equal(res.body.error.code, 'DEPOSIT_NOT_PAID');
    const stockCar = await makeCar({ production: null });
    res = await api('POST', '/cars/' + stockCar.carId + '/schedule');
    assert.equal(res.body.error.code, 'NOT_WAITING');
    const ok = await makeCar();
    assert.equal(
      (await api('POST', '/cars/' + ok.carId + '/schedule', { as: 'customer' }))
        .status,
      403,
    );
    assert.equal(
      (await api('POST', '/cars/' + ok.carId + '/schedule', { as: null }))
        .status,
      401,
    );
    assert.equal(
      (await api('POST', '/cars/' + randomUUID() + '/schedule')).status,
      404,
    );
    assert.equal(
      (
        await api('PUT', '/capacity/toyoty-khon', {
          body: { weeklyCapacity: 101 },
        })
      ).status,
      400,
    );
  });

  test('QUEUE turns a reserved stock car into a made-to-order car', async () => {
    const stockCar = await makeCar({ production: null });
    const res = await api('PATCH', '/cars/' + stockCar.carId, {
      body: { action: 'QUEUE' },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'WAITING');
    const twice = await api('PATCH', '/cars/' + stockCar.carId, {
      body: { action: 'QUEUE' },
    });
    assert.equal(twice.status, 409);
  });
});

describe('lifecycle', () => {
  test('reschedule -> start -> ship -> arrive -> deliver', async () => {
    const { addDays, todayUtc } = helpers;
    const car = await makeCar({ model: ids.esan });
    const scheduled = (
      await api('POST', '/cars/' + car.carId + '/schedule', {
        body: { trim: 'BALANCED' },
      })
    ).body.data;
    const patch = (body, as = 'stock') =>
      api('PATCH', '/cars/' + car.carId, { body, as });

    // Delay of two weeks.
    let res = await patch({
      action: 'RESCHEDULE',
      buildWeek: addDays(scheduled.buildWeek, 14),
      note: 'ชิ้นส่วนล่าช้า',
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.delayDays, 14);
    assert.equal(res.body.data.firstEtaTo, scheduled.etaTo);
    assert.equal(res.body.data.note, 'ชิ้นส่วนล่าช้า');
    assert.equal(
      (
        await patch({
          action: 'RESCHEDULE',
          buildWeek: addDays(scheduled.buildWeek, 15),
        })
      ).status,
      400,
    ); // not a Monday
    assert.equal(
      (await patch({ action: 'RESCHEDULE', buildWeek: '2020-01-06' })).status,
      400,
    ); // past

    // Steps out of order are refused.
    res = await patch({ action: 'SHIP', arrivalDate: addDays(todayUtc(), 3) });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'INVALID_PRODUCTION_STEP');

    assert.equal((await patch({ action: 'START', vin: 'SHORT' })).status, 400);
    assert.equal(
      (await patch({ action: 'START', vin: 'JTDKB20U0Q3000001' })).status,
      400,
    ); // contains Q
    assert.equal(
      (await patch({ action: 'START', vin: 'JTDKB20U093000001' }, 'seller'))
        .status,
      403,
    );
    res = await patch({ action: 'START', vin: 'jtdkb20u093000001' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'IN_PRODUCTION');
    const [[{ vin }]] = await admin.query('SELECT vin FROM cars WHERE id = ?', [
      car.carId,
    ]);
    assert.equal(vin, 'JTDKB20U093000001');

    // Another car cannot take the same VIN.
    const other = await makeCar({ model: ids.esan });
    await api('POST', '/cars/' + other.carId + '/schedule');
    res = await api('PATCH', '/cars/' + other.carId, {
      body: { action: 'START', vin: 'JTDKB20U093000001' },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'DUPLICATE_VIN');

    assert.equal(
      (await patch({ action: 'SHIP', arrivalDate: '2020-01-01' })).status,
      400,
    );
    const arrival = addDays(todayUtc(), 3);
    res = await patch({ action: 'SHIP', arrivalDate: arrival });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(
      [res.body.data.etaFrom, res.body.data.etaTo],
      [arrival, arrival],
    );

    res = await patch({ action: 'ARRIVE' });
    assert.equal(res.body.data.status, 'READY');
    assert.equal(res.body.data.readyDate, todayUtc());

    // Step 4 of the purchase flow: only a fully paid order gets its car.
    res = await patch({ action: 'DELIVER' }, 'seller');
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'ORDER_NOT_PAID');
    await admin.query("UPDATE orders SET status = 'PAID' WHERE id = ?", [
      car.orderId,
    ]);
    res = await patch({ action: 'DELIVER' }, 'seller');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'DELIVERED');
    const [[delivered]] = await admin.query(
      'SELECT c.status AS car, o.status AS orderStatus FROM cars c JOIN orders o ON o.car_id = c.id WHERE c.id = ?',
      [car.carId],
    );
    assert.deepEqual(
      { car: delivered.car, order: delivered.orderStatus },
      { car: 'SOLD', order: 'COMPLETED' },
    );

    // Public read for the order page.
    res = await api('GET', '/cars/' + car.carId, { as: null });
    assert.equal(res.body.data.status, 'DELIVERED');
    assert.equal(
      (await api('PATCH', '/cars/' + car.carId, { body: { action: 'FLY' } }))
        .status,
      400,
    );
  });

  test('queue and weekly load for staff', async () => {
    const res = await api('GET', '/queue', { as: 'finance' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const scheduled = res.body.data.filter((row) => row.status === 'SCHEDULED');
    assert.ok(scheduled.length >= 2);
    assert.ok(
      scheduled.every((row) => row.order?.customerName === 'customer Test'),
    );
    const waiting = await api('GET', '/queue?status=WAITING', { as: 'admin' });
    assert.ok(waiting.body.data.every((row) => row.status === 'WAITING'));
    assert.equal(
      (await api('GET', '/queue?status=NOPE', { as: 'admin' })).status,
      400,
    );
    assert.equal((await api('GET', '/queue', { as: 'customer' })).status, 403);

    const load = await api('GET', '/load?weeks=12', { as: 'stock' });
    assert.equal(load.status, 200, JSON.stringify(load.body));
    const khon = load.body.data.models.find(
      (m) => m.modelName === 'TOYOTY Khon',
    );
    assert.equal(khon.weeks.length, 12);
    assert.ok(khon.weeks.reduce((sum, w) => sum + w.booked, 0) >= 2);
  });
});
