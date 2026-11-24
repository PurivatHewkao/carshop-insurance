import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  salesSummary,
  salesBySeller,
  salesByModel,
  inventoryReport,
  appointmentsReport,
  financialReport,
  ordersReport,
  activityFeed,
  productionDelays,
  salesByConfiguration,
} from '../src/modules/reports/service.js';
import { activityFeedQuerySchema, reportDateRangeQuerySchema, salesSummaryQuerySchema } from '../src/modules/reports/validation.js';

const req = { get: (name) => (name === 'authorization' ? 'Bearer test-token' : undefined) };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

// Routes upstream URLs (by port + path) to fixture handlers and records calls.
function mockUpstream(handlers) {
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    const key = `${url.port} ${url.pathname.replace(/^\/api\/v1\//, '')}`;
    const handler = handlers[key];
    if (!handler) throw new Error(`Unexpected upstream call: ${key}`);
    return handler(url);
  };
  return calls;
}

const orders = [
  { id: 'o1', sellerId: 's1', sellerName: 'Ann', carModel: 'TOYOTY Khon', totalAmount: '500000.00', createdAt: '2026-10-05T03:00:00Z', orderStatus: 'PAID', status: 'APPROVED' },
  { id: 'o2', sellerId: 's1', sellerName: 'Ann', carModel: 'TOYOTY Iburaporn', totalAmount: '1,200,000.50', createdAt: '2026-11-02T03:00:00Z', orderStatus: 'NEW', status: 'APPROVED' },
  { id: 'o3', sellerId: 's2', sellerName: 'Bob', carModel: 'TOYOTY Khon', totalAmount: '480000', createdAt: '2026-11-10T03:00:00Z', orderStatus: 'NEW', status: 'PENDING_APPROVAL' },
  { id: 'o4', sellerId: 's2', sellerName: 'Bob', carModel: 'TOYOTY Khon', totalAmount: '999999', createdAt: '2026-11-11T03:00:00Z', orderStatus: 'CANCELLED', status: 'APPROVED' },
];

test('sales summary sums money exactly, skips cancelled orders and groups by month', async () => {
  const calls = mockUpstream({
    '3003 orders': () => json({ data: orders }),
    '3004 order-balances': () => json({ data: [{ orderId: 'o1', paidAmount: '500000.00', refundedAmount: '10000.10' }, { orderId: 'o4', paidAmount: '999999', refundedAmount: '0' }], meta: { total: 2 } }),
  });
  const result = await salesSummary(req, {});
  assert.equal(result.totalSales, '2180000.50');
  assert.equal(result.orderCount, 3);
  assert.equal(result.paidAmount, '500000.00');
  assert.equal(result.refundedAmount, '10000.10');
  assert.deepEqual(result.series, [
    { period: '2026-10', orderCount: 1, totalSales: '500000.00' },
    { period: '2026-11', orderCount: 2, totalSales: '1680000.50' },
  ]);
  assert.equal(result.sourceLimitReached, false);
  assert.equal(calls[0].init.headers.authorization, 'Bearer test-token');
});

test('sales summary filters by date range', async () => {
  mockUpstream({
    '3003 orders': () => json({ data: orders }),
    '3004 order-balances': () => json({ data: [], meta: { total: 0 } }),
  });
  const result = await salesSummary(req, { date_from: '2026-11-01', date_to: '2026-11-05', group_by: 'day' });
  assert.equal(result.orderCount, 1);
  assert.equal(result.series[0].period, '2026-11-02');
});

test('sales by seller and model return items sorted by sales with a visible source-limit flag', async () => {
  mockUpstream({ '3003 orders': () => json({ data: orders }) });
  const bySeller = await salesBySeller(req, {});
  assert.deepEqual(bySeller.items.map((item) => [item.sellerName, item.totalSales]), [['Ann', '1700000.50'], ['Bob', '480000.00']]);
  const byModel = await salesByModel(req, {});
  assert.deepEqual(byModel.items.map((item) => [item.carModel, item.orderCount]), [['TOYOTY Iburaporn', 1], ['TOYOTY Khon', 2]]);
  // The flag must survive JSON serialization (res.json) so the UI can warn.
  assert.equal(JSON.parse(JSON.stringify(byModel)).sourceLimitReached, false);
});

