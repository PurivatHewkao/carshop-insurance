import 'dotenv/config';
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const database = `carshop_identity_${randomBytes(6).toString('hex')}_test`;
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
});
let created = false;
async function run(args) {
  const child = spawn(process.execPath, args, {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    stdio: 'inherit',
    env: { ...process.env, MYSQL_DATABASE: database, NODE_ENV: 'test' },
  });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  if (code !== 0) throw new Error('Test process failed');
}
try {
  await connection.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  created = true;
  await connection.query(`USE \`${database}\``);
  const schema = await readFile(
    new URL('../../../db schema/01_mysql_schema.sql', import.meta.url),
    'utf8',
  );
  const tables = schema.slice(
    schema.indexOf('CREATE TABLE IF NOT EXISTS users'),
    schema.indexOf('CREATE TABLE IF NOT EXISTS car_models'),
  );
  for (const statement of tables.split(';').filter((s) => s.trim()))
    await connection.query(statement);
  await run(['scripts/migrate.js']);
  await run(['scripts/migrate.js']);
  await run(['--test', '--test-concurrency=1', 'test/admin.test.js', 'test/auth.test.js']);
  await run(['../../apps/web/src/features/identity/check-auth-api.mjs']);
} catch (error) {
  console.error(error.code || error.message);
  process.exitCode = 1;
} finally {
  // This name is generated here, never taken from environment or user input.
  if (created && /^carshop_identity_[a-f0-9]{12}_test$/.test(database))
    await connection.query(`DROP DATABASE \`${database}\``);
  await connection.end();
}
