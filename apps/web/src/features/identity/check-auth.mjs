import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../node_modules/vite/dist/node/index.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const originalMode = process.env.VITE_IDENTITY_MODE;
const user = {
  id: 'api-admin',
  name: 'Admin',
  email: 'admin@example.test',
  phone: '0812345678',
  role: 'admin',
  status: 'active',
};
try {
  for (const mode of ['demo', 'api']) {
    process.env.VITE_IDENTITY_MODE = mode;
    const server = await createServer({
      root,
      configFile: false,
      server: { middlewareMode: true, hmr: false },
      appType: 'custom',
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    try {
      const auth = await server.ssrLoadModule(
        '/src/features/identity/api/auth.js',
      );
      assert.equal(auth.isDemo, mode === 'demo');
      await assert.rejects(auth.listUsers(), /ผู้ดูแล/);
      await assert.rejects(auth.getProfile(), /เข้าสู่ระบบ/);
      if (mode === 'demo') {
        await assert.rejects(
          auth.login({ ...auth.demoAccount, password: 'wrong' }),
        );
        await auth.login(auth.demoAccount);
        assert.equal(auth.getSession().role, 'customer');
        await assert.rejects(auth.listUsers());
        const updated = await auth.updateProfile({
          name: 'Edited',
          phone: '0899999999',
          role: 'admin',
        });
        assert.equal(updated.role, 'customer', 'Profile must not change role');
        assert.equal(updated.name, 'Edited');
        await auth.logout();
        assert.equal(auth.getSession(), null);
        await auth.register({
          name: 'New',
          email: 'new@example.test',
          phone: '0812345678',
          password: 'Secret123',
        });
        assert.equal(auth.getSession().password, undefined);
        await assert.rejects(auth.register({ email: 'new@example.test' }));
        await auth.logout();
        await assert.rejects(
          auth.login({
            email: 'new@example.test',
            password: auth.demoAccount.password,
          }),
          undefined,
          'New demo accounts must not inherit a shared password',
        );
        await auth.login({
          email: 'admin@toyoty.demo',
          password: auth.demoAccount.password,
        });
        const users = await auth.listUsers();
        assert.equal(users.length, 4);
        await assert.rejects(
          auth.updateUser(auth.getSession().id, {
            role: 'customer',
            status: 'active',
          }),
        );
        await auth.updateUser('demo-1', { role: 'seller', status: 'inactive' });
        await auth.logout();
        await assert.rejects(auth.login(auth.demoAccount), /ระงับ/);
      } else {
        const { identityClient } = await server.ssrLoadModule(
          '/src/features/identity/api/client.js',
        );
        const calls = [];
        let fail = false;
        let malformed = false;
        identityClient.defaults.adapter = async (config) => {
          calls.push(config);
          if (fail)
            throw Object.assign(new Error('network unavailable'), {
              code: 'ERR_NETWORK',
            });
          const data = malformed
            ? { wrong: true }
            : config.url === 'auth/login'
              ? { user, accessToken: 'test-token' }
              : config.url === 'users'
                ? [user]
                : user;
          return {
            data: { data },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        };
        await auth.login({ email: user.email, password: 'Test12345' });
        assert.equal(calls[0].url, 'auth/login');
        await auth.getProfile();
        assert.equal(calls.at(-1).headers.Authorization, 'Bearer test-token');
        assert.equal((await auth.listUsers()).length, 1);
        await auth.updateProfile({
          name: 'Name',
          phone: '0812345678',
          role: 'admin',
        });
        assert.deepEqual(JSON.parse(calls.at(-1).data), {
          name: 'Name',
          phone: '0812345678',
        });
        await auth.updateUser('user/a', { role: 'seller', status: 'inactive' });
        assert.equal(calls.at(-1).url, 'users/user%2Fa');
        malformed = true;
        await assert.rejects(auth.listUsers(), /contract/);
        malformed = false;
        fail = true;
        await assert.rejects(auth.listUsers(), /network/);
        await auth.logout();
        await assert.rejects(
          auth.login({ email: user.email, password: 'Test12345' }),
        );
        assert.equal(
          auth.getSession(),
          null,
          'API failure must not open a demo session',
        );
      }
      console.log(
        `Identity ${mode}: session, role access, payloads and failures passed.`,
      );
    } finally {
      await server.close();
    }
  }
} finally {
  if (originalMode === undefined) delete process.env.VITE_IDENTITY_MODE;
  else process.env.VITE_IDENTITY_MODE = originalMode;
}
