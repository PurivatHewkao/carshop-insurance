import { readFile } from 'node:fs/promises';
import { getMysqlPool, closeMysqlPool } from '../src/config/mysql.js';

export async function migrate() {
  const db = getMysqlPool();
  for (const table of ['users', 'customers', 'employees'])
    await db.query(`SELECT id FROM ${table} LIMIT 0`);
  const sql = await readFile(
    new URL('../database/migrations/001_identity_support.sql', import.meta.url),
    'utf8',
  );
  for (const statement of sql.split(';').filter((item) => item.trim()))
    await db.query(statement);
}
if (process.argv[1]?.endsWith('migrate.js')) {
  try {
    await migrate();
    console.log('Identity migration complete.');
  } catch (error) {
    console.error(error.code || error.message);
    process.exitCode = 1;
  } finally {
    await closeMysqlPool();
  }
}
