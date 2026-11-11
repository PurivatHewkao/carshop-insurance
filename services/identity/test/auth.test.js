import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { closeMysqlPool } from '../src/config/mysql.js';

if (
  !/^carshop_identity_[a-f0-9]{12}_test$/.test(process.env.MYSQL_DATABASE || '')
)
  throw new Error('Use npm test to create an isolated database');

let server;
let base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closeMysqlPool();
});
async function request(path, { token, body, method = 'GET', headers } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    headers: response.headers,
    data: response.status === 204 ? null : await response.json(),
  };
}
const account = {
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '0812345678',
  password: 'Secret12345',
};

test('register, login, protected profile, validation and logout', async () => {
  const created = await request('/auth/register', {
    method: 'POST',
    body: { ...account, role: 'admin' },
  });
  assert.equal(created.status, 201);
  const { user, accessToken } = created.data.data;
  assert.equal(user.role, 'customer');
  assert.equal(user.password, undefined);
  assert.equal(user.passwordHash, undefined);
  const claims = jwt.verify(accessToken, env.jwtSecret, {
    algorithms: ['HS256'],
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
  });
  assert.equal(claims.sub, user.id);
  assert.equal(claims.exp - claims.iat, 3600);
  assert.equal((await request('/users/me')).status, 401);
  assert.equal(
    (await request('/users/me', { token: accessToken })).data.data.id,
    user.id,
  );
  const patched = await request('/users/me', {
    method: 'PATCH',
    token: accessToken,
    body: {
      name: 'Edited',
      phone: account.phone,
      role: 'admin',
      email: 'changed@example.com',
    },
  });
  assert.equal(patched.data.data.role, 'customer');
  assert.equal(patched.data.data.email, account.email);
  assert.equal(patched.data.data.name, 'Edited');
  assert.equal(
    (
      await request('/auth/register', {
        method: 'POST',
        body: { ...account, email: ' TEST@EXAMPLE.COM ' },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request('/auth/login', {
        method: 'POST',
        body: { email: account.email, password: 'Wrong12345' },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request('/auth/login', {
        method: 'POST',
        body: { email: 'unknown@example.com', password: account.password },
      })
    ).status,
    401,
  );
  const loggedIn = await request('/auth/login', {
    method: 'POST',
    body: { email: ' TEST@EXAMPLE.COM ', password: account.password },
  });
  assert.equal(loggedIn.status, 200);
  assert.equal(loggedIn.data.data.user.id, user.id);
  assert.equal(
    (await request('/users/me', { token: accessToken + 'tampered' })).status,
    401,
  );
  for (const options of [
    { expiresIn: -1 },
    { audience: 'wrong' },
    { issuer: 'wrong' },
    { algorithm: 'HS384' },
  ]) {
    const invalid = jwt.sign({}, env.jwtSecret, {
      algorithm: 'HS256',
      subject: user.id,
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      jwtid: 'test',
      expiresIn: '1h',
      ...options,
    });
    assert.equal((await request('/users/me', { token: invalid })).status, 401);
  }
  assert.equal(
    (await request('/auth/logout', { method: 'POST', token: accessToken }))
      .status,
    204,
  );
  assert.equal(
    (await request('/users/me', { token: accessToken })).status,
    401,
  );
  assert.equal(
    (await request('/users/me', { token: loggedIn.data.data.accessToken }))
      .status,
    200,
  );
  for (const body of [
    null,
    [],
    {},
    { ...account, email: 'invalid' },
    { ...account, password: 'abcdefgh' },
    { ...account, phone: 'bad' },
    { ...account, name: ' ' },
    { ...account, password: 'A1'.repeat(65) },
  ]) {
    assert.equal(
      (await request('/auth/register', { method: 'POST', body })).status,
      400,
    );
  }
  const malformed = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(malformed.status, 400);
});

test('concurrent duplicate registration creates one account', async () => {
  const results = await Promise.all(
    [1, 2].map(() =>
      request('/auth/register', {
        method: 'POST',
        body: { ...account, email: 'race@example.com' },
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
});

test('browser session cookie is protected, reusable after reload, and revoked on logout', async () => {
  const origin = env.corsOrigins[0];
  const credentials = { email: account.email, password: account.password };
  const startSession = {
    method: 'POST',
    body: credentials,
    headers: { Origin: origin, 'X-Identity-Session': 'cookie' },
  };
  const foreignOrigin = 'http://localhost:9999';
  const blockedLogin = await request('/auth/login', {
    ...startSession,
    headers: { ...startSession.headers, Origin: foreignOrigin },
  });
  assert.equal(blockedLogin.status, 403);
  assert.equal(blockedLogin.headers.get('set-cookie'), null);

  const loggedIn = await request('/auth/login', startSession);
  assert.equal(loggedIn.status, 200);
  assert.equal(loggedIn.data.data.accessToken, undefined);
  assert.equal(
    loggedIn.headers.get('access-control-allow-credentials'),
    'true',
  );
  assert.equal(loggedIn.headers.get('access-control-allow-origin'), origin);
  const setCookie = loggedIn.headers.get('set-cookie');
  for (const attribute of [
    /HttpOnly/i,
    /SameSite=Lax/i,
    /Path=\/api\/v1/i,
    /Max-Age=3600/i,
  ])
    assert.match(setCookie, attribute);
  const cookie = setCookie.split(';')[0];
  assert.equal(
    (await request('/users/me', { headers: { Cookie: cookie } })).data.data
      .email,
    account.email,
  );
  for (const headers of [
    { Cookie: cookie },
    { Cookie: cookie, Origin: foreignOrigin },
  ]) {
    const blocked = await request('/users/me', {
      method: 'PATCH',
      body: { name: 'Blocked', phone: account.phone },
      headers,
    });
    assert.equal(blocked.status, 403);
  }

  const expired = jwt.sign({}, env.jwtSecret, {
    subject: loggedIn.data.data.user.id,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    jwtid: 'expired-cookie',
    expiresIn: -1,
  });
  const rejected = await request('/users/me', {
    headers: { Cookie: `carshop_identity_session=${expired}` },
  });
  assert.equal(rejected.status, 401);
  assert.match(
    rejected.headers.get('set-cookie'),
    /^carshop_identity_session=;/,
  );

  const loggedOut = await request('/auth/logout', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: origin },
  });
  assert.equal(loggedOut.status, 204);
  assert.match(
    loggedOut.headers.get('set-cookie'),
    /^carshop_identity_session=;/,
  );
  assert.equal(
    (await request('/users/me', { headers: { Cookie: cookie } })).status,
    401,
  );
});

test('authentication attempts are rate limited', async () => {
  let response;
  for (let i = 0; i < 31; i++)
    response = await request('/auth/login', { method: 'POST', body: {} });
  assert.equal(response.status, 429);
  assert.equal(response.data.error.code, 'TOO_MANY_REQUESTS');
  assert.equal((await request('/health')).status, 200);
});