test('sales source limit is flagged from raw upstream rows', async () => {
  const many = Array.from({ length: 500 }, (_, i) => ({ ...orders[0], id: `o${i}`, createdAt: '2025-01-01T00:00:00Z' }));
  mockUpstream({ '3003 orders': () => json({ data: many }) });
  const result = await salesBySeller(req, { date_from: '2026-01-01' });
  assert.equal(result.items.length, 0);
  assert.equal(result.sourceLimitReached, true);
});

test('payment pages are all read', async () => {
  const pages = [];
  mockUpstream({
    '3004 payments': (url) => {
      const page = Number(url.searchParams.get('page'));
      pages.push(page);
      const items = page < 3 ? Array.from({ length: 100 }, (_, i) => ({ id: `p${page}-${i}`, amount: '1.00', status: 'SUCCESS', createdAt: '2026-11-01' })) : [{ id: 'last', amount: '0.50', status: 'FAILED', createdAt: '2026-11-01' }];
      return json({ data: items, meta: { total: 201 } });
    },
    '3004 refunds': () => json({ data: [{ id: 'r1', amount: '20.00', status: 'REFUNDED', createdAt: '2026-11-02' }], meta: { total: 1 } }),
    '3004 invoices': () => json({ data: [{ id: 'i1', amount: '30.00', status: 'ISSUED', issueDate: '2026-11-03' }, { id: 'i2', amount: '5.00', status: 'CANCELLED', issueDate: '2026-11-03' }], meta: { total: 2 } }),
    '3004 finance-requests': () => json({ data: [{ id: 'f1', status: 'OPEN', createdAt: '2026-11-04' }], meta: { total: 1 } }),
  });
  const result = await financialReport(req, {});
  assert.deepEqual(pages, [1, 2, 3]);
  assert.equal(result.summary.paymentCount, 201);
  assert.equal(result.summary.paidAmount, '200.00');
  assert.equal(result.summary.failedPaymentCount, 1);
  assert.equal(result.summary.refundedAmount, '20.00');
  assert.equal(result.summary.invoiceAmount, '30.00');
  assert.equal(result.summary.outstandingInvoiceAmount, '30.00');
  assert.equal(result.summary.openFinanceRequestCount, 1);
  assert.equal(result.pagination.paymentsTruncated, false);
});

test('inventory falls back to every legacy catalog page when Catalog has no TOYOTY inventory', async () => {
  mockUpstream({
    '3002 cars/inventory': () => json({ error: { code: 'NOT_FOUND' } }, 404),
    '3002 cars/stock-summary': () => json({ data: { available: 3 } }),
    '3002 cars': (url) => {
      const page = Number(url.searchParams.get('page'));
      const items = page === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: `c${i}`, name: 'TOYOTY Khon', stock: 1 })) : [{ id: 'c100', name: 'TOYOTY E-san', stock: 2 }];
      return json({ data: items, meta: { total: 101 } });
    },
  });
  const result = await inventoryReport(req);
  assert.equal(result.mode, 'legacy');
  assert.equal(result.items.length, 101);
  assert.equal(result.totalModels, 101);
  assert.deepEqual(result.summary, { available: 3 });
  assert.equal(result.sourceLimitReached, false);
});

