import { expect, test } from '@playwright/test';

const makeOrder = (overrides = {}) => ({
  orderId: '11111111-1111-4111-8111-111111111111',
  orderNumber: 'ORD-11111111',
  orderStatus: 'PAID',
  customerName: 'ลูกค้าทดสอบ',
  car: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'TOYOTY Khon',
    color: 'ขาว',
    year: 2026,
  },
  production: { status: 'READY', etaFrom: '2026-11-25', etaTo: '2026-11-25' },
  totalAmount: '1000000.00',
  paidAmount: '1000000.00',
  refundedAmount: '0.00',
  pendingAmount: '0.00',
  outstandingAmount: '0.00',
  ...overrides,
});

// Every API request is intercepted: these tests never reach Railway or real accounts.
async function mockApi(context, state, role = 'admin') {
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.split('/api/v1/')[1];
    const headers = {
      'access-control-allow-origin': request.headers().origin || '*',
      'access-control-allow-credentials': 'true',
    };
    const respond = (body, status = 200) =>
      route.fulfill({ status, headers, json: body });
    if (request.method() === 'OPTIONS') return respond({});
    if (path === 'users/me')
      return respond({
        data: {
          id: 'test-user',
          name: 'ผู้ใช้ทดสอบ',
          email: 'test@example.test',
          phone: '',
          role,
          status: 'active',
        },
      });
    if (path === 'order-balances') {
      const page = Number(url.searchParams.get('page') || 1);
      state.pages.push(page);
      const start = (page - 1) * 100;
      return respond({
        data: state.orders.slice(start, start + 100),
        meta: { page, limit: 100, total: state.orders.length },
      });
    }
    if (path.startsWith('production/cars/') && request.method() === 'PATCH') {
      const body = request.postDataJSON();
      state.confirmations.push(body);
      if (state.fail)
        return respond(
          {
            error: {
              code: 'DELIVERY_NOT_PAID',
              message: 'ยอดชำระสุทธิยังไม่ครบ ไม่สามารถส่งมอบรถได้',
            },
          },
          409,
        );
      const order = state.orders.find((item) => item.orderId === body.orderId);
      expect(body.action).toBe('DELIVER');
      expect(path).toBe('production/cars/' + order.car.id);
      order.orderStatus = 'COMPLETED';
      if (order.production) order.production.status = 'DELIVERED';
      return respond({
        data: { carId: order.car.id, status: order.production?.status ?? null },
      });
    }
    return respond({ data: [] });
  });
}

test('admin confirms delivery and the customer sees it after refreshing transactions', async ({
  browser,
  context,
  page,
}) => {
  const state = { orders: [makeOrder()], confirmations: [], pages: [] };
  await mockApi(context, state);
  const customerContext = await browser.newContext();
  await mockApi(customerContext, state, 'customer');
  const customer = await customerContext.newPage();
  await customer.goto('http://127.0.0.1:5187/customer/transactions');
  await expect(
    customer.getByText('รอผู้ดูแลยืนยันส่งมอบ', { exact: true }),
  ).toBeVisible();
  await page.goto('/admin/deliveries');
  await expect(
    page.getByRole('link', { name: 'ยืนยันส่งมอบรถ' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'ยืนยันส่งมอบรถ', exact: true })
    .click();
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  expect(state.confirmations).toHaveLength(0);
  await page
    .getByRole('button', { name: 'ยืนยันส่งมอบรถ', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'ยืนยันการส่งมอบ', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.confirmations).toHaveLength(1);
  await page.getByRole('tab', { name: /ส่งมอบแล้ว/ }).click();
  await expect(page.getByRole('cell', { name: 'ORD-11111111' })).toBeVisible();
  await customer.getByRole('button', { name: 'รีเฟรชข้อมูล' }).click();
  await expect(
    customer
      .getByRole('row')
      .filter({ hasText: 'ORD-11111111' })
      .getByText('ส่งมอบแล้ว', { exact: true }),
  ).toHaveCount(2);
  await expect(
    customer.getByText('รอผู้ดูแลยืนยันส่งมอบ', { exact: true }),
  ).toHaveCount(0);
  await customerContext.close();
});

test('failed confirmation shows the server error and keeps the order uncompleted', async ({
  context,
  page,
}) => {
  const state = {
    orders: [makeOrder()],
    confirmations: [],
    pages: [],
    fail: true,
  };
  await mockApi(context, state);
  await page.goto('/admin/deliveries');
  await page
    .getByRole('button', { name: 'ยืนยันส่งมอบรถ', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'ยืนยันการส่งมอบ', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'ยอดชำระสุทธิยังไม่ครบ',
  );
  expect(state.orders[0].orderStatus).toBe('PAID');
});

test('only paid ready cars can be confirmed, including orders after the first page', async ({
  context,
  page,
}) => {
  const orders = Array.from({ length: 100 }, (_, index) =>
    makeOrder({
      orderId: 'unready-' + index,
      orderNumber: 'WAIT-' + index,
      production: { status: 'IN_TRANSIT' },
    }),
  );
  orders[0] = makeOrder({
    orderId: 'unpaid',
    orderNumber: 'UNPAID',
    orderStatus: 'CONFIRMED',
    paidAmount: '50000.00',
  });
  orders.push(makeOrder({ production: null }));
  const state = { orders, confirmations: [], pages: [] };
  await mockApi(context, state);
  await page.goto('/admin/deliveries');
  await expect(
    page.getByRole('button', { name: 'ยืนยันส่งมอบรถ', exact: true }),
  ).toHaveCount(1);
  await expect(page.getByRole('cell', { name: 'ORD-11111111' })).toBeVisible();
  expect(state.pages).toContain(2);
  await page.getByRole('tab', { name: /ทั้งหมด/ }).click();
  await expect(page.getByRole('cell', { name: 'UNPAID' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'ยืนยันส่งมอบรถ', exact: true }),
  ).toHaveCount(1);
});

test('customer cannot access the admin delivery workspace', async ({
  context,
  page,
}) => {
  const state = { orders: [makeOrder()], confirmations: [], pages: [] };
  await mockApi(context, state, 'customer');
  await page.goto('/admin/deliveries');
  await expect(
    page.getByRole('heading', { name: 'ไม่มีสิทธิ์เข้าถึงหน้านี้' }),
  ).toBeVisible();
  expect(state.pages).toHaveLength(0);
});
