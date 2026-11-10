import { closeMysqlPool } from '../src/config/mysql.js';
import { findByEmail, listUsers } from '../src/modules/auth/repository.js';
import { createUser, login, roles } from '../src/modules/auth/service.js';

try {
  const { MYSQL_HOST, MYSQL_DATABASE, NODE_ENV, ROLE_TEST_PASSWORD } =
    process.env;
  if (
    NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost', '::1'].includes(MYSQL_HOST) ||
    !/^carshop_(sql|identity_[a-f0-9]{12}_test)$/.test(MYSQL_DATABASE || '')
  )
    throw new Error(
      'Role fixtures require a local development or test database.',
    );

  if (
    !ROLE_TEST_PASSWORD ||
    !/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/.test(ROLE_TEST_PASSWORD)
  )
    throw new Error('Set ROLE_TEST_PASSWORD for the local role fixtures.');

  const admin = (await listUsers()).find(
    (user) => user.role === 'admin' && user.status === 'active',
  );
  if (!admin) throw new Error('Run npm run seed:admin first.');

  for (const [index, role] of roles.entries()) {
    const email = `role-${role}@carshop.test`;
    const existing = await findByEmail(email);
    if (existing) {
      if (existing.role !== role || existing.status !== 'active')
        throw new Error(
          `Existing fixture has a different role or status: ${email}`,
        );
      try {
        await login({ email, password: ROLE_TEST_PASSWORD });
      } catch (error) {
        if (error.code !== 'INVALID_CREDENTIALS') throw error;
        throw new Error(
          `Existing fixture does not match ROLE_TEST_PASSWORD: ${email}`,
          { cause: error },
        );
      }
      console.log('Ready:', role, email);
      continue;
    }
    await createUser(
      {
        name: `Test ${role}`,
        email,
        phone: `080000000${index}`,
        password: ROLE_TEST_PASSWORD,
        role,
        status: 'active',
      },
      admin.id,
    );
    console.log('Created:', role, email);
  }
} catch (error) {
  console.error(error.code || error.message);
  process.exitCode = 1;
} finally {
  await closeMysqlPool();
}
