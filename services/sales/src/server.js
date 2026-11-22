import app from './app.js';
import { env } from './config/env.js';
// Insurance: sync PAID orders without modifying Payment's business logic.
import { startInsuranceWorker } from './modules/insurance/worker.js';
const stopInsuranceWorker = startInsuranceWorker();
const server = app.listen(env.port, () =>
  console.log(env.service + ' listening on ' + env.port),
);
server.on('error', (error) => {
  console.error(error.code || 'SERVER_ERROR');
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    // Insurance: stop scheduling sync work on shutdown.
    stopInsuranceWorker();
    server.close();
  });
