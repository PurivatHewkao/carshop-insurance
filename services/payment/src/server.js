import app from './app.js';
import { env } from './config/env.js';
import { query } from './db/transaction.js';

// Tables this service needs: shared schema + database/migrations (npm run db:migrate).
const REQUIRED_TABLES = [
  'orders',
  'payments',
  'invoices',
  'refunds',
  'payment_idempotency_keys',
  'finance_requests',
];

// Fail loudly at start instead of answering every request with HTTP 500.
async function checkDatabase() {
  try {
    const [rows] = await query(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
    );
    const found = new Set(rows.map((row) => row.name.toLowerCase()));
    const missing = REQUIRED_TABLES.filter((name) => !found.has(name));
    if (missing.length)
      console.error(
        'payment: missing tables ' +
          missing.join(', ') +
          ' — run "npm run db:migrate" in services/payment',
      );
  } catch (error) {
    console.error(
      'payment: database not ready (' +
        (error.code || error.message) +
        ') — check MYSQL_* in services/payment/.env',
    );
  }
}

const server = app.listen(env.port, () => {
  console.log(env.service + ' listening on ' + env.port);
  checkDatabase();
});
server.on('error', (error) => {
  console.error(error.code || 'SERVER_ERROR');
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close());