// Catalog GET /cars/inventory (กร): model × trim counts + production queue.
const blankSteps = { QUOTED: 0, SCHEDULED: 0, IN_PRODUCTION: 0, IN_TRANSIT: 0, READY: 0, DELIVERED: 0 };
const trimCounts = (overrides = {}) => ({ showroom: 0, inStock: 0, open: 0, cancelled: 0, delayed: 0, ...overrides, production: { ...blankSteps, ...overrides.production } });
const toyotyInventory = {
  asOf: '2026-11-24',
  totals: { models: 1, trims: 3, showroom: 1, inStock: 2, open: 4, cancelled: 1, delayed: 1, production: { ...blankSteps, QUOTED: 1, SCHEDULED: 2, IN_PRODUCTION: 1, DELIVERED: 1 } },
  models: [{
    id: 'khon', uuid: 'm-khon', brand: 'TOYOTY', name: 'Khon',
    // model totals include 2 old stock cars with no trim
    ...trimCounts({ showroom: 1, inStock: 2, open: 4, cancelled: 1, delayed: 1, production: { QUOTED: 1, SCHEDULED: 2, IN_PRODUCTION: 1, DELIVERED: 1 } }),
    trims: [
      // sent out of order on purpose: the report lists Eco → Balanced → High Performance
      { id: 't3', code: 'HIGH_PERFORMANCE', name: 'High Performance', price: '2410000.00', ...trimCounts({ open: 1, delayed: 1, production: { IN_PRODUCTION: 1 } }) },
      { id: 't1', code: 'ECO', name: 'Eco', price: '2060000.00', ...trimCounts({ showroom: 1, open: 1, production: { QUOTED: 1 } }) },
      { id: 't2', code: 'BALANCED', name: 'Balanced', price: '2210000.00', ...trimCounts({ open: 2, cancelled: 1, production: { SCHEDULED: 2, DELIVERED: 1 } }) },
    ],
    queue: [{ weekStart: '2026-11-23', capacity: 5, booked: 2 }, { weekStart: '2026-11-30', capacity: 5, booked: 7 }],
  }],
};

test('inventory reports TOYOTY stock per model × trim with the production queue', async () => {
  const calls = mockUpstream({ '3002 cars/inventory': () => json({ data: toyotyInventory }) });
  const result = await inventoryReport(req);
  assert.equal(calls[0].url.searchParams.get('weeks'), '8');
  assert.equal(result.mode, 'toyoty');
  assert.deepEqual(result.items.map((item) => [item.model, item.trim]), [['Khon', 'ECO'], ['Khon', 'BALANCED'], ['Khon', 'HIGH_PERFORMANCE'], ['Khon', null]]);
  const balanced = result.items[1];
  assert.deepEqual(
    [balanced.scheduled, balanced.delivered, balanced.open, balanced.cancelled, balanced.price],
    [2, 1, 2, 1, '2210000.00'],
  );
  // QUOTED (กร) and WAITING (ดิว) are the same step: ordered, not yet booked.
  assert.equal(result.items[0].waiting, 1);
  // The leftover row holds only the 2 old stock cars without a trim.
  assert.deepEqual([result.items[3].trimName, result.items[3].inStock, result.items[3].open], ['ไม่ระบุรุ่นย่อย', 2, 0]);
  assert.deepEqual(result.summary, {
    models: 1, trims: 3, showroom: 1, inStock: 2, open: 4, delayed: 1, cancelled: 1,
    waiting: 1, scheduled: 2, inProduction: 1, inTransit: 0, ready: 0, delivered: 1,
  });
  assert.deepEqual(result.queue.map((week) => [week.weekStart, week.booked, week.free]), [['2026-11-23', 2, 3], ['2026-11-30', 7, 0]]);
});

test('inventory understands the WAITING step name of the production queue', async () => {
  const waiting = structuredClone(toyotyInventory);
  waiting.models[0].trims[1].production = { WAITING: 3, CANCELLED: 4 };
  mockUpstream({ '3002 cars/inventory': () => json({ data: waiting }) });
  const result = await inventoryReport(req);
  assert.equal(result.items[0].waiting, 3);
});

