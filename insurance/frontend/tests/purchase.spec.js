/* global document, innerWidth */
import { test, expect } from '@playwright/test';
const toyoty = process.env.TOYOTY_E2E_URL || 'http://localhost:5173';
const api = process.env.NOVA_E2E_API_URL || 'http://localhost:3010/api';

test('TOYOTY partner → NOVA checkout → persisted policy → TOYOTY', async ({
  page,
  request,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(toyoty + '/insurance');
  await expect(
    page.getByRole('heading', {
      name: 'เลือกประกันกับ Partner ของเรา เพื่อดีลที่ดีกว่า',
    }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('toyoty-partner.png'),
    fullPage: true,
  });
  await page
    .getByRole('link', { name: 'เลือกซื้อประกัน', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/5174\/\?source=toyoty/);
  await expect(page.getByText('Welcome TOYOTY Customer')).toBeVisible();
  const cards = page.locator('.plan-card');
  await expect(cards).toHaveCount(4);
  await page.screenshot({
    path: testInfo.outputPath('nova-home-desktop.png'),
    fullPage: true,
  });
  const smart = cards.filter({
    has: page.getByRole('heading', { name: 'Smart Drive', exact: true }),
  });
  await expect(smart).toContainText('6,165.50');
  await smart.getByRole('link', { name: 'เลือกแผนนี้' }).click();
  await expect(
    page.getByRole('heading', { name: 'ความอุ่นใจ เริ่มจากตรงนี้' }),
  ).toBeVisible();
  await expect(page.locator('.summary')).toContainText('6,165.50');
  await page.getByRole('button', { name: 'ยืนยันซื้อประกัน (สาธิต)' }).click();
  await expect(page).toHaveURL(/\/buy\//);
  await expect(page.locator('#fullName:invalid')).toBeVisible();
  await page.getByLabel('ชื่อ-นามสกุล').fill('NOVA Browser Demo');
  await page.getByLabel('เบอร์โทรศัพท์').fill('0812345678');
  await page.getByLabel('อีเมล').fill('nova-demo@example.com');
  await page.getByLabel('ยี่ห้อรถ').fill('Toyota');
  await page.getByLabel('รุ่นรถ').fill('Yaris Ativ');
  await page.getByLabel('ปีรถ (ค.ศ.)').fill('2026');
  await page.getByRole('checkbox').check();
  await page.screenshot({
    path: testInfo.outputPath('nova-checkout.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'ยืนยันซื้อประกัน (สาธิต)' }).click();
  await expect(
    page.getByRole('heading', { name: 'รับคำขอซื้อประกันสาธิตสำเร็จ' }),
  ).toBeVisible();
  await expect(page.locator('.receipt')).toContainText('NOVA Browser Demo');
  await expect(page.locator('.receipt')).toContainText('6,165.50');
  await expect(page.locator('.status')).toHaveText('ISSUED_DEMO');
  const policyId = new URL(page.url()).pathname.split('/').pop();
  expect(new URL(page.url()).searchParams.has('receiptToken')).toBe(false);
  expect((await request.get(api + '/policies/' + policyId)).status()).toBe(401);
  await page.reload();
  await expect(page.locator('.receipt')).toContainText('NOVA Browser Demo');
  await page.screenshot({
    path: testInfo.outputPath('nova-success.png'),
    fullPage: true,
  });
  await page
    .getByRole('link', { name: 'กลับไปยัง TOYOTY', exact: true })
    .click();
  await expect(page).toHaveURL(toyoty + '/insurance');
});

test('mobile 390px: responsive home, menu, checkout and unavailable receipt', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?source=toyoty');
  await expect(page.locator('.plan-card')).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('nova-home-mobile.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'เปิดเมนู' }).click();
  await expect(
    page.getByRole('navigation').getByText('Insurance Plans'),
  ).toBeVisible();
  await page.getByRole('navigation').getByText('Insurance Plans').click();
  await expect(page.getByRole('button', { name: 'เปิดเมนู' })).toBeVisible();
  await page
    .locator('.plan-card.recommended')
    .getByRole('link', { name: 'เลือกแผนนี้' })
    .click();
  await expect(page.locator('.summary')).toContainText('17,005.00');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('nova-checkout-mobile.png'),
    fullPage: true,
  });
  await page.goto('/success/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('alert')).toContainText(
    'กรุณาเปิดใบรับรายการจากแท็บที่ทำรายการสำเร็จ',
  );
  await expect(page.locator('.receipt')).toHaveCount(0);
});

test('network failure has a retry state and recovers using real plans API', async ({
  page,
}) => {
  await page.route('**/api/plans', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('เชื่อมต่อระบบไม่สำเร็จ');
  await page.unroute('**/api/plans');
  await page.getByRole('button', { name: 'ลองอีกครั้ง' }).click();
  await expect(page.locator('.plan-card')).toHaveCount(4);
  await expect(page.getByText('Welcome TOYOTY Customer')).toHaveCount(0);
  await expect(page.locator('.plan-card').nth(1)).toContainText('6,490');
});
