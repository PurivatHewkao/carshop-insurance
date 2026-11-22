import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { getPool, closePool } from '../src/config.js';
export async function migrate(pool) {
  // Insurance: retain the original migration and apply the additive partner schema.
  for (const file of ['001_initial.sql', '002_partner.sql']) {
    const sql = await readFile(
      new URL('../database/' + file, import.meta.url),
      'utf8',
    );
    for (const statement of sql
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean))
      await pool.query(statement);
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await migrate(getPool());
    console.log('Insurance migration complete');
  } catch (error) {
    console.error('Migration failed:', error.code || error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
