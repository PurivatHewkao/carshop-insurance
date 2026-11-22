// Insurance: replace retired direct-checkout scenarios with the partner-only flow.
/* global document, window */
import { test, expect } from '@playwright/test';
const api = process.env.NOVA_E2E_API_URL || 'http://localhost:3010/api';
test('browse NOVA plans and route purchase to the seller', async ({
  page,
  request,
}) => {
  await page.goto('/?source=toyoty');
  await expect(page.locator('.plan-card')).toHaveCount(4);
  const smart = page
    .locator('.plan-card')
    .filter({
      has: page.getByRole('heading', { name: 'Smart Drive', exact: true }),
    });
  await expect(smart).toContainText('6,165.50');
  await smart.getByRole('link', { name: 'ซื้อพร้อมรถผ่าน Seller' }).click();
  await expect(
    page.getByRole('heading', { name: 'เลือกซื้อประกันพร้อมรถผ่าน Seller' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'ยืนยันซื้อประกัน (สาธิต)' }),
  ).toHaveCount(0);
  const blocked = await request.post(api + '/purchases', { data: {} });
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).error.code).toBe('DIRECT_PURCHASE_DISABLED');
});
test('NOVA admin starts at a separate login and its API rejects customers', async ({
  page,
  request,
}) => {
  await page.goto('/admin');
  await expect(page.getByLabel('อีเมลแอดมิน NOVA')).toBeVisible();
  await expect(page.getByLabel('รหัสผ่าน', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'อนุมัติและออกกรมธรรม์' }),
  ).toHaveCount(0);
  expect((await request.get(api + '/admin/requests')).status()).toBe(401);
  expect(
    (
      await request.get(api + '/partner/plans', {
        headers: { Authorization: 'Bearer customer-token' },
      })
    ).status(),
  ).toBe(401);
});
test('mobile plan browsing and closed checkout fit the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?source=toyoty');
  await expect(page.locator('.plan-card')).toHaveCount(4);
  await page
    .locator('.plan-card.recommended')
    .getByRole('link', { name: 'ซื้อพร้อมรถผ่าน Seller' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'เลือกซื้อประกันพร้อมรถผ่าน Seller' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.goto('/success/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('alert')).toContainText(
    'กรุณาเปิดใบรับรายการจากแท็บที่ทำรายการสำเร็จ',
  );
});
test('network failure offers retry and recovers plan browsing', async ({
  page,
}) => {
  await page.route('**/api/plans', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('เชื่อมต่อระบบไม่สำเร็จ');
  await page.unroute('**/api/plans');
  await page.getByRole('button', { name: 'ลองอีกครั้ง' }).click();
  await expect(page.locator('.plan-card')).toHaveCount(4);
});
