// Insurance: full HTTP/real-MySQL flow. Only explicitly supplied *_test databases.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const require = createRequire(
  new URL('../insurance/backend/package.json', import.meta.url),
);
const mysql = require('mysql2/promise');
const carUrl = process.env.CARSHOP_INSURANCE_TEST_DATABASE_URL;
const novaUrl = process.env.NOVA_PARTNER_TEST_DATABASE_URL;
function options(value) {
  const url = new URL(value);
  const database = url.pathname.slice(1);
  assert.match(database, /^[a-zA-Z0-9_]+_test$/);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    dateStrings: true,
    timezone: 'Z',
    multipleStatements: true,
  };
}
async function applySql(db, text) {
  let delimiter = ';',
    statement = '';
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith('--') || !line.trim()) continue;
    if (/^DELIMITER /i.test(line.trim())) {
      delimiter = line.trim().split(/\s+/)[1];
      continue;
    }
    statement += line + '\n';
    if (statement.trimEnd().endsWith(delimiter)) {
      await db.query(statement.trimEnd().slice(0, -delimiter.length));
      statement = '';
    }
  }
  assert.equal(statement.trim(), '');
}
const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve(`http://127.0.0.1:${server.address().port}`),
    ),
  );
test(
  'insurance: real carshop order → existing payment → NOVA approval → customer policy',
  { skip: !carUrl || !novaUrl },
  async (t) => {
    const carConfig = options(carUrl),
      novaConfig = options(novaUrl);
    assert.notEqual(carConfig.database, novaConfig.database);
    const carDb = mysql.createPool(carConfig),
      novaDb = mysql.createPool(novaConfig);
    const servers = [];
    t.after(async () => {
      for (const server of servers) {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
      }
      const { closeMysqlPool } =
        await import('../services/sales/src/config/mysql.js');
      await closeMysqlPool();
      const paymentDatabase =
        await import('../services/payment/src/config/mysql.js');
      await paymentDatabase.closeMysqlPool();
      await carDb.end();
      await novaDb.end();
    });
    const schema = await readFile(
      new URL('../db schema/01_mysql_schema.sql', import.meta.url),
      'utf8',
    );
    await applySql(carDb, schema.replaceAll('carshop_sql', carConfig.database));
    await applySql(
      carDb,
      (
        await readFile(
          new URL(
            '../services/sales/database/03_sales_columns.sql',
            import.meta.url,
          ),
          'utf8',
        )
      ).replaceAll('carshop_sql', carConfig.database),
    );
    const insuranceSql = await readFile(
      new URL(
        '../services/sales/database/04_nova_insurance.sql',
        import.meta.url,
      ),
      'utf8',
    );
    await applySql(carDb, insuranceSql);
    await applySql(carDb, insuranceSql);
    for (const file of [
      '001_refunds_and_idempotency.sql',
      '002_finance_requests.sql',
    ])
      await applySql(
        carDb,
        await readFile(
          new URL(
            '../services/payment/database/migrations/' + file,
            import.meta.url,
          ),
          'utf8',
        ),
      );
    process.env.NOVA_PARTNER_KEY = 'integration-only-nova-key-'.repeat(3);
    const { migrate } = await import('../insurance/backend/scripts/migrate.js');
    const { seed } = await import('../insurance/backend/scripts/seed.js');
    await migrate(novaDb);
    await migrate(novaDb);
    await seed(novaDb);
    const users = Object.fromEntries(
      ['customer', 'other', 'seller', 'manager', 'finance'].map((name) => [
        name,
        randomUUID(),
      ]),
    );
    for (const [name, id] of Object.entries(users))
      await carDb.execute(
        'INSERT INTO users (id, username, password_hash, role, email) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          id,
          'test-only',
          name === 'other' ? 'CUSTOMER' : name.toUpperCase(),
          `${id}@example.com`,
        ],
      );
    const customerId = randomUUID(),
      employeeId = randomUUID();
    await carDb.execute(
      'INSERT INTO customers (id, user_id, first_name, last_name, phone_number) VALUES (?, ?, ?, ?, ?)',
      [customerId, users.customer, 'Demo', 'Customer', '0812345678'],
    );
    await carDb.execute(
      'INSERT INTO customers (id, user_id, first_name, last_name) VALUES (?, ?, ?, ?)',
      [randomUUID(), users.other, 'Other', 'Customer'],
    );
    await carDb.execute(
      'INSERT INTO employees (id, user_id, first_name, last_name) VALUES (?, ?, ?, ?)',
      [employeeId, users.seller, 'Demo', 'Seller'],
    );
    for (const role of ['manager', 'finance'])
      await carDb.execute(
        'INSERT INTO employees (id, user_id, first_name, last_name) VALUES (?, ?, ?, ?)',
        [randomUUID(), users[role], 'Demo', role],
      );
    const modelId = randomUUID();
    await carDb.execute(
      'INSERT INTO car_models (id, brand, model_name) VALUES (?, ?, ?)',
      [modelId, 'Toyota', 'Camry'],
    );
    const carIds = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of carIds)
      await carDb.execute(
        'INSERT INTO cars (id, car_model_id, vin, color, manufacture_year, price) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          modelId,
          randomUUID().replaceAll('-', '').slice(0, 17),
          'White',
          2026,
          '1000000',
        ],
      );
    const identity = createServer((req, res) => {
      // Identity is a test-only authority. Sales/Payment middleware and DB are real.
      res.setHeader(
        'Access-Control-Allow-Origin',
        req.headers.origin || 'http://localhost:5173',
      );
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'authorization,content-type',
      );
      if (req.method === 'OPTIONS') return res.writeHead(204).end();
      const role = req.headers.authorization?.replace('Bearer ', '');
      if (!users[role]) return res.writeHead(401).end();
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          data: {
            id: users[role],
            name: `Demo ${role}`,
            email: `${users[role]}@example.com`,
            phone: '',
            role: role === 'other' ? 'customer' : role,
            status: 'active',
          },
        }),
      );
    });
    servers.push(identity);
    const identityUrl = await listen(identity);
    Object.assign(process.env, {
      MYSQL_HOST: carConfig.host,
      MYSQL_PORT: String(carConfig.port),
      MYSQL_USER: carConfig.user,
      MYSQL_PASSWORD: carConfig.password,
      MYSQL_DATABASE: carConfig.database,
      IDENTITY_API_URL: `${identityUrl}/api/v1`,
      CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
    });
    const { createApp } = await import('../insurance/backend/src/app.js');
    const nova = createApp({
      pool: () => novaDb,
      origin: 'http://127.0.0.1:5174',
    });
    const novaServer = createServer(nova);
    servers.push(novaServer);
    const novaBase = `${await listen(novaServer)}/api`;
    process.env.NOVA_API_URL = novaBase;
    const { default: salesApp } = await import('../services/sales/src/app.js');
    const salesServer = createServer(salesApp);
    servers.push(salesServer);
    const salesBase = `${await listen(salesServer)}/api/v1`;
    const { default: paymentApp } =
      await import('../services/payment/src/app.js');
    const paymentServer = createServer(paymentApp);
    servers.push(paymentServer);
    const paymentBase = `${await listen(paymentServer)}/api/v1`;
    const call = async (
      base,
      path,
      token,
      method = 'GET',
      body,
      extra = {},
    ) => {
      const response = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    };
    assert.equal(
      (await call(novaBase, '/partner/plans', 'customer')).status,
      401,
    );
    assert.equal(
      (await call(novaBase, '/admin/requests', 'customer')).status,
      401,
    );
    assert.equal(
      (await call(novaBase, '/purchases', '', 'POST', {})).status,
      403,
    );
    const planResult = await call(salesBase, '/insurance/plans', 'seller');
    assert.equal(planResult.status, 200);
    const plan = planResult.body.data.find((p) => p.slug === 'smart-drive');
    assert.equal(plan.premium, 6165.5);
    assert.equal(plan.quoteToken, undefined);
    assert.equal(
      (
        await call(salesBase, '/orders', 'seller', 'POST', {
          customerId,
          carId: carIds[0],
          novaPlanId: plan.id,
          deliveryDate: '2026-12-01',
          expectedPremium: 1,
        })
      ).status,
      409,
    );
    const created = await call(salesBase, '/orders', 'seller', 'POST', {
      customerId,
      carId: carIds[0],
      novaPlanId: plan.id,
      deliveryDate: '2026-12-01',
      expectedPremium: plan.premium,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const order = created.body.data;
    assert.equal(order.totalAmount, 1006165.5);
    assert.equal(order.insurancePlan, 'Smart Drive (NOVA)');
    assert.equal(order.insuranceId, null);
    const { syncInsurance } =
      await import('../services/sales/src/modules/insurance/worker.js');
    await syncInsurance(carDb);
    let [[count]] = await novaDb.query(
      'SELECT COUNT(*) AS total FROM nova_partner_requests WHERE order_id = ?',
      [order.id],
    );
    assert.equal(count.total, 0, 'unpaid orders are never sent');
    assert.equal(
      (
        await call(
          salesBase,
          `/orders/${order.id}/decision`,
          'manager',
          'PATCH',
          { decision: 'APPROVED' },
        )
      ).status,
      200,
    );
    const payment = await call(
      paymentBase,
      `/orders/${order.id}/payments`,
      'customer',
      'POST',
      { amount: String(order.totalAmount), paymentMethod: 'CREDIT_CARD' },
      { 'Idempotency-Key': randomUUID() },
    );
    assert.equal(payment.status, 201, JSON.stringify(payment.body));
    const [[paid]] = await carDb.execute(
      'SELECT status FROM orders WHERE id = ?',
      [order.id],
    );
    assert.equal(paid.status, 'PAID');
    await syncInsurance(carDb);
    await syncInsurance(carDb);
    let customer = await call(salesBase, '/insurance/me', 'customer');
    assert.equal(customer.body.data[0].status, 'PENDING_APPROVAL');
    assert.equal(
      (await call(salesBase, '/insurance/me', 'other')).body.data.length,
      0,
    );
    assert.equal(
      (await call(salesBase, '/insurance/me', 'seller')).status,
      403,
    );
    const { hashPassword } =
      await import('../insurance/backend/src/modules/admin.js');
    const adminEmail = `${randomUUID()}@example.com`;
    await novaDb.execute(
      'INSERT INTO nova_admins (id, email, password_hash) VALUES (?, ?, ?)',
      [randomUUID(), adminEmail, hashPassword('integration-password-123')],
    );
    assert.equal(
      (
        await call(novaBase, '/admin/login', '', 'POST', {
          email: adminEmail,
          password: 'wrong',
        })
      ).status,
      401,
    );
    const login = await call(novaBase, '/admin/login', '', 'POST', {
      email: adminEmail,
      password: 'integration-password-123',
    });
    assert.equal(login.status, 200);
    const token = login.body.data.token;
    const requests = await call(novaBase, '/admin/requests', token);
    const request = requests.body.data.find(
      (item) => item.orderId === order.id,
    );
    assert.equal(request.status, 'PENDING_APPROVAL');
    const approvals = await Promise.all([
      call(
        novaBase,
        `/admin/requests/${request.requestId}/approve`,
        token,
        'POST',
      ),
      call(
        novaBase,
        `/admin/requests/${request.requestId}/approve`,
        token,
        'POST',
      ),
    ]);
    assert.equal(approvals[0].status, 200);
    assert.equal(approvals[1].status, 200);
    assert.equal(
      approvals[0].body.data.policyNumber,
      approvals[1].body.data.policyNumber,
    );
    await carDb.execute(
      'UPDATE order_nova_insurance SET next_attempt_at = UTC_TIMESTAMP() WHERE order_id = ?',
      [order.id],
    );
    await syncInsurance(carDb);
    customer = await call(salesBase, '/insurance/me', 'customer');
    assert.equal(customer.body.data[0].status, 'ISSUED');
    assert.equal(customer.body.data[0].policy.startsOn, '2026-12-01');
    assert.equal(customer.body.data[0].policy.endsOn, '2027-11-30');
    assert.ok(customer.body.data[0].policy.policyNumber);
    const noInsurance = await call(salesBase, '/orders', 'seller', 'POST', {
      customerId,
      carId: carIds[1],
    });
    assert.equal(noInsurance.status, 201);
    assert.equal(noInsurance.body.data.totalAmount, 1000000);
    const [[noSnapshot]] = await carDb.query(
      'SELECT COUNT(*) AS total FROM order_nova_insurance WHERE order_id = ?',
      [noInsurance.body.data.id],
    );
    assert.equal(noSnapshot.total, 0);
    // Simulate a lost response after NOVA committed; resending must recover the same id.
    const [[snapshot]] = await carDb.query(
      'SELECT * FROM order_nova_insurance WHERE order_id = ?',
      [order.id],
    );
    const jsonValue = (value) =>
      typeof value === 'string' ? JSON.parse(value) : value;
    const payload = {
      orderId: order.id,
      quoteToken: snapshot.quote_token,
      deliveryDate: snapshot.delivery_date,
      customer: jsonValue(snapshot.customer_snapshot),
      vehicle: jsonValue(snapshot.vehicle_snapshot),
    };
    const retries = await Promise.all([
      call(
        novaBase,
        '/partner/requests',
        process.env.NOVA_PARTNER_KEY,
        'POST',
        payload,
      ),
      call(
        novaBase,
        '/partner/requests',
        process.env.NOVA_PARTNER_KEY,
        'POST',
        payload,
      ),
    ]);
    assert.equal(retries[0].body.data.requestId, request.requestId);
    assert.equal(retries[1].body.data.requestId, request.requestId);
    assert.equal(
      (
        await call(
          novaBase,
          '/partner/requests',
          process.env.NOVA_PARTNER_KEY,
          'POST',
          { ...payload, deliveryDate: '2026-12-02' },
        )
      ).status,
      409,
    );
    assert.equal(
      (await call(novaBase, '/admin/logout', token, 'POST')).status,
      200,
    );
    assert.equal((await call(novaBase, '/admin/requests', token)).status, 401);
    [[count]] = await novaDb.query(
      'SELECT COUNT(*) AS total FROM nova_partner_requests WHERE order_id = ?',
      [order.id],
    );
    assert.equal(count.total, 1);
    if (process.env.INSURANCE_BROWSER_TEST === '1') {
      const { runInsuranceBrowserTest } =
        await import('./test-insurance-browser.mjs');
      await runInsuranceBrowserTest({
        salesBase,
        novaBase,
        identityUrl,
        adminEmail,
        order,
        carId: carIds[2],
        carDb,
      });
      t.diagnostic(
        'Verified seller NOVA form, customer policy, independent admin login, closed direct checkout, and mobile layout in Chrome.',
      );
    }
    t.diagnostic(
      'Verified real payment settlement, separate MySQL databases, server auth, ownership, immutable discounted quote, retry recovery, concurrent approval, and policy dates.',
    );
  },
);
