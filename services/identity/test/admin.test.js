import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import {
  createUser,
  login,
  register,
  logout,
} from '../src/modules/auth/service.js';
import {
  changeUser,
  findById,
  isRevoked,
  updateProfile,
} from '../src/modules/auth/repository.js';
import { closeMysqlPool, getMysqlPool } from '../src/config/mysql.js';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { execFileSync } from 'node:child_process';

if (
  !/^carshop_identity_[a-f0-9]{12}_test$/.test(process.env.MYSQL_DATABASE || '')
)
  throw new Error('Use npm test');
after(closeMysqlPool);
test('database failure returns a generic error without opening a session', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import app from './src/app.js';
    import {closeMysqlPool} from './src/config/mysql.js';
    const server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    try {
      const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/v1/auth/login',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:'outage@example.test',password:'Password123'})
      });
      assert.equal(response.status,500);
      assert.deepEqual(await response.json(),{error:{code:'INTERNAL_ERROR',message:'Internal server error'}});
    } finally {await new Promise(resolve=>server.close(resolve));await closeMysqlPool();}
  `,
    ],
    {
      cwd: new URL('../', import.meta.url),
      env: { ...process.env, MYSQL_PORT: '1' },
      stdio: 'pipe',
    },
  );
});
test('Admin bootstrap, permissions, persistence, concurrent updates and role records', async () => {
  const body = {
    name: 'Admin One',
    email: 'admin1@example.test',
    phone: '0812345678',
    password: 'Admin12345',
    role: 'admin',
    status: 'active',
  };
  const first = await createUser(body, null, true);
  assert.equal(
    (await createUser({ ...body, password: 'Changed12345' }, null, true)).id,
    first.id,
  );
  await login(body);
  const second = await createUser(
    { ...body, email: 'admin2@example.test' },
    first.id,
  );
  await assert.rejects(
    createUser({ ...body, email: 'admin3@example.test' }, null, true),
  );
  const customer = await register({
    ...body,
    email: 'customer-admin-test@example.test',
  });
  await assert.rejects(
    createUser({ ...body, email: 'forbidden@example.test' }, customer.user.id),
    (e) => e.status === 403,
  );
  await assert.rejects(
    changeUser(first.id, first.id, { role: 'customer', status: 'active' }),
    (e) => e.status === 403,
  );
  const outcomes = await Promise.allSettled([
    changeUser(first.id, second.id, { role: 'customer', status: 'active' }),
    changeUser(second.id, first.id, { role: 'customer', status: 'active' }),
  ]);
  assert.equal(outcomes.filter((r) => r.status === 'fulfilled').length, 1);
  const [[{ count }]] = await getMysqlPool().query(
    "SELECT COUNT(*) AS count FROM users WHERE role='ADMIN' AND status='ACTIVE'",
  );
  assert.equal(count, 1);
  const admin = (await findById(first.id)).role === 'admin' ? first : second;
  await changeUser(admin.id, customer.user.id, {
    role: 'finance',
    status: 'active',
  });
  const [[{ count: employeeCount }]] = await getMysqlPool().execute(
    'SELECT COUNT(*) AS count FROM employees WHERE user_id=?',
    [customer.user.id],
  );
  assert.equal(employeeCount, 1);
  await updateProfile(customer.user.id, {
    name: 'Updated',
    phone: '0899999999',
  });
  await closeMysqlPool();
  assert.equal((await findById(customer.user.id)).name, 'Updated');
  const claims = jwt.decode(customer.accessToken);
  await logout(claims);
  await closeMysqlPool();
  assert.equal(await isRevoked(claims.jti), true);
  // A fresh Node process must see the persisted account and revoked token.
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import {findById,isRevoked} from './src/modules/auth/repository.js';
    import {closeMysqlPool} from './src/config/mysql.js';
    assert.equal((await findById(process.env.PROBE_USER)).name,'Updated');
    assert.equal(await isRevoked(process.env.PROBE_TOKEN),true);
    await closeMysqlPool();
  `,
    ],
    {
      cwd: new URL('../', import.meta.url),
      env: {
        ...process.env,
        PROBE_USER: customer.user.id,
        PROBE_TOKEN: claims.jti,
      },
      stdio: 'pipe',
    },
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${server.address().port}/api/v1`;
  try {
    const customerLogin = await login({
      ...body,
      email: 'customer-admin-test@example.test',
    });
    const headers = {
      Authorization: `Bearer ${customerLogin.accessToken}`,
      'Content-Type': 'application/json',
    };
    assert.equal((await fetch(url + '/users', { headers })).status, 403);
    await changeUser(admin.id, customer.user.id, {
      role: 'finance',
      status: 'inactive',
    });
    assert.equal((await fetch(url + '/users/me', { headers })).status, 401);
    await assert.rejects(
      login({ ...body, email: 'customer-admin-test@example.test' }),
      (e) => e.status === 401,
    );
    const adminLogin = await login({ ...body, email: admin.email });
    const adminHeaders = {
      ...headers,
      Authorization: `Bearer ${adminLogin.accessToken}`,
    };
    const response = await fetch(url + '/users', { headers: adminHeaders });
    assert.equal(response.status, 200);
    const users = (await response.json()).data;
    assert.equal(
      users.some((u) => 'passwordHash' in u || 'salt' in u),
      false,
    );
    assert.equal(
      (
        await fetch(url + '/users', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            ...body,
            email: 'stock@example.test',
            role: 'stock',
          }),
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await fetch(url + '/users/' + customer.user.id, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({ role: 'invalid', status: 'active' }),
        })
      ).status,
      400,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
