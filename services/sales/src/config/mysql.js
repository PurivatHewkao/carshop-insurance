import mysql from 'mysql2/promise';
import 'dotenv/config';
let pool;
export function getMysqlPool() {
  if (pool) return pool;
  for (const key of [
    'MYSQL_HOST',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
  ]) {
    if (!process.env[key])
      throw new Error('Missing database configuration: ' + key);
  }
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 20,
    ...(process.env.MYSQL_SSL === 'true'
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
    decimalNumbers: false,
    // DATETIME columns are stored in UTC (see db schema/01_mysql_schema.sql).
    timezone: 'Z',
    // DATE columns stay plain 'YYYY-MM-DD' strings (no timezone shifting).
    dateStrings: ['DATE'],
  });
  // Make CURRENT_TIMESTAMP defaults UTC for every pooled connection.
  pool.pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
  return pool;
}
export async function closeMysqlPool() {
  if (pool) {
    const current = pool;
    pool = undefined;
    await current.end();
  }
}
