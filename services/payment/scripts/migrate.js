// Applies database/migrations/*.sql (in name order) to MYSQL_DATABASE from .env.
// Run after "db schema/01_mysql_schema.sql". Migrations only CREATE ... IF NOT EXISTS,
// so running this again is safe.  Usage: npm run db:migrate
import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../database/migrations',
);
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  multipleStatements: true,
});
try {
  for (const file of (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await connection.query(await readFile(path.join(dir, file), 'utf8'));
    console.log('applied ' + file + ' to ' + process.env.MYSQL_DATABASE);
  }
} finally {
  await connection.end();
}
