import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../node_modules/vite/dist/node/index.js';
import app from '../../../../../services/identity/src/app.js';
import { env } from '../../../../../services/identity/src/config/env.js';
import { closeMysqlPool } from '../../../../../services/identity/src/config/mysql.js';
if (
  !/^carshop_identity_[a-f0-9]{12}_test$/.test(process.env.MYSQL_DATABASE || '')
)
  throw new Error('Run npm --prefix services/identity test');

const listener = app.listen(0, '127.0.0.1');
await new Promise((resolve) => listener.once('listening', resolve));
const saved = {
  mode: process.env.VITE_IDENTITY_MODE,
  url: process.env.VITE_IDENTITY_API_URL,
};
process.env.VITE_IDENTITY_MODE = 'api';
process.env.VITE_IDENTITY_API_URL = `http://127.0.0.1:${listener.address().port}/api/v1`;
let vite;
try {
  vite = await createServer({
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const auth = await vite.ssrLoadModule('/src/features/identity/api/auth.js');
  const { identityClient } = await vite.ssrLoadModule(
    '/src/features/identity/api/client.js',
  );
  // Axios in Node has no browser cookie jar. Carry the test cookie explicitly.
  let cookie;
  identityClient.interceptors.request.use((config) => {
    config.headers.set('Origin', env.corsOrigins[0]);
    if (cookie) config.headers.set('Cookie', cookie);
    return config;
  });
  identityClient.interceptors.response.use((response) => {
    const setCookie = response.headers['set-cookie']?.[0];
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  });
  assert.equal(auth.isDemo, false);
  const account = {
    name: 'API Test',
    email: 'wire@example.com',
    phone: '0812345678',
    password: 'Secret12345',
  };
  await auth.register(account);
  assert.ok(cookie?.startsWith('carshop_identity_session='));
  assert.equal(auth.getSession().role, 'customer');
  assert.equal((await auth.getProfile()).email, account.email);
  await auth.updateProfile({ name: 'Edited', phone: account.phone });
  assert.equal((await auth.getProfile()).name, 'Edited');
  await auth.logout();
  assert.equal(auth.getSession(), null);
  await assert.rejects(
    auth.login({ email: account.email, password: 'Wrong12345' }),
  );
  assert.equal(auth.getSession(), null);
  await auth.login(account);
  assert.equal((await auth.getProfile()).name, 'Edited');
  await assert.rejects(
    auth.register(account),
    (error) => error.response.status === 409,
  );
  await auth.logout();
  console.log(
    'Real Identity API: registration, JWT profile, update, logout, login and failures passed.',
  );
} finally {
  await vite?.close();
  await new Promise((resolve) => listener.close(resolve));
  await closeMysqlPool();
  for (const [key, value] of [
    ['VITE_IDENTITY_MODE', saved.mode],
    ['VITE_IDENTITY_API_URL', saved.url],
  ]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
