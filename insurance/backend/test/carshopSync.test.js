// Insurance: regression for the Railway → Vercel dispatch bridge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { triggerCarshopSync } from '../src/modules/carshopSync.js';
test('Railway calls only the configured HTTPS Sales sync route with server auth', async () => {
  await triggerCarshopSync({
    baseUrl: 'https://sales.example/api/v1',
    key: 'k'.repeat(64),
    fetcher: async (url, options) => {
      assert.equal(url, 'https://sales.example/api/v1/internal/insurance/sync');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, `Bearer ${'k'.repeat(64)}`);
      assert.equal(options.redirect, 'error');
      return new Response(JSON.stringify({ data: { checked: true } }), {
        status: 200,
      });
    },
  });
  await assert.rejects(
    triggerCarshopSync({
      baseUrl: 'http://remote.example/api/v1',
      key: 'k'.repeat(64),
    }),
  );
  await assert.rejects(
    triggerCarshopSync({
      baseUrl: 'https://sales.example/api/v1',
      key: 'short',
    }),
  );
});
test('HTTP errors and invalid success responses are not mistaken for dispatch', async () => {
  for (const response of [
    new Response('{}', { status: 401 }),
    new Response('{}', { status: 200 }),
  ])
    await assert.rejects(
      triggerCarshopSync({
        baseUrl: 'https://sales.example/api/v1',
        key: 'k'.repeat(64),
        fetcher: async () => response,
      }),
    );
});