test('inventory does not hide a Catalog outage behind the legacy fallback', async () => {
  mockUpstream({ '3002 cars/inventory': () => json({}, 500) });
  await assert.rejects(inventoryReport(req), { status: 502 });
  mockUpstream({ '3002 cars/inventory': () => json({ error: { code: 'FORBIDDEN' } }, 403) });
  await assert.rejects(inventoryReport(req), { status: 403 });
});

// Catalog GET /cars/units rows (made-to-order cars).
const unit = (overrides) => ({
  id: 'u', vin: 'TYTO-1', model: 'TOYOTY Khon', modelSlug: 'khon', trim: 'BALANCED', trimName: 'Balanced',
  color: 'ขาวมุก', colorCode: 'PEARL_WHITE', wheel: 'W18', wheelName: '18" สปอร์ต', wheelSizeInch: 18,
  price: '2250000.00', status: 'RESERVED', productionStatus: 'SCHEDULED', orderId: 'o1', orderStatus: 'CONFIRMED',
  estimatedReady: { from: '2027-01-25', to: '2027-02-01' }, delayDays: 0, canCancelForDelay: false,
  createdAt: '2026-11-24T03:00:00.000Z', ...overrides,
});

test('sales by configuration groups sold made-to-order cars by trim, colour and wheel', async () => {
  const units = [
    unit({ id: 'u1' }),
    unit({ id: 'u2', orderId: 'o2' }),
    unit({ id: 'u3', orderId: 'o3', trim: 'ECO', trimName: 'Eco', color: 'ขาว', colorCode: 'WHITE', wheel: 'W16', wheelName: '16" กระทะมาตรฐาน', price: '2060000.00' }),
    unit({ id: 'u4', orderId: 'o4', model: 'TOYOTY E-san', modelSlug: 'e-san', trim: 'HIGH_PERFORMANCE', trimName: 'High Performance', color: 'แดงสปอร์ต', colorCode: 'SPORT_RED', wheel: 'W19', wheelName: '19" ฟอร์จ', price: '2110000.00', createdAt: '2026-10-01T03:00:00Z' }),
    // not counted: car cancelled, no order (quote only)
    unit({ id: 'u5', orderId: 'o5', status: 'INACTIVE' }),
    unit({ id: 'u6', orderId: null, orderStatus: null }),
  ];
  const calls = mockUpstream({ '3002 cars/units': () => json({ data: units, meta: { total: units.length } }) });
  const result = await salesByConfiguration(req, {});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.searchParams.get('pageSize'), '100');
  assert.equal(calls[0].url.searchParams.get('state'), 'all');
  assert.equal(result.available, true);
  assert.equal(result.orderCount, 4);
  assert.equal(result.totalSales, '8670000.00');
  assert.deepEqual(result.items[0], {
    id: 'khon|BALANCED|PEARL_WHITE|W18', model: 'TOYOTY Khon', trim: 'BALANCED', trimName: 'Balanced',
    color: 'ขาวมุก', wheel: '18" สปอร์ต', orderCount: 2, totalSales: '4500000.00',
  });
  assert.deepEqual(result.byTrim.map((row) => [row.label, row.orderCount]), [['Balanced', 2], ['High Performance', 1], ['Eco', 1]]);
  assert.deepEqual(result.byColor.map((row) => row.label), ['ขาวมุก', 'แดงสปอร์ต', 'ขาว']);
  assert.deepEqual(result.byWheel.map((row) => [row.label, row.totalSales]), [['18" สปอร์ต', '4500000.00'], ['19" ฟอร์จ', '2110000.00'], ['16" กระทะมาตรฐาน', '2060000.00']]);

  const november = await salesByConfiguration(req, { date_from: '2026-11-01' });
  assert.equal(november.orderCount, 3);
});

