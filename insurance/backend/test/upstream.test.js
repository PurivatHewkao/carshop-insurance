import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpstream } from '../src/upstream.js';

test('local gateway accepts only HTTPS API origins without embedded credentials', () => {
  for (const url of [
    'http://example.com/api',
    'https://user:secret@example.com/api',
    'https://example.com/api?token=x',
    'https://example.com/other',
  ])
    assert.throws(() => createUpstream(url));
});
test('local quotes read actual upstream plan metadata and fail closed on an outage', async () => {
  const upstream = createUpstream('https://nova.example/api', async (url) => {
    assert.equal(url, 'https://nova.example/api/plans');
    return new Response(
      JSON.stringify({
        data: [
          {
            id: 'id',
            slug: 'signature',
            name: 'Signature',
            insuranceType: 'ชั้น 1',
            premiumAmount: 17900,
            coverage: { ownCollision: true },
            isRecommended: true,
          },
        ],
      }),
    );
  });
  const rows = await upstream.loadPlans();
  assert.equal(rows[0].slug, 'signature');
  assert.deepEqual(rows[0].coverage, { ownCollision: true });
  const offline = createUpstream('https://nova.example/api', async () => {
    throw new Error('offline');
  });
  await assert.rejects(offline.loadPlans(), {
    code: 'NOVA_UPSTREAM_UNAVAILABLE',
    status: 502,
  });
});
test('gateway preserves authorization and upstream denials without forwarding browser cookies or origin', async () => {
  let sent;
  const upstream = createUpstream(
    'https://nova.example/api',
    async (url, options) => {
      sent = { url, options };
      return new Response(
        JSON.stringify({ error: { code: 'ADMIN_UNAUTHORIZED' } }),
        { status: 401 },
      );
    },
  );
  let status, body;
  await upstream.proxy(
    {
      method: 'GET',
      originalUrl: '/api/admin/requests?offset=50',
      path: '/admin/requests',
      get: (name) =>
        name === 'authorization'
          ? 'Bearer test-session'
          : 'private-browser-value',
    },
    {
      set: () => {},
      status: (value) => {
        status = value;
        return {
          json: (value) => {
            body = value;
          },
        };
      },
    },
  );
  assert.equal(sent.url, 'https://nova.example/api/admin/requests?offset=50');
  assert.equal(sent.options.headers.Authorization, 'Bearer test-session');
  assert.equal(sent.options.headers.Cookie, undefined);
  assert.equal(sent.options.headers.Origin, undefined);
  assert.equal(sent.options.redirect, 'error');
  assert.equal(status, 401);
  assert.equal(body.error.code, 'ADMIN_UNAUTHORIZED');
});
