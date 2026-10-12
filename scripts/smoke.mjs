import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const names = ['identity', 'catalog', 'sales', 'payment', 'reporting'];
const children = [];
try {
  for (const [index, name] of names.entries()) {
    const env = {
      ...process.env,
      PORT: String(3001 + index),
      CORS_ORIGINS: 'http://localhost:5173',
    };
    for (const key of Object.keys(env)) {
      if (/^(MYSQL_|MONGODB_|JWT_SECRET|INTERNAL_API_SECRET)/.test(key))
        delete env[key];
    }
    const child = spawn(process.execPath, ['src/server.js'], {
      cwd: new URL(`../services/${name}/`, import.meta.url),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    let startup = '';
    child.stdout.on('data', (data) => {
      startup += data;
    });
    child.stderr.on('data', (data) => {
      startup += data;
    });
    child.on('error', () => {});
    for (
      let retry = 0;
      retry < 100 && !startup.includes('listening');
      retry++
    ) {
      if (child.exitCode !== null || child.error)
        throw new Error(`Startup failed: ${name}`);
      await delay(100);
    }
    assert.ok(startup.includes('listening'), `Startup timeout: ${name}`);
    const base = `http://localhost:${3001 + index}/api/v1`;
    const health = await fetch(`${base}/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { service: name, status: 'ok' });
    assert.equal(
      health.headers.get('access-control-allow-origin'),
      'http://localhost:5173',
    );
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    const denied = await fetch(`${base}/health`, {
      headers: { Origin: 'https://untrusted.invalid' },
    });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    const preflight = await fetch(`${base}/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.equal(preflight.status, 204);
    const missing = await fetch(`${base}/not-implemented`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'NOT_FOUND');
    const malformed = await fetch(`${base}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error.code, 'BAD_REQUEST');
    const oversized = await fetch(`${base}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(110000) }),
    });
    assert.equal(oversized.status, 413);
    console.log(
      `PASS ${name}: independent startup, health without database env, CORS, helmet, 404, JSON errors`,
    );
  }
} finally {
  await Promise.all(
    children.map(async (child) => {
      if (child.exitCode === null && !child.killed) {
        const exited = once(child, 'exit');
        child.kill();
        await exited;
      }
    }),
  );
}
