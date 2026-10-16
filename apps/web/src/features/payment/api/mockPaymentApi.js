// Mock ของ Payment service (ยังไม่มี backend) — ชื่อฟังก์ชันและรูปข้อมูลตามร่าง endpoint ใน docs
// JSON camelCase, ID เป็น string, เงินเป็น decimal string "1250000.00" + currency THB
// orders เป็น snapshot จำลองของ Sales (เฟียร์) — ของจริง Payment ต้องเรียก Sales API
// เก็บใน sessionStorage แบบเดียวกับ RequestsPage จึงสลับ role ในแท็บเดียวกันแล้วเห็นข้อมูลชุดเดียวกัน

const storageKey = 'toyoty-demo-payment';

export const DEMO_CUSTOMER_ID = 'cus-veera';
export const DEMO_SELLER_ID = 'seller01';
export const DEMO_MANAGER_NAME = 'ผู้จัดการสาขา';
export const DEMO_ADMIN_NAME = 'Admin การเงิน';

export const paymentMethods = {
  transfer: 'โอนเงินผ่านธนาคาร',
  card: 'บัตรเครดิต/เดบิต',
  cash: 'เงินสดที่โชว์รูม',
};

export const invoiceTitles = [
  'เงินจอง',
  'เงินดาวน์',
  'ชำระเต็มจำนวน',
  'ยอดคงเหลือ',
];

export const requestTopics = [
  'ตรวจสอบยอดโอน',
  'ขอใบเสร็จ/ใบกำกับภาษี',
  'ลูกค้ายกเลิก ขอคืนเงิน',
  'สอบถามยอดค้างชำระ',
  'อื่น ๆ',
];

const day = 24 * 60 * 60 * 1000;
const at = (offsetDays, hour = 10) => {
  const d = new Date(Date.now() + offsetDays * day);
  d.setUTCHours(hour - 7, 0, 0, 0);
  return d.toISOString();
};

