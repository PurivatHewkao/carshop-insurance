import 'dotenv/config';
import mysql from 'mysql2/promise';

export function databaseOptions() {
  let config;
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    if (!['mysql:', 'mysql2:'].includes(url.protocol))
      throw new Error('DATABASE_URL must use mysql');
    config = {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
    };
  } else {
    config = {
      host: process.env.MYSQLHOST || '127.0.0.1',
      port: Number(process.env.MYSQLPORT || 3306),
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD || '',
      database: process.env.MYSQLDATABASE,
    };
  }
  if (!config.user || !config.database)
    throw new Error(
      'Set DATABASE_URL or MYSQLUSER and MYSQLDATABASE for a separate NOVA database',
    );
  return {
    ...config,
    connectionLimit: 5,
    queueLimit: 20,
    waitForConnections: true,
    connectTimeout: 10000,
    timezone: 'Z',
    dateStrings: true,
    ...(process.env.MYSQL_SSL === 'true'
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  };
}
let pool;
export function getPool() {
  if (!pool) {
    pool = mysql.createPool(databaseOptions());
    pool.pool.on('connection', (connection) =>
      connection.query("SET time_zone = '+00:00'"),
    );
  }
  return pool;
}
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
export function frontendOrigin() {
  const value =
    process.env.INSURANCE_FRONTEND_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:5174' : '');
  if (!value) throw new Error('INSURANCE_FRONTEND_URL is required');
  const url = new URL(value);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Invalid frontend URL');
  return url.origin;
}
