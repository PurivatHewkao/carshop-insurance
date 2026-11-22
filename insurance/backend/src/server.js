import { createApp } from './app.js';
import { closePool } from './config.js';
const server = createApp().listen(
  Number(process.env.PORT || 3010),
  '0.0.0.0',
  () => console.log('NOVA INSURE API listening'),
);
server.requestTimeout = 30000;
server.headersTimeout = 35000;
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