function seed() {
  return {
    orders: [
      order(
        'ord-0001',
        'ORD-0001',
        'cus-veera',
        'คุณวีระ',
        'Corolla Cross',
        '889000.00',
        'approved',
        -6,
      ),
      order(
        'ord-0002',
        'ORD-0002',
        'cus-somchai',
        'คุณสมชาย',
        'Yaris Ativ',
        '569000.00',
        'pending_approval',
        -1,
      ),
      order(
        'ord-0003',
        'ORD-0003',
        'cus-somying',
        'คุณสมหญิง',
        'Fortuner',
        '1349000.00',
        'pending_approval',
        -1,
        'seller02',
      ),
      order(
        'ord-0004',
        'ORD-0004',
        'cus-veera',
        'คุณวีระ',
        'Yaris Cross',
        '799000.00',
        'cancelled',
        -30,
      ),
      order(
        'ord-0005',
        'ORD-0005',
        'cus-manee',
        'คุณมานี',
        'Camry',
        '1589000.00',
        'approved',
        -12,
      ),
      order(
        'ord-0006',
        'ORD-0006',
        'cus-piti',
        'คุณปิติ',
        'Hilux Revo',
        '549000.00',
        'approved',
        -4,
        'seller02',
      ),
      order(
        'ord-0007',
        'ORD-0007',
        'cus-chujai',
        'คุณชูใจ',
        'Yaris',
        '584000.00',
        'approved',
        -2,
      ),
    ],
    invoices: [
      invoice('inv-0001', 'INV-0001', 'ord-0001', 'เงินจอง', '20000.00', -6, 3),
      invoice(
        'inv-0002',
        'INV-0002',
        'ord-0004',
        'เงินจอง',
        '10000.00',
        -30,
        3,
      ),
      invoice(
        'inv-0003',
        'INV-0003',
        'ord-0005',
        'เงินจอง',
        '30000.00',
        -10,
        7,
      ),
      invoice(
        'inv-0004',
        'INV-0004',
        'ord-0006',
        'ชำระเต็มจำนวน',
        '549000.00',
        -4,
        7,
      ),
      invoice(
        'inv-0005',
        'INV-0005',
        'ord-0001',
        'เงินดาวน์',
        '177800.00',
        -1,
        6,
      ),
    ],
    payments: [
      payment(
        'pay-0001',
        'PAY-0001',
        'inv-0001',
        'ord-0001',
        '20000.00',
        'transfer',
        'KBANK-2569100701',
        'confirmed',
        -5,
      ),
      payment(
        'pay-0002',
        'PAY-0002',
        'inv-0002',
        'ord-0004',
        '10000.00',
        'card',
        'CARD-SIM-0002',
        'refunded',
        -29,
      ),
      payment(
        'pay-0003',
        'PAY-0003',
        'inv-0004',
        'ord-0006',
        '549000.00',
        'transfer',
        'SCB-2569101208',
        'pending',
        0,
      ),
    ],
    refunds: [
      {
        refundId: 'ref-0001',
        refundNumber: 'REF-0001',
        paymentId: 'pay-0002',
        amount: '10000.00',
        reason: 'ลูกค้ายกเลิกการจองก่อนออกรถ',
        status: 'completed',
        requestedAt: at(-21),
        processedAt: at(-20),
        processedBy: DEMO_ADMIN_NAME,
      },
    ],
    financeRequests: [
      {
        requestId: 'req-0001',
        orderId: 'ord-0006',
        sellerId: 'seller02',
        topic: 'ตรวจสอบยอดโอน',
        message: 'ลูกค้าแจ้งว่าโอนเต็มจำนวนแล้ว ฝากตรวจสอบด้วยครับ',
        status: 'open',
        reply: '',
        createdAt: at(0, 9),
      },
      {
        requestId: 'req-0002',
        orderId: 'ord-0005',
        sellerId: 'seller01',
        topic: 'สอบถามยอดค้างชำระ',
        message: 'ลูกค้าขอเลื่อนชำระเงินจองไปสิ้นเดือน ได้ไหมคะ',
        status: 'open',
        reply: '',
        createdAt: at(-2, 15),
      },
    ],
  };
  function order(
    orderId,
    orderNumber,
    customerId,
    customerName,
    car,
    totalAmount,
    status,
    offset,
    sellerId = 'seller01',
  ) {
    return {
      orderId,
      orderNumber,
      customerId,
      customerName,
      sellerId,
      car,
      totalAmount,
      currency: 'THB',
      status,
      createdAt: at(offset),
    };
  }
  function invoice(
    invoiceId,
    invoiceNumber,
    orderId,
    title,
    amount,
    offset,
    dueIn,
  ) {
    return {
      invoiceId,
      invoiceNumber,
      orderId,
      title,
      amount,
      currency: 'THB',
      status: 'issued',
      issueDate: at(offset),
      dueDate: at(offset + dueIn, 23),
      issuedBy: DEMO_MANAGER_NAME,
      note: '',
    };
  }
  function payment(
    paymentId,
    paymentNumber,
    invoiceId,
    orderId,
    amount,
    paymentMethod,
    transactionReference,
    status,
    offset,
  ) {
    return {
      paymentId,
      paymentNumber,
      invoiceId,
      orderId,
      amount,
      currency: 'THB',
      paymentMethod,
      transactionReference,
      status,
      idempotencyKey: paymentId,
      paidAt: at(offset, 11),
      confirmedAt: status === 'pending' ? null : at(offset, 14),
      confirmedBy:
        status === 'pending'
          ? null
          : paymentMethod === 'card'
            ? 'ระบบจำลอง gateway'
            : DEMO_ADMIN_NAME,
    };
  }
}

