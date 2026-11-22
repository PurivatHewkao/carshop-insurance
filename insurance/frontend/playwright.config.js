import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  webServer: process.env.NOVA_E2E_URL
    ? undefined
    : [
        {
          command: 'npm start',
          cwd: fileURLToPath(new URL('../backend', import.meta.url)),
          url: 'http://localhost:3010/api/health',
          reuseExistingServer: true,
          timeout: 60000,
        },
        {
          command: 'npm run dev',
          url: 'http://localhost:5174',
          reuseExistingServer: true,
        },
        {
          command: 'npm run dev',
          cwd: fileURLToPath(new URL('../../apps/web', import.meta.url)),
          url: 'http://localhost:5173',
          reuseExistingServer: true,
        },
      ],
  use: {
    baseURL: process.env.NOVA_E2E_URL || 'http://localhost:5174',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
