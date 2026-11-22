// Insurance: provision NOVA admins without public registration or default credentials.
import { randomUUID } from 'node:crypto';
import { getPool, closePool } from '../src/config.js';
import { hashPassword } from '../src/modules/admin.js';
try {
  const email = process.env.NOVA_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.NOVA_ADMIN_PASSWORD;
  // Insurance: allow the requested 8-character local demo password; production stays 12+.
  const minimumLength = process.env.NODE_ENV === 'production' ? 12 : 8;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !password ||
    password.length < minimumLength ||
    password.length > 256
  )
    throw new Error(
      `Set NOVA_ADMIN_EMAIL and NOVA_ADMIN_PASSWORD (${minimumLength}–256 characters)`,
    );
  await getPool().execute(
    'INSERT INTO nova_admins (id, email, password_hash) VALUES (?, ?, ?)',
    [randomUUID(), email, hashPassword(password)],
  );
  console.log('Insurance: NOVA admin created');
} catch (error) {
  console.error(error.code || error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