const keys = ['orders', 'invoices', 'payments', 'refunds', 'financeRequests'];
function load() {
  try {
    const data = JSON.parse(sessionStorage.getItem(storageKey));
    if (data && keys.every((key) => Array.isArray(data[key]))) return data;
  } catch {
    // sessionStorage ใช้ไม่ได้ ใช้ข้อมูลตั้งต้น
  }
  return seed();
}

let state = load();
const listeners = new Set();
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getSnapshot() {
  return state;
}
function commit(next) {
  state = { ...state, ...next };
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // เก็บถาวรไม่ได้ แต่ state ในหน้ายังอัปเดต
  }
  listeners.forEach((listener) => listener());
}
export function resetDemoData() {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
  state = seed();
  listeners.forEach((listener) => listener());
}

// ---------- เงิน: คิดเป็นสตางค์ (integer) กันทศนิยมเพี้ยน ----------
export const toSatang = (amount) => Math.round(Number(amount) * 100);
export const fromSatang = (satang) => (satang / 100).toFixed(2);

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function nextNumber(list, field, prefix) {
  const max = list.reduce(
    (m, item) => Math.max(m, Number(item[field].split('-').pop()) || 0),
    0,
  );
  return prefix + '-' + String(max + 1).padStart(4, '0');
}

// ---------- ค่าที่คำนวณ (ของจริงคำนวณฝั่ง server) ----------
export function refundedSatang(s, paymentId) {
  return s.refunds
    .filter((r) => r.paymentId === paymentId && r.status === 'completed')
    .reduce((sum, r) => sum + toSatang(r.amount), 0);
}
export function invoicePaidSatang(s, invoiceId) {
  return s.payments
    .filter(
      (p) =>
        p.invoiceId === invoiceId &&
        p.status !== 'pending' &&
        p.status !== 'failed',
    )
    .reduce(
      (sum, p) => sum + toSatang(p.amount) - refundedSatang(s, p.paymentId),
      0,
    );
}
export function invoicePendingSatang(s, invoiceId) {
  return s.payments
    .filter((p) => p.invoiceId === invoiceId && p.status === 'pending')
    .reduce((sum, p) => sum + toSatang(p.amount), 0);
}
// enum ตาม API Design: issued / paid / overdue / void
export function invoiceStatus(s, invoice) {
  if (invoice.status === 'void') return 'void';
  // ออเดอร์ถูกยกเลิก (Sales) → บิลไม่ต้องเก็บเงินต่อ
  const order = s.orders.find((o) => o.orderId === invoice.orderId);
  if (order?.status === 'cancelled') return 'void';
  if (invoicePaidSatang(s, invoice.invoiceId) >= toSatang(invoice.amount))
    return 'paid';
  if (new Date(invoice.dueDate) < new Date()) return 'overdue';
  return 'issued';
}
// ยอดที่ยืนยันรับแล้วในช่วง n วันล่าสุด
export function receivedSatang(s, days) {
  const since = Date.now() - days * day;
  return s.payments
    .filter((p) => p.status === 'confirmed' && new Date(p.confirmedAt) > since)
    .reduce((sum, p) => sum + toSatang(p.amount), 0);
}
export function orderSummary(s, orderId) {
  const order = s.orders.find((o) => o.orderId === orderId);
  const invoices = s.invoices.filter(
    (i) => i.orderId === orderId && i.status !== 'void',
  );
  const billed = invoices.reduce((sum, i) => sum + toSatang(i.amount), 0);
  const paid = invoices.reduce(
    (sum, i) => sum + invoicePaidSatang(s, i.invoiceId),
    0,
  );
  const total = toSatang(order.totalAmount);
  return {
    total,
    billed,
    paid,
    unbilled: total - billed,
    outstanding: total - paid,
  };
}

// ---------- endpoint จำลอง ----------