test('sales by configuration reads every units page', async () => {
  const pages = [];
  mockUpstream({
    '3002 cars/units': (url) => {
      const page = Number(url.searchParams.get('page'));
      pages.push(page);
      const rows = page === 1 ? Array.from({ length: 100 }, (_, i) => unit({ id: `u${i}`, orderId: `o${i}` })) : [unit({ id: 'last', orderId: 'last' })];
      return json({ data: rows, meta: { total: 101 } });
    },
  });
  const result = await salesByConfiguration(req, {});
  assert.deepEqual(pages, [1, 2]);
  assert.equal(result.orderCount, 101);
  assert.equal(result.sourceLimitReached, false);
});

test('production delays list late cars, longest delay first', async () => {
  const calls = mockUpstream({
    '3002 cars/units': () => json({ data: [
      unit({ id: 'u1', delayDays: 7, productionStatus: 'IN_PRODUCTION' }),
      unit({ id: 'u2', delayDays: 35, canCancelForDelay: true, buildWeek: '2026-12-07' }),
      unit({ id: 'u3', delayDays: 0, estimatedReady: { from: '2026-11-10', to: '2026-11-17' } }),
    ], meta: { total: 3 } }),
  });
  const result = await productionDelays(req);
  assert.equal(calls[0].url.searchParams.get('state'), 'delayed');
  assert.deepEqual(result.items.map((item) => [item.id, item.delayDays]), [['u2', 35], ['u1', 7], ['u3', 0]]);
  assert.equal(result.total, 3);
  assert.equal(result.cancellable, 1);
  assert.equal(result.items[0].buildWeek, '2026-12-07');
  assert.equal(result.items[2].etaTo, '2026-11-17');
});

test('TOYOTY reports say so when Catalog has not been migrated yet', async () => {
  mockUpstream({ '3002 cars/units': () => json({ error: { code: 'NOT_FOUND' } }, 404) });
  const sales = await salesByConfiguration(req, {});
  assert.equal(sales.available, false);
  assert.deepEqual([sales.items, sales.byTrim], [[], []]);
  const delays = await productionDelays(req);
  assert.equal(delays.available, false);
  assert.equal(delays.total, 0);
});

test('appointments are counted by status', async () => {
  mockUpstream({
    '3003 appointments': () => json({ data: [
      { id: 'a1', status: 'PENDING', preferredDate: '2026-11-01' },
      { id: 'a2', status: 'COMPLETED', preferredDate: '2026-11-02' },
      { id: 'a3', status: 'COMPLETED', preferredDate: '2026-11-03' },
    ] }),
  });
  const result = await appointmentsReport(req, { date_from: '2026-11-02' });
  assert.equal(result.total, 2);
  assert.deepEqual(result.statusCounts, { COMPLETED: 2 });
});

test('upstream auth failures and outages map to safe status codes', async () => {
  mockUpstream({ '3003 orders': () => json({ error: { code: 'UNAUTHORIZED' } }, 401) });
  await assert.rejects(salesBySeller(req, {}), { status: 401 });
  globalThis.fetch = async () => { throw new TypeError('connect ECONNREFUSED'); };
  await assert.rejects(salesBySeller(req, {}), { status: 503 });
  mockUpstream({ '3003 orders': () => json({}, 500) });
  await assert.rejects(salesBySeller(req, {}), { status: 502 });
});

test('report query validation rejects bad dates and group_by', () => {
  assert.equal(reportDateRangeQuerySchema.safeParse({ date_from: '2026-11-01', date_to: '2026-11-30' }).success, true);
  assert.equal(reportDateRangeQuerySchema.safeParse({ date_from: '2026-11-30', date_to: '2026-11-01' }).success, false);
  assert.equal(reportDateRangeQuerySchema.safeParse({ date_from: '30/11/2026' }).success, false);
  assert.equal(salesSummaryQuerySchema.safeParse({ group_by: 'week' }).success, false);
  assert.equal(salesSummaryQuerySchema.safeParse({ group_by: 'year' }).success, true);
});

