import { getCatalogData, getPaymentData, getSalesData } from '../../clients/source-api.js';

const rowsFrom = (payload) => Array.isArray(payload?.data) ? payload.data : [];

// Payment APIs use page/limit and return meta.total. Read every page instead of
// silently reporting only the first page. A hard ceiling protects the service
// from a broken upstream meta value or an unexpectedly huge export.
async function loadAllPages(fetchPage, params = {}) {
  const limit = 100;
  const first = await fetchPage({ ...params, page: 1, limit });
  const items = rowsFrom(first);
  const total = Number(first?.meta?.total ?? items.length);
  const pageCount = Math.min(1000, Math.ceil(total / limit));
  for (let page = 2; page <= pageCount; page += 1) {
    const next = await fetchPage({ ...params, page, limit });
    items.push(...rowsFrom(next));
  }
  return { items, total, truncated: items.length < total };
}

const inRangeBy = (item, fields, from, to) => {
  const date = fields.map((field) => item?.[field]).find(Boolean);
  return inDateRange(date, from, to);
};
const cents = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).replace(/,/g, '').replace(/THB/gi, '').trim();
  if (!/^-?\d+(\.\d{1,})?$/.test(normalized)) return 0;
  const [whole, fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
};
const money = (value) => (value / 100).toFixed(2);
const inDateRange = (value, from, to) => {
  if (!value) return !from && !to;
  const date = String(value).slice(0, 10);
  return (!from || date >= from) && (!to || date <= to);
};
const groupKey = (date, groupBy) => {
  const value = String(date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'ไม่ระบุวันที่';
  if (groupBy === 'year') return value.slice(0, 4);
  if (groupBy === 'day') return value;
  return value.slice(0, 7);
};
const sum = (items, getter) => items.reduce((total, item) => total + cents(getter(item)), 0);
const isCountableSale = (item) => item.orderStatus !== 'CANCELLED' && item.status !== 'REJECTED';

async function loadOrders(req, filters = {}) {
  const payload = await getSalesData(req, 'orders', filters);
  return rowsFrom(payload);
}

async function loadAppointments(req) {
  const payload = await getSalesData(req, 'appointments');
  return rowsFrom(payload);
}

async function loadBalances(req) {
  const result = await loadAllPages((params) => getPaymentData(req, 'order-balances', params));
  return result.items;
}

export async function salesSummary(req, { date_from, date_to, group_by = 'month' }) {
  const [ordersRaw, balancesRaw] = await Promise.all([loadOrders(req), loadBalances(req)]);
  const orders = ordersRaw.filter((item) => isCountableSale(item) && inDateRange(item.createdAt, date_from, date_to));
  const orderIds = new Set(orders.map((item) => item.id));
  const balances = balancesRaw.filter((item) => orderIds.has(item.orderId));
  const totalSales = sum(orders, (item) => item.totalAmount);
  const paidAmount = sum(balances, (item) => item.paidAmount);
  const refundedAmount = sum(balances, (item) => item.refundedAmount);
  const grouped = new Map();
  for (const order of orders) {
    const key = groupKey(order.createdAt, group_by);
    const current = grouped.get(key) || { period: key, orderCount: 0, totalSales: 0 };
    current.orderCount += 1;
    current.totalSales += cents(order.totalAmount);
    grouped.set(key, current);
  }
  return {
    totalSales: money(totalSales),
    orderCount: orders.length,
    paidAmount: money(paidAmount),
    refundedAmount: money(refundedAmount),
    currency: 'THB',
    groupBy: group_by,
    series: [...grouped.values()].sort((a, b) => a.period.localeCompare(b.period)).map((item) => ({
      ...item,
      totalSales: money(item.totalSales),
    })),
    // Sales service currently caps GET /orders at 500 and exposes no paging.
    // Flag the cap rather than pretending the aggregate is complete.
    sourceLimitReached: ordersRaw.length >= SALES_SOURCE_LIMIT,
    sourceLimit: SALES_SOURCE_LIMIT,
  };
}

// Sales caps GET /orders and /appointments at 500 rows without paging. Report
// the cap in the JSON body (a non-enumerable array property is lost by res.json)
// and measure it on the raw upstream rows, not on the date-filtered subset.
const SALES_SOURCE_LIMIT = 500;
const withSourceLimit = (items, sourceCount) => ({
  items,
  sourceLimitReached: sourceCount >= SALES_SOURCE_LIMIT,
  sourceLimit: SALES_SOURCE_LIMIT,
});

export async function salesBySeller(req, query = {}) {
  const ordersRaw = await loadOrders(req);
  const orders = ordersRaw.filter((item) => isCountableSale(item) && inDateRange(item.createdAt, query.date_from, query.date_to));
  const grouped = new Map();
  for (const order of orders) {
    const key = order.sellerId || order.sellerName || 'unknown';
    const current = grouped.get(key) || { sellerId: order.sellerId, sellerName: order.sellerName || 'ไม่ระบุ', orderCount: 0, totalSales: 0 };
    current.orderCount += 1;
    current.totalSales += cents(order.totalAmount);
    grouped.set(key, current);
  }
  return withSourceLimit(
    [...grouped.values()].sort((a, b) => b.totalSales - a.totalSales).map((item) => ({ ...item, totalSales: money(item.totalSales) })),
    ordersRaw.length,
  );
}

export async function salesByModel(req, query = {}) {
  const ordersRaw = await loadOrders(req);
  const orders = ordersRaw.filter((item) => isCountableSale(item) && inDateRange(item.createdAt, query.date_from, query.date_to));
  const grouped = new Map();
  for (const order of orders) {
    const key = order.carModel || 'ไม่ระบุรุ่นรถ';
    const current = grouped.get(key) || { carModel: key, orderCount: 0, totalSales: 0 };
    current.orderCount += 1;
    current.totalSales += cents(order.totalAmount);
    grouped.set(key, current);
  }
  return withSourceLimit(
    [...grouped.values()].sort((a, b) => b.totalSales - a.totalSales).map((item) => ({ ...item, totalSales: money(item.totalSales) })),
    ordersRaw.length,
  );
}

export async function inventoryReport(req) {
  const summaryPromise = getCatalogData(req, 'cars/stock-summary');
  const firstPage = await getCatalogData(req, 'cars', { page: 1, pageSize: 100, availability: 'all' });
  const models = rowsFrom(firstPage);
  const totalModels = Number(firstPage?.meta?.total ?? models.length);
  const totalPages = Math.min(1000, Math.ceil(totalModels / 100));
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await getCatalogData(req, 'cars', { page, pageSize: 100, availability: 'all' });
    models.push(...rowsFrom(next));
  }
  const summaryPayload = await summaryPromise;
  return {
    summary: summaryPayload?.data || null,
    totalModels,
    items: models.map((item) => ({
      id: item.uuid || item.id,
      brand: item.brand,
      model: item.name,
      stock: Number(item.stock || 0),
      stockStatus: item.stockStatus,
      price: item.price,
      currency: item.currency || 'THB',
    })),
    sourceLimitReached: models.length < totalModels,
  };
}