// POST /invoices (Manager ออกบิลส่งการเงิน)
export function createInvoice({ orderId, title, amount, dueDate, note }) {
  const order = state.orders.find((o) => o.orderId === orderId);
  if (!order) throw new ApiError('NOT_FOUND', 'ไม่พบออเดอร์');
  if (order.status !== 'approved')
    throw new ApiError(
      'ORDER_NOT_APPROVED',
      'ออเดอร์ต้องได้รับอนุมัติก่อนออกบิล',
    );
  const satang = toSatang(amount);
  if (!(satang > 0))
    throw new ApiError('VALIDATION_ERROR', 'ยอดเงินต้องมากกว่า 0');
  if (satang > orderSummary(state, orderId).unbilled)
    throw new ApiError(
      'VALIDATION_ERROR',
      'ยอดเกินยอดที่ยังไม่ได้ออกบิลของออเดอร์นี้',
    );
  if (!dueDate) throw new ApiError('VALIDATION_ERROR', 'กรุณาระบุวันครบกำหนด');
  const invoice = {
    invoiceId: crypto.randomUUID(),
    invoiceNumber: nextNumber(state.invoices, 'invoiceNumber', 'INV'),
    orderId,
    title,
    amount: fromSatang(satang),
    currency: 'THB',
    status: 'issued',
    issueDate: new Date().toISOString(),
    dueDate: new Date(dueDate + 'T23:00:00+07:00').toISOString(),
    issuedBy: DEMO_MANAGER_NAME,
    note: note.trim(),
  };
  commit({ invoices: [invoice, ...state.invoices] });
  return invoice;
}

// PATCH /invoices/{id} status=void (Admin)
export function voidInvoice(invoiceId) {
  const invoice = state.invoices.find((i) => i.invoiceId === invoiceId);
  if (
    invoicePaidSatang(state, invoiceId) > 0 ||
    invoicePendingSatang(state, invoiceId) > 0
  )
    throw new ApiError(
      'CONFLICT',
      'บิลที่มีการชำระแล้วหรือรอตรวจสอบ ยกเลิกไม่ได้',
    );
  commit({
    invoices: state.invoices.map((i) =>
      i.invoiceId === invoice.invoiceId ? { ...i, status: 'void' } : i,
    ),
  });
  return invoice;
}

// POST /payments + header Idempotency-Key (Customer ชำระ / Admin บันทึกรับเงินสด)
export function createPayment(
  { invoiceId, amount, paymentMethod, transactionReference = '' },
  idempotencyKey,
  actor,
) {
  const replay = state.payments.find(
    (p) => p.idempotencyKey === idempotencyKey,
  );
  if (replay) return replay;
  const invoice = state.invoices.find((i) => i.invoiceId === invoiceId);
  if (!invoice || invoice.status === 'void')
    throw new ApiError('NOT_FOUND', 'ไม่พบใบแจ้งหนี้');
  const satang = toSatang(amount);
  const remaining =
    toSatang(invoice.amount) -
    invoicePaidSatang(state, invoiceId) -
    invoicePendingSatang(state, invoiceId);
  if (!(satang > 0))
    throw new ApiError('VALIDATION_ERROR', 'ยอดเงินต้องมากกว่า 0');
  if (satang > remaining)
    throw new ApiError('VALIDATION_ERROR', 'ยอดเกินยอดค้างชำระของใบแจ้งหนี้');
  if (paymentMethod === 'transfer' && !transactionReference.trim())
    throw new ApiError('VALIDATION_ERROR', 'กรุณากรอกเลขอ้างอิงการโอน');
  // บัตร: จำลอง gateway อนุมัติทันที · เงินสด: Admin รับเงินเอง · โอน: รอ Admin ตรวจยอด
  const instant = paymentMethod !== 'transfer';
  const now = new Date().toISOString();
  const payment = {
    paymentId: crypto.randomUUID(),
    paymentNumber: nextNumber(state.payments, 'paymentNumber', 'PAY'),
    invoiceId,
    orderId: invoice.orderId,
    amount: fromSatang(satang),
    currency: 'THB',
    paymentMethod,
    transactionReference:
      transactionReference.trim() ||
      (paymentMethod === 'card'
        ? 'CARD-SIM-' + Date.now().toString().slice(-6)
        : 'CASH-' + Date.now().toString().slice(-6)),
    status: instant ? 'confirmed' : 'pending',
    idempotencyKey,
    paidAt: now,
    confirmedAt: instant ? now : null,
    confirmedBy: instant
      ? paymentMethod === 'card'
        ? 'ระบบจำลอง gateway'
        : actor
      : null,
  };
  commit({ payments: [payment, ...state.payments] });
  return payment;
}

