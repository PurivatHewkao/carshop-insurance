import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { getMysqlPool, closeMysqlPool } from '../src/config/mysql.js';
import {
  createRequireSession,
  requireRoles,
} from '../../../packages/auth/index.js';

if (
  !/^carshop_identity_[a-f0-9]{12}_test$/.test(process.env.MYSQL_DATABASE || '')
)
  throw new Error('Run npm test with an isolated database');

let identity, service, base, identityBase, token, userId;
const origin = 'http://localhost:5173';
const servers = [];
async function listen(application) {
  const server = application.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  servers.push(server);
  return server;
}
const url = (server) => `http://127.0.0.1:${server.address().port}`;
async function call(path = '/private', headers = {}, method = 'GET') {
  const r = await fetch(base + path, { method, headers });
  return { status: r.status, body: await r.json() };
}
before(async () => {
  identity = await listen(app);
  identityBase = url(identity) + '/api/v1';
  const r = await fetch(identityBase + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Shared Auth Test',
      email: 'shared-auth@example.test',
      phone: '0800000099',
      password: 'SharedTest123!',
    }),
  });
  assert.equal(r.status, 201);
  const { data } = await r.json();
  token = data.accessToken;
  userId = data.user.id;
  const downstream = express();
  const guard = createRequireSession({
    identityBaseUrl: identityBase,
    allowedOrigins: [origin],
  });
  downstream.all('/private', guard, (req, res) => res.json(req.auth));
  downstream.get('/admin', guard, requireRoles('admin'), (req, res) =>
    res.json(req.user),
  );
  downstream.get('/role-only', requireRoles('admin'), (_req, res) =>
    res.json({ unexpected: true }),
  );
  service = await listen(downstream);
  base = url(service);
});
after(async () => {
  for (const server of servers)
    await new Promise((resolve) => server.close(resolve));
  await closeMysqlPool();
});

test('shared guard rejects missing, spoofed, malformed and forged credentials', async () => {
  assert.equal(
    (await call('/private', { 'X-User-Id': userId, 'X-User-Role': 'admin' }))
      .status,
    401,
  );
  assert.equal((await call('/role-only')).status, 401);
  assert.equal(
    (await call('/private', { Authorization: 'Bearer forged' })).status,
    401,
  );
  assert.equal(
    (
      await call('/private', {
        Authorization: 'Basic invalid',
        Cookie: `carshop_identity_session=${token}`,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call('/private', {
        Cookie: `carshop_identity_session=${token}; carshop_identity_session=${token}`,
      })
    ).status,
    401,
  );
  const expired = jwt.sign({}, env.jwtSecret, {
    algorithm: 'HS256',
    subject: userId,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    expiresIn: -1,
    jwtid: randomUUID(),
  });
  assert.equal(
    (await call('/private', { Authorization: `Bearer ${expired}` })).status,
    401,
  );
});

test('bearer and cookie work; cookie writes require exact allowed Origin', async () => {
  const bearer = { Authorization: `Bearer ${token}` };
  const cookie = { Cookie: `carshop_identity_session=${token}` };
  const r = await call('/private', bearer);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.user, {
    id: userId,
    role: 'customer',
    status: 'active',
  });
  assert.equal((await call('/private', cookie)).body.viaCookie, true);
  assert.equal((await call('/private', cookie, 'POST')).status, 403);
  assert.equal(
    (
      await call(
        '/private',
        { ...cookie, Origin: 'https://attacker.invalid' },
        'POST',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        '/private',
        { ...cookie, Origin: origin + '.attacker.invalid' },
        'POST',
      )
    ).status,
    403,
  );
  assert.equal(
    (await call('/private', { ...cookie, Origin: origin }, 'POST')).status,
    200,
  );
  assert.equal((await call('/private', bearer, 'POST')).status, 200);
  assert.equal(
    (await call('/private', { ...bearer, Origin: 'null' }, 'POST')).status,
    403,
  );
});

test('role changes and suspension take effect on next request, ignoring JWT role claim', async () => {
  const headers = { Authorization: `Bearer ${token}` };
  assert.equal((await call('/admin', headers)).status, 403);
  try {
    await getMysqlPool().execute("UPDATE users SET role='ADMIN' WHERE id=?", [
      userId,
    ]);
    assert.equal((await call('/admin', headers)).status, 200);
    await getMysqlPool().execute(
      "UPDATE users SET status='INACTIVE' WHERE id=?",
      [userId],
    );
    assert.equal((await call('/private', headers)).status, 401);
  } finally {
    await getMysqlPool().execute(
      "UPDATE users SET role='CUSTOMER',status='ACTIVE' WHERE id=?",
      [userId],
    );
  }
  assert.equal((await call('/admin', headers)).status, 403);
});

test('logout in Identity invalidates the same token in downstream service', async () => {
  const headers = { Authorization: `Bearer ${token}` };
  assert.equal(
    (await fetch(identityBase + '/auth/logout', { method: 'POST', headers }))
      .status,
    204,
  );
  assert.equal((await call('/private', headers)).status, 401);
});

test('upstream error, invalid response, redirects and timeout fail closed with 503', async () => {
  for (const mode of ['error', 'invalid', 'redirect', 'timeout']) {
    const upstream = express();
    upstream.get('/api/v1/users/me', (_req, res) => {
      if (mode === 'timeout') return setTimeout(() => res.json({}), 100);
      if (mode === 'redirect') return res.redirect(identityBase + '/users/me');
      if (mode === 'error')
        return res.status(500).json({ secret: 'must not leak' });
      return res.json({
        data: { id: userId, role: 'admin', status: 'inactive' },
      });
    });
    const upstreamServer = await listen(upstream);
    const downstream = express();
    downstream.get(
      '/',
      createRequireSession({
        identityBaseUrl: url(upstreamServer) + '/api/v1',
        timeoutMs: mode === 'timeout' ? 20 : 1000,
      }),
      (_req, res) => res.json({ unexpected: true }),
    );
    const s = await listen(downstream);
    const r = await fetch(url(s), {
      headers: { Authorization: 'Bearer test' },
    });
    assert.equal(r.status, 503, mode);
    assert.deepEqual(await r.json(), {
      error: {
        code: 'IDENTITY_UNAVAILABLE',
        message: 'ไม่สามารถตรวจสอบเซสชันได้ กรุณาลองอีกครั้ง',
      },
    });
  }
});

test('configuration rejects wildcard origins, unknown roles and insecure remote Identity', () => {
  assert.throws(() =>
    createRequireSession({ identityBaseUrl: 'http://identity.example/api/v1' }),
  );
  assert.throws(() =>
    createRequireSession({
      identityBaseUrl: identityBase,
      allowedOrigins: ['*'],
    }),
  );
  assert.throws(() =>
    createRequireSession({ identityBaseUrl: identityBase, timeoutMs: 0 }),
  );
  assert.throws(() => requireRoles('superadmin'));
  assert.throws(() => requireRoles());
});