test('orders report lists orders newest first within the date range', async () => {
  mockUpstream({ '3003 orders': () => json({ data: orders.map((order, i) => ({ ...order, code: `ORD-${i}`, customerName: `C${i}` })) }) });
  const result = await ordersReport(req, { date_from: '2026-11-01' });
  assert.deepEqual(result.items.map((item) => item.code), ['ORD-3', 'ORD-2', 'ORD-1']);
  assert.equal(result.items[2].totalAmount, '1200000.50');
  assert.equal(result.items[0].orderStatus, 'CANCELLED');
  assert.equal(result.sourceLimitReached, false);
});

test('timestamps are filtered by Bangkok calendar day, not UTC', async () => {
  mockUpstream({
    // 2026-11-01T18:30Z is 01:30 on 2 Nov in Bangkok.
    '3004 payments': () => json({ data: [{ id: 'p1', amount: '10.00', status: 'SUCCESS', createdAt: '2026-11-01T18:30:00Z' }], meta: { total: 1 } }),
    '3004 refunds': () => json({ data: [], meta: { total: 0 } }),
    '3004 invoices': () => json({ data: [], meta: { total: 0 } }),
    '3004 finance-requests': () => json({ data: [], meta: { total: 0 } }),
  });
  const result = await financialReport(req, { date_from: '2026-11-02', date_to: '2026-11-02' });
  assert.equal(result.summary.paymentCount, 1);
});

test('activity feed shows who did what from source records, newest first', async () => {
  mockUpstream({
    '3003 orders': () => json({ data: [{ id: 'o1', code: 'ORD-1', sellerId: 'e1', sellerName: 'Ann Seller', customerName: 'Cara', carModel: 'TOYOTY Khon', totalAmount: 500000, createdAt: '2026-11-10', status: 'APPROVED' }] }),
    '3003 appointments': () => json({ data: [{ id: 'a1', code: 'APT-1', customerName: 'Cara', type: 'ทดลองขับ', createdAt: '2026-11-09T03:00:00.000Z', dbStatus: 'PENDING' }] }),
    '3004 payments': () => json({ data: [{ id: 'p1', orderId: 'o1', amount: '500000.00', paymentMethod: 'CARD', status: 'SUCCESS', createdAt: '2026-11-12T05:00:00Z' }], meta: { total: 1 } }),
    '3004 invoices': () => json({ data: [{ id: 'i1', orderId: 'o1', issuedBy: 'e1', invoiceNumber: 'INV-1', amount: '500000.00', status: 'PAID', createdAt: '2026-11-11T05:00:00Z' }], meta: { total: 1 } }),
    '3004 refunds': () => json({ error: { code: 'FORBIDDEN' } }, 403),
    '3004 finance-requests': () => json({ data: [], meta: { total: 0 } }),
  });
  const result = await activityFeed(req, {});
  assert.deepEqual(result.items.map((item) => [item.action, item.actor]), [
    ['PAYMENT_RECORDED', 'Cara'],
    ['INVOICE_ISSUED', 'Ann Seller'],
    ['ORDER_CREATED', 'Ann Seller'],
    ['APPOINTMENT_REQUESTED', 'Cara'],
  ]);
  assert.equal(result.items[1].entity, 'INV-1');
  assert.equal(result.items[2].dateOnly, true);
  // A denied source is reported, the rest of the feed still works.
  assert.equal(result.sources.refunds, 'error 403');
  assert.equal(result.sources.orders, 'ok');

  const salesOnly = await activityFeed(req, { service: 'sales', date_from: '2026-11-10' });
  assert.deepEqual(salesOnly.items.map((item) => item.action), ['ORDER_CREATED']);
});

test('activity feed query validation', () => {
  assert.equal(activityFeedQuerySchema.safeParse({ service: 'sales', limit: '50' }).success, true);
  assert.equal(activityFeedQuerySchema.safeParse({ service: 'unknown' }).success, false);
  assert.equal(activityFeedQuerySchema.safeParse({ limit: '9999' }).success, false);
});
