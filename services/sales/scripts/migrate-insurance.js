// Insurance: additive migration, runnable without changing legacy database setup.
import { readFile } from 'node:fs/promises';
import { getMysqlPool, closeMysqlPool } from '../src/config/mysql.js';
try {
  const sql = await readFile(
    new URL('../database/04_nova_insurance.sql', import.meta.url),
    'utf8',
  );
  for (const statement of sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean))
    await getMysqlPool().query(statement);
  console.log('Insurance: carshop migration complete');
} catch (error) {
  console.error('Insurance migration failed:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await closeMysqlPool();
}
