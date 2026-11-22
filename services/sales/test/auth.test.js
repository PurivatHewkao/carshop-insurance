import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';

const TEST_ORIGIN = 'http://localhost:5173';
const VALID_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let identityServer;
let salesServer;
let salesUrl;
let identityRequests = 0;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function request(
  path,
  { token, cookie, method = 'GET', body, origin } = {},
) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = `carshop_identity_session=${cookie}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (origin) headers.origin = origin;
  return fetch(new URL(path, salesUrl), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  identityServer = createServer((req, res) => {
    if (req.url !== '/api/v1/users/me') {
      res.writeHead(404).end();
      return;
    }
    identityRequests += 1;
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    if (token === 'unavailable-token') {
      res.writeHead(500).end();
      return;
    }
    const roles = {
      'customer-token': 'customer',
      'seller-token': 'seller',
      'manager-token': 'manager',
      'admin-token': 'admin',
    };
    const role = roles[token];
    if (!role) {
      res.writeHead(401).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { id: VALID_ID, role, status: 'active' } }));
  });
  const identityPort = await listen(identityServer);
  process.env.IDENTITY_API_URL = `http://127.0.0.1:${identityPort}/api/v1`;
  process.env.CORS_ORIGINS = TEST_ORIGIN;

  const { default: app } = await import('../src/app.js');
  salesServer = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    salesServer.once('listening', resolve);
    salesServer.once('error', reject);
  });
  salesUrl = `http://127.0.0.1:${salesServer.address().port}/api/v1/`;
});

after(async () => {
  if (salesServer) await close(salesServer);
  if (identityServer) await close(identityServer);
});

describe('Sales session and role boundary', () => {
  it('keeps health public without calling Identity', async () => {
    const beforeRequests = identityRequests;
    const response = await request('health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { service: 'sales', status: 'ok' });
    assert.equal(identityRequests, beforeRequests);
  });

  it('rejects protected endpoints without a session', async () => {
    const response = await request('lookups/customers');
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'UNAUTHORIZED');
  });

  it('rejects an invalid token after asking Identity', async () => {
    const response = await request('lookups/customers', {
      token: 'invalid-token',
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'INVALID_TOKEN');
  });

  it('fails closed when Identity is unavailable', async () => {
    const response = await request('lookups/customers', {
      token: 'unavailable-token',
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'IDENTITY_UNAVAILABLE');
  });

  it('blocks a customer from reading the staff customer lookup', async () => {
    const response = await request('lookups/customers', {
      token: 'customer-token',
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  });

  it('blocks a customer from reading the sales customer detail endpoint', async () => {
    const response = await request(`lookups/customers/${VALID_ID}`, {
      token: 'customer-token',
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  });

  it('blocks a seller from creating a customer appointment', async () => {
    const response = await request('appointments', {
      token: 'seller-token',
      method: 'POST',
      origin: TEST_ORIGIN,
      body: {},
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  });

  it('blocks a customer from creating an order', async () => {
    const response = await request('orders', {
      token: 'customer-token',
      method: 'POST',
      origin: TEST_ORIGIN,
      body: {},
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  });

  it('rejects cookie writes from an untrusted origin before route execution', async () => {
    const response = await request('appointments', {
      cookie: 'customer-token',
      method: 'POST',
      origin: 'https://outside.example',
      body: {},
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN_ORIGIN');
  });

  it('allows browser preflight without requiring a session', async () => {
    const response = await request('appointments', {
      method: 'OPTIONS',
      origin: TEST_ORIGIN,
    });
    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get('access-control-allow-credentials'),
      'true',
    );
  });
});