export async function appointmentsReport(req, query = {}) {
  const appointments = (await loadAppointments(req)).filter((item) => inDateRange(item.preferredDate || item.dueDate, query.date_from, query.date_to));
  const statusCounts = appointments.reduce((acc, item) => {
    const status = item.dbStatus || item.status || 'UNKNOWN';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return {
    total: appointments.length,
    statusCounts,
    items: appointments,
    sourceLimitReached: appointments.length >= 500,
    sourceLimit: 500,
  };
}

export async function financialReport(req, query = {}) {
  const sourceParams = {};
  if (query.date_from) sourceParams.dateFrom = query.date_from;
  if (query.date_to) sourceParams.dateTo = query.date_to;

  const [paymentsPage, refundsPage, invoicesPage, requestsPage] = await Promise.all([
    loadAllPages((params) => getPaymentData(req, 'payments', params), sourceParams),
    loadAllPages((params) => getPaymentData(req, 'refunds', params), sourceParams),
    loadAllPages((params) => getPaymentData(req, 'invoices', params)),
    loadAllPages((params) => getPaymentData(req, 'finance-requests', params)),
  ]);

  const payments = paymentsPage.items.filter((item) => inRangeBy(item, ['createdAt', 'paymentDate'], query.date_from, query.date_to));
  const refunds = refundsPage.items.filter((item) => inRangeBy(item, ['createdAt', 'reviewedAt'], query.date_from, query.date_to));
  const invoices = invoicesPage.items.filter((item) => inRangeBy(item, ['createdAt', 'issueDate'], query.date_from, query.date_to));
  const financeRequests = requestsPage.items.filter((item) => inRangeBy(item, ['createdAt'], query.date_from, query.date_to));

  const paidPayments = payments.filter((item) => item.status === 'SUCCESS');
  const successfulRefunds = refunds.filter((item) => item.status === 'REFUNDED');
  const openInvoices = invoices.filter((item) => item.status === 'ISSUED');
  const openFinanceRequests = financeRequests.filter((item) => item.status === 'OPEN');

  return {
    summary: {
      paymentCount: payments.length,
      successfulPaymentCount: paidPayments.length,
      paidAmount: money(sum(paidPayments, (item) => item.amount)),
      pendingPaymentCount: payments.filter((item) => item.status === 'PENDING').length,
      failedPaymentCount: payments.filter((item) => item.status === 'FAILED').length,
      refundCount: refunds.length,
      refundedAmount: money(sum(successfulRefunds, (item) => item.amount)),
      invoiceCount: invoices.length,
      invoiceAmount: money(sum(invoices.filter((item) => item.status !== 'CANCELLED'), (item) => item.amount)),
      outstandingInvoiceAmount: money(sum(openInvoices, (item) => item.amount)),
      openFinanceRequestCount: openFinanceRequests.length,
      currency: 'THB',
    },
    items: [
      ...payments.map((item) => ({ recordType: 'PAYMENT', id: item.id, amount: item.amount, status: item.status, paymentMethod: item.paymentMethod, createdAt: item.createdAt })),
      ...refunds.map((item) => ({ recordType: 'REFUND', id: item.id, amount: item.amount, status: item.status, createdAt: item.createdAt })),
      ...invoices.map((item) => ({ recordType: 'INVOICE', id: item.id, invoiceNumber: item.invoiceNumber, amount: item.amount, status: item.status, issueDate: item.issueDate })),
      ...financeRequests.map((item) => ({ recordType: 'FINANCE_REQUEST', id: item.id, topic: item.topic, status: item.status, createdAt: item.createdAt })),
    ],
    pagination: {
      paymentsTruncated: paymentsPage.truncated,
      refundsTruncated: refundsPage.truncated,
      invoicesTruncated: invoicesPage.truncated,
      financeRequestsTruncated: requestsPage.truncated,
    },
  };
}
