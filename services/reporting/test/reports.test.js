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
  { id: 'o1', sellerId: 's1', sellerName: 'Ann', carModel: 'Yaris', totalAmount: '500000.00', createdAt: '2026-10-05T03:00:00Z', orderStatus: 'PAID', status: 'APPROVED' },
  { id: 'o2', sellerId: 's1', sellerName: 'Ann', carModel: 'Fortuner', totalAmount: '1,200,000.50', createdAt: '2026-11-02T03:00:00Z', orderStatus: 'NEW', status: 'APPROVED' },
  { id: 'o3', sellerId: 's2', sellerName: 'Bob', carModel: 'Yaris', totalAmount: '480000', createdAt: '2026-11-10T03:00:00Z', orderStatus: 'NEW', status: 'PENDING_APPROVAL' },
  { id: 'o4', sellerId: 's2', sellerName: 'Bob', carModel: 'Yaris', totalAmount: '999999', createdAt: '2026-11-11T03:00:00Z', orderStatus: 'CANCELLED', status: 'APPROVED' },
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
  assert.deepEqual(byModel.items.map((item) => [item.carModel, item.orderCount]), [['Fortuner', 1], ['Yaris', 2]]);
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

test('inventory reads every catalog page', async () => {
  mockUpstream({
    '3002 cars/stock-summary': () => json({ data: { available: 3 } }),
    '3002 cars': (url) => {
      const page = Number(url.searchParams.get('page'));
      const items = page === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: `c${i}`, name: 'Yaris', stock: 1 })) : [{ id: 'c100', name: 'Camry', stock: 2 }];
      return json({ data: items, meta: { total: 101 } });
    },
  });
  const result = await inventoryReport(req);
  assert.equal(result.items.length, 101);
  assert.equal(result.totalModels, 101);
  assert.deepEqual(result.summary, { available: 3 });
  assert.equal(result.sourceLimitReached, false);
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
    '3003 orders': () => json({ data: [{ id: 'o1', code: 'ORD-1', sellerId: 'e1', sellerName: 'Ann Seller', customerName: 'Cara', carModel: 'Yaris', totalAmount: 500000, createdAt: '2026-11-10', status: 'APPROVED' }] }),
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
