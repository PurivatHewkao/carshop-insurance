import { createUser } from '../src/modules/auth/service.js';
import { closeMysqlPool } from '../src/config/mysql.js';

try {
  const user = await createUser(
    {
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      phone: process.env.ADMIN_PHONE,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      status: 'active',
    },
    null,
    true,
  );
  console.log('Admin ready:', user.email);
} catch (error) {
  console.error(error.code || error.message);
  process.exitCode = 1;
} finally {
  await closeMysqlPool();
}
