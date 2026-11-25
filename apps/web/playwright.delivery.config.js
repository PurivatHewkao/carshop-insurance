import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'delivery.spec.js',
  workers: 1,
  reporter: 'list',
  outputDir: '../../tmp/delivery-browser-results',
  use: {
    baseURL: 'http://127.0.0.1:5187',
    channel:
      process.env.PW_BROWSER_CHANNEL ||
      (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5187',
    url: 'http://127.0.0.1:5187',
    reuseExistingServer: false,
  },
});
