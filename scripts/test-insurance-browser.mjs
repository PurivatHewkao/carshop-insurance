// Insurance: optional real browser checks, invoked by the isolated integration suite.
/* global document, window */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const require = createRequire(
  new URL('../insurance/frontend/package.json', import.meta.url),
);
export async function runInsuranceBrowserTest({
  salesBase,
  novaBase,
  identityUrl,
  adminEmail,
  order,
}) {
  const { chromium, expect } = require('@playwright/test');
  const { createServer } =
    await import('../apps/web/node_modules/vite/dist/node/index.js');
  Object.assign(process.env, {
    VITE_SALES_API_URL: salesBase,
    VITE_IDENTITY_API_URL: `${identityUrl}/api/v1`,
    VITE_IDENTITY_MODE: 'api',
    VITE_INSURANCE_API_URL: novaBase,
  });
  const carshop = await createServer({
    root: fileURLToPath(new URL('../apps/web', import.meta.url)),
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
  });
  const nova = await createServer({
    root: fileURLToPath(new URL('../insurance/frontend', import.meta.url)),
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
  });
  await carshop.listen();
  await nova.listen();
  assert.equal(
    carshop.config.env.VITE_IDENTITY_API_URL,
    `${identityUrl}/api/v1`,
  );
  assert.equal(carshop.config.env.VITE_IDENTITY_MODE, 'api');
  const base = `http://127.0.0.1:${carshop.httpServer.address().port}`;
  const novaWeb = `http://127.0.0.1:${nova.httpServer.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const evidence = fileURLToPath(
    new URL('../tmp/insurance-evidence/', import.meta.url),
  );
  await mkdir(evidence, { recursive: true });
  try {
    const context = await browser.newContext({
      extraHTTPHeaders: { Authorization: 'Bearer seller' },
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('response', (response) => {
      if (response.status() >= 400)
        console.error(
          'Insurance browser HTTP error:',
          response.status(),
          response.url(),
        );
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/seller/orders/new');
    await expect(
      page.getByRole('heading', { name: /สร้างฟอร์มขายและใบจองรถยนต์/ }),
    ).toBeVisible();
    const select = page
      .locator('select')
      .filter({ has: page.locator('option', { hasText: 'Smart Drive' }) });
    await expect(select.locator('option')).toHaveCount(5);
    await select.selectOption({ label: 'Smart Drive (NOVA)' });
    await page
      .getByLabel('วันส่งมอบรถ / วันเริ่มคุ้มครอง *')
      .fill('2026-12-01');
    await expect(page.getByText(/เบี้ยสุทธิ 6,555.00 บาท/)).toBeVisible();
    await page.screenshot({ path: evidence + 'seller.png', fullPage: true });
    await select.selectOption('');
    await expect(
      page.getByLabel('วันส่งมอบรถ / วันเริ่มคุ้มครอง *'),
    ).toHaveCount(0);
    await context.close();
    const customer = await browser.newContext({
      extraHTTPHeaders: { Authorization: 'Bearer customer' },
      viewport: { width: 390, height: 844 },
    });
    const customerPage = await customer.newPage();
    customerPage.on('pageerror', (error) => errors.push(error.message));
    await customerPage.goto(base + '/customer/insurance');
    await expect(
      customerPage.getByRole('heading', { name: 'ประกันของฉัน' }),
    ).toBeVisible();
    await expect(
      customerPage.getByText('ออกกรมธรรม์แล้ว', { exact: true }),
    ).toBeVisible();
    await expect(
      customerPage.getByText(order.id, { exact: false }),
    ).toBeVisible();
    await customerPage.screenshot({
      path: evidence + 'customer-mobile.png',
      fullPage: true,
    });
    assert.ok(
      await customerPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      'customer page must fit mobile viewport',
    );
    await customer.close();
    const admin = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const adminPage = await admin.newPage();
    adminPage.on('pageerror', (error) => errors.push(error.message));
    await adminPage.goto(novaWeb + '/buy/anything');
    await expect(
      adminPage.getByRole('heading', {
        name: 'เลือกซื้อประกันพร้อมรถผ่าน Seller',
      }),
    ).toBeVisible();
    await expect(
      adminPage.getByRole('button', { name: 'ยืนยันซื้อประกัน (สาธิต)' }),
    ).toHaveCount(0);
    await adminPage.goto(novaWeb + '/admin');
    await adminPage.getByLabel('อีเมลแอดมิน NOVA').fill(adminEmail);
    await adminPage
      .getByLabel('รหัสผ่าน', { exact: true })
      .fill('integration-password-123');
    await adminPage
      .getByRole('button', { name: 'เข้าสู่ระบบ', exact: true })
      .click();
    await expect(
      adminPage.getByRole('button', { name: 'ออกจากระบบ' }),
    ).toBeVisible();
    await expect(adminPage.getByText(order.id, { exact: true })).toBeVisible();
    await adminPage.screenshot({
      path: evidence + 'nova-admin.png',
      fullPage: true,
    });
    await adminPage.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await expect(
      adminPage.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }),
    ).toBeVisible();
    await admin.close();
    assert.deepEqual(errors, []);
    // Also exercise the maintained public-page Playwright regression suite.
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        fileURLToPath(
          new URL(
            '../insurance/frontend/node_modules/@playwright/test/cli.js',
            import.meta.url,
          ),
        ),
        'test',
        '--output=' + evidence + 'playwright',
      ],
      {
        cwd: fileURLToPath(new URL('../insurance/frontend', import.meta.url)),
        env: {
          ...process.env,
          NOVA_E2E_URL: novaWeb,
          NOVA_E2E_API_URL: novaBase,
        },
        timeout: 60000,
      },
    );
    console.log(stdout);
  } finally {
    await browser.close();
    await carshop.close();
    await nova.close();
  }
}