// PATCH /payments/{id} status=confirmed|failed (Admin)
export function reviewPayment(paymentId, status) {
  const payment = state.payments.find((p) => p.paymentId === paymentId);
  if (!payment || payment.status !== 'pending')
    throw new ApiError('CONFLICT', 'รายการนี้ถูกตรวจสอบไปแล้ว');
  commit({
    payments: state.payments.map((p) =>
      p.paymentId === paymentId
        ? {
            ...p,
            status,
            confirmedAt: new Date().toISOString(),
            confirmedBy: DEMO_ADMIN_NAME,
          }
        : p,
    ),
  });
  return payment;
}

// POST /refunds (Admin) — ทำรายการเสร็จทันทีในโหมดจำลอง
export function createRefund({ paymentId, amount, reason }) {
  const payment = state.payments.find((p) => p.paymentId === paymentId);
  if (!payment || payment.status !== 'confirmed')
    throw new ApiError('CONFLICT', 'คืนเงินได้เฉพาะรายการที่ยืนยันแล้ว');
  const satang = toSatang(amount);
  const refundable =
    toSatang(payment.amount) - refundedSatang(state, paymentId);
  if (!(satang > 0))
    throw new ApiError('VALIDATION_ERROR', 'ยอดคืนต้องมากกว่า 0');
  if (satang > refundable)
    throw new ApiError('VALIDATION_ERROR', 'ยอดคืนเกินยอดที่ชำระมา');
  if (!reason.trim()) throw new ApiError('VALIDATION_ERROR', 'กรุณาระบุเหตุผล');
  const now = new Date().toISOString();
  const refund = {
    refundId: crypto.randomUUID(),
    refundNumber: nextNumber(state.refunds, 'refundNumber', 'REF'),
    paymentId,
    amount: fromSatang(satang),
    reason: reason.trim(),
    status: 'completed',
    requestedAt: now,
    processedAt: now,
    processedBy: DEMO_ADMIN_NAME,
  };
  commit({
    refunds: [refund, ...state.refunds],
    payments: state.payments.map((p) =>
      p.paymentId === paymentId && satang === refundable
        ? { ...p, status: 'refunded' }
        : p,
    ),
  });
  return refund;
}

// คำขอจาก Seller ถึงฝ่ายการเงิน (Admin)
export function createFinanceRequest({ orderId, topic, message }) {
  if (!message.trim())
    throw new ApiError('VALIDATION_ERROR', 'กรุณาพิมพ์ข้อความ');
  const request = {
    requestId: crypto.randomUUID(),
    orderId,
    sellerId: DEMO_SELLER_ID,
    topic,
    message: message.trim(),
    status: 'open',
    reply: '',
    createdAt: new Date().toISOString(),
  };
  commit({ financeRequests: [request, ...state.financeRequests] });
  return request;
}
export function replyFinanceRequest(requestId, reply) {
  if (!reply.trim()) throw new ApiError('VALIDATION_ERROR', 'กรุณาพิมพ์คำตอบ');
  commit({
    financeRequests: state.financeRequests.map((r) =>
      r.requestId === requestId
        ? {
            ...r,
            reply: reply.trim(),
            status: 'done',
            repliedAt: new Date().toISOString(),
          }
        : r,
    ),
  });
  return requestId;
}
