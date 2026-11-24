import { createApp } from './app.js';
import { closePool } from './config.js';
// Insurance: drive Sales' durable queue even when hosted on serverless Vercel.
import { startCarshopSync } from './modules/carshopSync.js';
const stopCarshopSync = process.env.NOVA_UPSTREAM_API_URL
  ? () => {}
  : startCarshopSync();
const server = createApp().listen(
  Number(process.env.PORT || 3010),
  '0.0.0.0',
  () => console.log('NOVA INSURE API listening'),
);
server.requestTimeout = 30000;
server.headersTimeout = 35000;
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    // Insurance: stop polling before shutting down NOVA.
    stopCarshopSync();
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
