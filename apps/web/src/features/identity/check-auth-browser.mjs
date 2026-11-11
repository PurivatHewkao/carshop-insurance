import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../node_modules/@playwright/test/index.mjs';
import { createServer } from '../../../node_modules/vite/dist/node/index.js';
import app from '../../../../../services/identity/src/app.js';
import { env } from '../../../../../services/identity/src/config/env.js';
import { listUsers } from '../../../../../services/identity/src/modules/auth/repository.js';
import { closeMysqlPool } from '../../../../../services/identity/src/config/mysql.js';

if (
  !/^carshop_identity_[a-f0-9]{12}_test$/.test(process.env.MYSQL_DATABASE || '')
)
  throw new Error('Run npm --prefix services/identity test');
const backend = app.listen(0, '127.0.0.1');
await new Promise((resolve) => backend.once('listening', resolve));
process.env.VITE_IDENTITY_MODE = 'api';
process.env.VITE_IDENTITY_API_URL = `http://127.0.0.1:${backend.address().port}/api/v1`;
const checkRoleButtons = ['127.0.0.1', 'localhost', '::1'].includes(
  process.env.MYSQL_HOST,
);
process.env.VITE_IDENTITY_ROLE_TEST_PASSWORD = checkRoleButtons
  ? process.env.ROLE_TEST_PASSWORD
  : '';
let vite;
let browser;
try {
  vite = await createServer({
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, open: false },
  });
  await vite.listen();
  const url = `http://127.0.0.1:${vite.httpServer.address().port}`;
  env.corsOrigins.push(url);
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url + '/register');
  await page.locator('[name=name]').fill('Browser Customer');
  await page.locator('[name=email]').fill('browser@example.test');
  await page.locator('[name=phone]').fill('0812345678');
  await page.locator('[name=password]').fill('Browser12345');
  await page.locator('[name=confirmPassword]').fill('Browser12345');
  await page.getByRole('button', { name: 'สร้างบัญชี →', exact: true }).click();
  await page.waitForURL('**/customer/profile');
  await page.locator('[name=name]').waitFor();
  const sessionCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'carshop_identity_session',
  );
  assert.ok(sessionCookie?.httpOnly);
  assert.equal(sessionCookie.sameSite, 'Lax');
  await page.reload();
  await page.locator('[name=name]').waitFor();
  assert.equal(new URL(page.url()).pathname, '/customer/profile');
  await page.locator('[name=name]').fill('Browser Updated');
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await page.getByText('บันทึกข้อมูลโปรไฟล์แล้ว', { exact: true }).waitFor();
  const showroomNav = page.locator('header.s-nav');
  await showroomNav.getByRole('link', { name: 'TOYOTY หน้าแรก' }).click();
  await page.waitForURL(url + '/');
  const accountLink = showroomNav.getByRole('link', {
    name: 'บัญชีของฉัน',
    exact: true,
  });
  await accountLink.waitFor();
  assert.equal(
    await showroomNav
      .getByRole('link', { name: 'เข้าสู่ระบบ', exact: true })
      .count(),
    0,
  );
  await page.reload();
  await accountLink.click();
  await page.waitForURL('**/account');
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await page.waitForURL('**/login');
  await showroomNav.getByRole('link', { name: 'TOYOTY หน้าแรก' }).click();
  await showroomNav
    .getByRole('link', { name: 'เข้าสู่ระบบ', exact: true })
    .waitFor();
  assert.ok(
    !(await page.context().cookies()).some(
      (cookie) => cookie.name === 'carshop_identity_session',
    ),
  );
  await page.goto(url + '/customer/profile');
  await page.waitForURL('**/login');
  async function signIn(email, password) {
    await page.locator('[name=email]').fill(email);
    await page.locator('[name=password]').fill(password);
    await page
      .getByRole('button', { name: 'เข้าสู่ระบบ →', exact: true })
      .click();
  }
  await signIn('browser@example.test', 'Wrong12345');
  await page.getByRole('alert').waitFor();
  await signIn('browser@example.test', 'Browser12345');
  await page.waitForURL('**/customer/profile');
  await page.locator('[name=name]').waitFor();
  assert.equal(
    await page.locator('[name=name]').inputValue(),
    'Browser Updated',
  );
  await page.evaluate(() => {
    globalThis.history.pushState({}, '', '/admin/users');
    globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'));
  });
  await page
    .getByRole('heading', { name: 'ไม่มีสิทธิ์เข้าถึงหน้านี้' })
    .waitFor();
  await page.getByRole('link', { name: 'บัญชีของฉัน', exact: true }).click();
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  const admin = (await listUsers()).find(
    (user) => user.role === 'admin' && user.status === 'active',
  );
  await signIn(admin.email, 'Admin12345');
  await page.waitForURL('**/admin/users');
  await page.reload();
  await page.getByRole('button', { name: 'เพิ่มผู้ใช้', exact: true }).click();
  assert.equal(new URL(page.url()).pathname, '/admin/users');
  const form = page.getByRole('region', { name: 'สร้างบัญชีผู้ใช้' });
  await form.locator('[name=name]').fill('Browser Staff');
  await form.locator('[name=email]').fill('browser-staff@example.test');
  await form.locator('[name=phone]').fill('0812345678');
  await form.locator('[name=password]').fill('Staff12345');
  await form.locator('[name=role]').selectOption('seller');
  await form.getByRole('button', { name: 'สร้างบัญชี', exact: true }).click();
  await page.getByText('สร้างบัญชีผู้ใช้แล้ว', { exact: true }).waitFor();
  await page
    .getByRole('button', { name: 'จัดการสิทธิ์ Browser Staff', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('[name=role]').selectOption('manager');
  await dialog.locator('[name=status]').selectOption('inactive');
  await dialog
    .getByRole('button', { name: 'บันทึกสิทธิ์', exact: true })
    .click();
  await page.getByText('บันทึกสิทธิ์ผู้ใช้แล้ว', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'บัญชีของฉัน ↗' }).click();
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await signIn('browser-staff@example.test', 'Staff12345');
  await page.getByRole('alert').waitFor();
  assert.equal(new URL(page.url()).pathname, '/login');
  await page.goto(url + '/admin/users');
  await page.waitForURL('**/login');
  if (checkRoleButtons) {
    for (const [role, destination] of Object.entries({
      CUSTOMER: '/customer/profile',
      SELLER: '/seller/tasks',
      ADMIN: '/admin/users',
      MANAGER: '/manager',
      FINANCE: '/account',
      STOCK: '/account',
    })) {
      await page.goto(url + '/login');
      await page.getByRole('button', { name: role, exact: true }).click();
      assert.equal(
        await page.locator('[name=email]').inputValue(),
        `role-${role.toLowerCase()}@carshop.test`,
      );
      assert.ok(
        (await page.locator('[name=password]').inputValue()) ===
          process.env.ROLE_TEST_PASSWORD,
      );
      assert.equal(new URL(page.url()).pathname, '/login');
      await page
        .getByRole('button', { name: 'เข้าสู่ระบบ →', exact: true })
        .click();
      await page.waitForURL(url + destination);
    }
    console.log(
      'Role fixtures passed: all six buttons fill the form and sign in on submit.',
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'Browser flows passed: registration, profile, login errors, logout, guards, admin creation and suspension.',
  );
} finally {
  await browser?.close();
  await vite?.close();
  await new Promise((resolve) => backend.close(resolve));
  await closeMysqlPool();
}
