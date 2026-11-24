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
// Report dates are Bangkok calendar days. Date-only strings are used as is;
// timestamps are converted so 01:00 in Bangkok is not counted as yesterday (UTC).
const bangkokDay = (value) => {
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? text.slice(0, 10) : date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
};
const inDateRange = (value, from, to) => {
  if (!value) return !from && !to;
  const date = bangkokDay(value);
  return (!from || date >= from) && (!to || date <= to);
};
const groupKey = (date, groupBy) => {
  const value = date ? bangkokDay(date) : '';
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

// ---------------------------------------------------------------------------
// TOYOTY: รถสั่งผลิต 4 model × 3 trim (Catalog migration 07 ของกร)
// Catalog ที่ยังไม่ได้รัน migration ตอบ 404 ที่ /cars/inventory และ /cars/units
// รายงานจะถอยไปใช้แบบเดิม (นับตามยี่ห้อ/รุ่น) แทนการพัง
const isMissingEndpoint = (error) => error?.upstreamStatus === 404;

// ขั้นผลิตของกร (QUOTED) กับของดิว (WAITING) คือขั้นเดียวกัน: สั่งแล้วแต่ยังไม่จองคิว
const STEP_KEYS = {
  QUOTED: 'waiting',
  WAITING: 'waiting',
  SCHEDULED: 'scheduled',
  IN_PRODUCTION: 'inProduction',
  IN_TRANSIT: 'inTransit',
  READY: 'ready',
  DELIVERED: 'delivered',
};
const TRIM_ORDER = { ECO: 0, BALANCED: 1, HIGH_PERFORMANCE: 2 };
const COUNT_KEYS = ['showroom', 'inStock', 'waiting', 'scheduled', 'inProduction', 'inTransit', 'ready', 'delivered', 'open', 'delayed', 'cancelled'];

function productionSteps(production = {}) {
  const steps = { waiting: 0, scheduled: 0, inProduction: 0, inTransit: 0, ready: 0, delivered: 0 };
  for (const [step, count] of Object.entries(production || {})) {
    const key = STEP_KEYS[step];
    if (key) steps[key] += Number(count || 0);
  }
  return steps;
}

function stockRow(model, trim) {
  const source = trim || model;
  return {
    id: trim ? `${model.uuid || model.id}/${trim.code}` : `${model.uuid || model.id}/-`,
    brand: model.brand,
    model: model.name,
    trim: trim?.code || null,
    trimName: trim?.name || (trim ? trim.code : 'ไม่ระบุรุ่นย่อย'),
    price: trim?.price ?? null,
    showroom: Number(source.showroom || 0),
    inStock: Number(source.inStock || 0),
    ...productionSteps(source.production),
    open: Number(source.open || 0),
    delayed: Number(source.delayed || 0),
    cancelled: Number(source.cancelled || 0),
  };
}

/** สต็อก TOYOTY แยก model × trim + คิวผลิต จาก Catalog GET /cars/inventory */
function toyotyInventory(payload) {
  const models = Array.isArray(payload?.models) ? payload.models : [];
  const items = [];
  const queue = [];
  for (const model of models) {
    const trims = [...(model.trims || [])].sort((a, b) => (TRIM_ORDER[a.code] ?? 9) - (TRIM_ORDER[b.code] ?? 9));
    for (const trim of trims) items.push(stockRow(model, trim));
    // รถของ model ที่ยังไม่ผูก trim (เช่นรถสต็อกเดิม) = ยอดของ model ลบยอดของทุก trim
    const rest = stockRow(model, null);
    for (const trim of trims) {
      const counted = stockRow(model, trim);
      for (const key of COUNT_KEYS) rest[key] -= counted[key];
    }
    if (COUNT_KEYS.some((key) => rest[key] > 0)) items.push(rest);
    for (const week of model.queue || []) {
      const capacity = Number(week.capacity || 0);
      const booked = Number(week.booked || 0);
      queue.push({
        id: `${model.uuid || model.id}/${week.weekStart}`,
        model: `${model.brand} ${model.name}`.trim(),
        weekStart: week.weekStart,
        capacity,
        booked,
        free: Math.max(0, capacity - booked),
      });
    }
  }
  const totals = payload?.totals || {};
  const steps = productionSteps(totals.production);
  return {
    mode: 'toyoty',
    asOf: payload?.asOf || null,
    summary: {
      models: Number(totals.models ?? models.length),
      trims: Number(totals.trims ?? items.filter((item) => item.trim).length),
      showroom: Number(totals.showroom || 0),
      inStock: Number(totals.inStock || 0),
      open: Number(totals.open || 0),
      delayed: Number(totals.delayed || 0),
      cancelled: Number(totals.cancelled || 0),
      ...steps,
    },
    totalModels: models.length,
    items,
    queue,
    sourceLimitReached: false,
  };
}

export async function inventoryReport(req) {
  try {
    const payload = await getCatalogData(req, 'cars/inventory', { weeks: 8 });
    return toyotyInventory(payload?.data);
  } catch (error) {
    if (!isMissingEndpoint(error)) throw error;
  }
  return legacyInventoryReport(req);
}

/** อ่านรถสั่งผลิตทุกหน้าจาก Catalog GET /cars/units (สูงสุด 100 ต่อหน้า) */
async function loadUnits(req, params = {}) {
  const pageSize = 100;
  const first = await getCatalogData(req, 'cars/units', { ...params, page: 1, pageSize });
  const items = rowsFrom(first);
  const total = Number(first?.meta?.total ?? items.length);
  const pageCount = Math.min(1000, Math.ceil(total / pageSize));
  for (let page = 2; page <= pageCount; page += 1) {
    items.push(...rowsFrom(await getCatalogData(req, 'cars/units', { ...params, page, pageSize })));
  }
  return { items, total, truncated: items.length < total };
}

const notConfigured = (extra = {}) => ({
  available: false,
  message: 'Catalog ยังไม่มีข้อมูลรุ่นย่อย/คิวผลิต (ยังไม่ได้รัน migration 07_toyoty_configurator)',
  items: [],
  ...extra,
});

/** รถที่ขายได้จริง: ผูกกับ order ที่ยังไม่ยกเลิก และรถไม่ถูกยกเลิก (INACTIVE) */
const isSoldUnit = (unit) => Boolean(unit.orderId) && unit.status !== 'INACTIVE' && unit.orderStatus !== 'CANCELLED';

function groupUnits(units, keyOf, labelOf) {
  const grouped = new Map();
  for (const unit of units) {
    const key = keyOf(unit) ?? 'ไม่ระบุ';
    const current = grouped.get(key) || { key, label: labelOf(unit) || key, orderCount: 0, totalSales: 0 };
    current.orderCount += 1;
    current.totalSales += cents(unit.price);
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .sort((a, b) => b.orderCount - a.orderCount || b.totalSales - a.totalSales || String(a.label).localeCompare(String(b.label)))
    .map((item) => ({ ...item, totalSales: money(item.totalSales) }));
}

const wheelLabel = (unit) => unit.wheelName || (unit.wheelSizeInch ? `${unit.wheelSizeInch} นิ้ว` : unit.wheel);

/**
 * ยอดขายแยกตามสเปกที่ลูกค้าเลือก (model × trim × สี × ล้อ) + สรุปแยก trim / สี / ล้อ
 * ยอดเงิน = ราคารถตอนสั่ง (cars.price snapshot) ไม่รวมเบี้ยประกัน
 */
export async function salesByConfiguration(req, query = {}) {
  let result;
  try {
    result = await loadUnits(req, { state: 'all' });
  } catch (error) {
    if (isMissingEndpoint(error)) return notConfigured({ byTrim: [], byColor: [], byWheel: [] });
    throw error;
  }
  const units = result.items.filter((unit) => isSoldUnit(unit) && inDateRange(unit.createdAt, query.date_from, query.date_to));
  const combos = new Map();
  for (const unit of units) {
    const key = [unit.modelSlug || unit.model, unit.trim, unit.colorCode || unit.color, unit.wheel].join('|');
    const current = combos.get(key) || {
      id: key,
      model: unit.model,
      trim: unit.trim,
      trimName: unit.trimName || unit.trim,
      color: unit.color,
      wheel: wheelLabel(unit),
      orderCount: 0,
      totalSales: 0,
    };
    current.orderCount += 1;
    current.totalSales += cents(unit.price);
    combos.set(key, current);
  }
  return {
    available: true,
    orderCount: units.length,
    totalSales: money(sum(units, (unit) => unit.price)),
    currency: 'THB',
    items: [...combos.values()]
      .sort((a, b) => b.orderCount - a.orderCount || b.totalSales - a.totalSales)
      .map((item) => ({ ...item, totalSales: money(item.totalSales) })),
    byTrim: groupUnits(units, (unit) => unit.trim, (unit) => unit.trimName || unit.trim),
    byColor: groupUnits(units, (unit) => unit.colorCode || unit.color, (unit) => unit.color),
    byWheel: groupUnits(units, (unit) => unit.wheel, wheelLabel),
    sourceLimitReached: result.truncated,
  };
}

/** รถสั่งผลิตที่ล่าช้ากว่าช่วงวันคาดการณ์ (Catalog state=delayed) เรียงจากช้ามากสุด */
export async function productionDelays(req) {
  let result;
  try {
    result = await loadUnits(req, { state: 'delayed' });
  } catch (error) {
    if (isMissingEndpoint(error)) return notConfigured({ total: 0, cancellable: 0 });
    throw error;
  }
  const items = result.items
    .map((unit) => ({
      id: unit.id,
      orderId: unit.orderId || null,
      vin: unit.vin,
      model: unit.model,
      trim: unit.trim,
      trimName: unit.trimName || unit.trim,
      color: unit.color,
      wheel: wheelLabel(unit),
      productionStatus: unit.productionStatus,
      buildWeek: unit.buildWeek || null,
      etaFrom: unit.estimatedReady?.from || null,
      etaTo: unit.estimatedReady?.to || null,
      delayDays: Number(unit.delayDays || 0),
      canCancelForDelay: Boolean(unit.canCancelForDelay),
    }))
    .sort((a, b) => b.delayDays - a.delayDays || String(a.etaTo || '').localeCompare(String(b.etaTo || '')));
  return {
    available: true,
    total: items.length,
    // ล่าช้าเกิน 30 วัน: ลูกค้ายกเลิกและขอคืนเงินจองเต็มจำนวนได้
    cancellable: items.filter((item) => item.canCancelForDelay).length,
    items,
    sourceLimitReached: result.truncated,
  };
}

/** แบบเดิมก่อนมี TOYOTY: นับรถ AVAILABLE ต่อรุ่น (ใช้เมื่อ Catalog ยังไม่มี /cars/inventory) */
async function legacyInventoryReport(req) {
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
    mode: 'legacy',
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

// ---------------------------------------------------------------------------
// Order list for "ยอดขายและออเดอร์". Read-only view of Sales GET /orders.
export async function ordersReport(req, query = {}) {
  const ordersRaw = await loadOrders(req);
  const items = ordersRaw
    .filter((item) => inDateRange(item.createdAt, query.date_from, query.date_to))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((item) => ({
      id: item.id,
      code: item.code || item.id,
      createdAt: item.createdAt,
      customerName: item.customerName || null,
      sellerName: item.sellerName || null,
      carModel: item.carModel || null,
      totalAmount: money(cents(item.totalAmount)),
      approvalStatus: item.status || null,
      orderStatus: item.orderStatus || null,
    }));
  return withSourceLimit(items, ordersRaw.length);
}

// ---------------------------------------------------------------------------
// "ใครทำอะไรในระบบ" derived from records the source services already expose.
// Each source is optional: a service that is down or denies this role only
// removes its events and is reported in `sources`, the rest still render.
const ACTIVITY_LIMIT_DEFAULT = 200;

const settle = async (promise) => {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, status: error.status || 500 };
  }
};

export async function activityFeed(req, query = {}) {
  const [orders, appointments, payments, invoices, refunds, requests] = await Promise.all([
    settle(loadOrders(req)),
    settle(loadAppointments(req)),
    settle(loadAllPages((params) => getPaymentData(req, 'payments', params)).then((r) => r.items)),
    settle(loadAllPages((params) => getPaymentData(req, 'invoices', params)).then((r) => r.items)),
    settle(loadAllPages((params) => getPaymentData(req, 'refunds', params)).then((r) => r.items)),
    settle(loadAllPages((params) => getPaymentData(req, 'finance-requests', params)).then((r) => r.items)),
  ]);
  const rows = (result) => (result.ok && Array.isArray(result.value) ? result.value : []);

  // Resolve people from Sales rows: employees (seller ids) and customers.
  const names = new Map();
  const orderById = new Map();
  for (const order of rows(orders)) {
    orderById.set(order.id, order);
    if (order.sellerId && order.sellerName) names.set(order.sellerId, order.sellerName);
  }
  for (const item of rows(appointments)) {
    if (item.sellerId && item.assignedSeller) names.set(item.sellerId, item.assignedSeller);
  }
  const person = (id) => (id ? names.get(id) || id : null);
  const orderLabel = (orderId) => orderById.get(orderId)?.code || orderId || null;

  const events = [];
  const push = (event) => {
    if (event.occurredAt) events.push(event);
  };
  for (const order of rows(orders)) {
    push({ occurredAt: order.createdAt, service: 'sales', action: 'ORDER_CREATED', actor: order.sellerName || person(order.sellerId), actorRole: 'seller', entity: order.code, detail: [order.customerName, order.carModel, order.totalAmount != null ? `${money(cents(order.totalAmount))} THB` : null].filter(Boolean).join(' · '), status: order.status });
  }
  for (const item of rows(appointments)) {
    push({ occurredAt: item.createdAt, service: 'sales', action: 'APPOINTMENT_REQUESTED', actor: item.customerName || item.customerId, actorRole: 'customer', entity: item.code, detail: [item.type, item.carModel, item.dueDate, item.assignedSeller ? `ผู้รับผิดชอบ: ${item.assignedSeller}` : null].filter(Boolean).join(' · '), status: item.dbStatus || item.status });
  }
  for (const item of rows(payments)) {
    const order = orderById.get(item.orderId);
    push({ occurredAt: item.createdAt || item.paymentDate, service: 'payment', action: 'PAYMENT_RECORDED', actor: order?.customerName || null, actorRole: 'customer', entity: orderLabel(item.orderId), detail: [item.paymentMethod, item.amount != null ? `${money(cents(item.amount))} THB` : null].filter(Boolean).join(' · '), status: item.status });
  }
  for (const item of rows(invoices)) {
    push({ occurredAt: item.createdAt || item.issueDate, service: 'payment', action: 'INVOICE_ISSUED', actor: person(item.issuedBy), actorRole: 'manager', entity: item.invoiceNumber || orderLabel(item.orderId), detail: [orderLabel(item.orderId), item.amount != null ? `${money(cents(item.amount))} THB` : null].filter(Boolean).join(' · '), status: item.status });
  }
  for (const item of rows(refunds)) {
    push({ occurredAt: item.createdAt, service: 'payment', action: 'REFUND_REQUESTED', actor: person(item.requestedBy), actorRole: null, entity: orderLabel(item.orderId), detail: [item.reason, item.amount != null ? `${money(cents(item.amount))} THB` : null].filter(Boolean).join(' · '), status: item.status });
    if (item.reviewedAt) push({ occurredAt: item.reviewedAt, service: 'payment', action: 'REFUND_REVIEWED', actor: person(item.reviewedBy), actorRole: null, entity: orderLabel(item.orderId), detail: item.reviewNote || '', status: item.status });
  }
  for (const item of rows(requests)) {
    push({ occurredAt: item.createdAt, service: 'payment', action: 'FINANCE_REQUEST_CREATED', actor: person(item.createdBy), actorRole: 'seller', entity: orderLabel(item.orderId), detail: item.topic || '', status: item.status });
    if (item.repliedAt) push({ occurredAt: item.repliedAt, service: 'payment', action: 'FINANCE_REQUEST_REPLIED', actor: person(item.repliedBy), actorRole: 'finance', entity: orderLabel(item.orderId), detail: item.topic || '', status: item.status });
  }

  // Sales sends Bangkok date-only strings ("2026-11-20"); other sources send
  // timestamps. Filter on the Bangkok calendar day so a date never shifts.
  const normalize = (value) => {
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { day: text, occurredAt: `${text}T00:00:00+07:00`, dateOnly: true, sortKey: `${text}T00:00:00.000Z` };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const day = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
    return { day, occurredAt: date.toISOString(), dateOnly: false, sortKey: `${day}T${date.toLocaleTimeString('sv-SE', { timeZone: 'Asia/Bangkok' })}.000Z` };
  };
  const limit = Math.min(Math.max(Number(query.limit) || ACTIVITY_LIMIT_DEFAULT, 1), 500);
  const filtered = events
    .map((event) => {
      const time = normalize(event.occurredAt);
      return time && { ...event, ...time };
    })
    .filter((event) => event
      && (!query.service || event.service === query.service)
      && inDateRange(event.day, query.date_from, query.date_to))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map(({ sortKey: _sortKey, ...event }) => event);

  return {
    items: filtered.slice(0, limit).map((event, index) => ({ id: `${event.action}-${event.entity}-${event.occurredAt}-${index}`, ...event })),
    total: filtered.length,
    truncated: filtered.length > limit,
    sources: {
      orders: orders.ok ? 'ok' : `error ${orders.status}`,
      appointments: appointments.ok ? 'ok' : `error ${appointments.status}`,
      payments: payments.ok ? 'ok' : `error ${payments.status}`,
      invoices: invoices.ok ? 'ok' : `error ${invoices.status}`,
      refunds: refunds.ok ? 'ok' : `error ${refunds.status}`,
      financeRequests: requests.ok ? 'ok' : `error ${requests.status}`,
    },
    sourceLimitReached: rows(orders).length >= SALES_SOURCE_LIMIT || rows(appointments).length >= SALES_SOURCE_LIMIT,
  };
}
