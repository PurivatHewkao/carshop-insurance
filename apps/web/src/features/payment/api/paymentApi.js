// เรียก Payment service จริง (services/payment) — ข้อมูลมาจาก MySQL carshop_sql
// backend กรองข้อมูลตาม role ของผู้ login เอง: ลูกค้าเห็นของตัวเอง, Seller เห็นออเดอร์ที่ตัวเองขาย,
// Manager/Admin/Finance เห็นทั้งหมด
import { paymentClient } from './client.js';

const LIST = { limit: 100 };

async function get(url, params, signal) {
  const { data } = await paymentClient.get(url, {
    params: { ...LIST, ...params },
    signal,
  });
  return data.data;
}

async function send(method, url, body, idempotencyKey) {
  const { data } = await paymentClient.request({
    method,
    url,
    data: body ?? {},
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  });
  return data.data;
}

/** โหลดทุกอย่างที่หน้าการเงินใช้ในครั้งเดียว */
export async function loadFinanceData(signal, { requests = false } = {}) {
  const [orders, payments, invoices, refunds, financeRequests] =
    await Promise.all([
      get('order-balances', {}, signal),
      get('payments', {}, signal),
      get('invoices', {}, signal),
      get('refunds', {}, signal),
      requests ? get('finance-requests', {}, signal) : [],
    ]);
  // loadedAt: เวลาที่โหลด ใช้คิด "30 วันล่าสุด" โดยไม่เรียก Date.now() ระหว่าง render
  return {
    orders,
    payments,
    invoices,
    refunds,
    financeRequests,
    loadedAt: Date.now(),
  };
}

export const createPayment = (orderId, body, idempotencyKey) =>
  send('post', `orders/${orderId}/payments`, body, idempotencyKey);
export const reviewPayment = (paymentId, status) =>
  send('patch', `payments/${paymentId}`, { status });

export const requestRefund = (paymentId, body, idempotencyKey) =>
  send('post', `payments/${paymentId}/refunds`, body, idempotencyKey);
export const approveRefund = (refundId, refundReference) =>
  send('post', `refunds/${refundId}/approve`, { refundReference });
export const rejectRefund = (refundId, reason) =>
  send('post', `refunds/${refundId}/reject`, { reason });

export const createInvoice = (orderId, dueDate) =>
  send('post', `orders/${orderId}/invoices`, dueDate ? { dueDate } : {});
export const cancelInvoice = (invoiceId) =>
  send('post', `invoices/${invoiceId}/cancel`);

export const createFinanceRequest = (body) =>
  send('post', 'finance-requests', body);
export const replyFinanceRequest = (requestId, reply) =>
  send('post', `finance-requests/${requestId}/reply`, { reply });

// รหัส error ของ backend → ข้อความไทย
const messages = {
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบก่อน',
  INVALID_TOKEN: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
  FORBIDDEN: 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้',
  FORBIDDEN_ORIGIN: 'เว็บนี้ไม่ได้รับอนุญาตให้เรียก Payment API',
  IDENTITY_UNAVAILABLE: 'ตรวจสอบการเข้าสู่ระบบไม่ได้ (Identity service ไม่ตอบ)',
  ORDER_NOT_FOUND: 'ไม่พบออเดอร์ หรือไม่ใช่ออเดอร์ของคุณ',
  ORDER_NOT_PAYABLE:
    'ออเดอร์นี้ยังชำระไม่ได้ (ต้องได้รับอนุมัติก่อน หรือชำระครบแล้ว)',
  ORDER_NOT_INVOICEABLE: 'ออกบิลได้เฉพาะออเดอร์ที่อนุมัติแล้ว',
  AMOUNT_EXCEEDS_BALANCE: 'ยอดเกินกว่ายอดคงค้าง',
  AMOUNT_EXCEEDS_REFUNDABLE: 'ยอดคืนเกินกว่ายอดที่คืนได้',
  DUPLICATE_REFERENCE: 'เลขอ้างอิงนี้ถูกใช้แล้ว',
  PAYMENT_METHOD_NOT_ALLOWED:
    'ลูกค้าชำระเงินสดผ่านเว็บไม่ได้ กรุณาชำระที่โชว์รูม',
  PAYMENT_ALREADY_REVIEWED: 'รายการนี้ถูกตรวจสอบไปแล้ว',
  PAYMENT_NOT_REFUNDABLE: 'คืนเงินได้เฉพาะรายการที่ชำระสำเร็จ',
  REFUND_ALREADY_REQUESTED: 'รายการนี้มีคำขอคืนเงินรอดำเนินการอยู่แล้ว',
  REFUND_ALREADY_REVIEWED: 'คำขอนี้ถูกดำเนินการไปแล้ว',
  INVOICE_EXISTS: 'ออเดอร์นี้มีใบแจ้งหนี้อยู่แล้ว (ยกเลิกใบเดิมก่อน)',
  INVOICE_NOT_CANCELLABLE: 'ยกเลิกได้เฉพาะใบแจ้งหนี้ที่ยังไม่ชำระ',
  EMPLOYEE_PROFILE_REQUIRED: 'บัญชีนี้ไม่มีข้อมูลพนักงาน',
  REQUEST_CLOSED: 'เรื่องนี้ตอบไปแล้ว',
  IDEMPOTENCY_KEY_REUSED: 'รายการนี้ถูกส่งไปแล้ว กรุณาปิดหน้าต่างแล้วลองใหม่',
};

export function paymentError(error) {
  const status = error?.response?.status;
  const body = error?.response?.data?.error;
  if (!error?.response)
    return 'เชื่อมต่อ Payment service ไม่ได้ (พอร์ต 3004) กรุณาตรวจว่าเปิด service แล้ว';
  if (body?.code && messages[body.code]) return messages[body.code];
  if (status === 401) return messages.UNAUTHORIZED;
  if (status === 403) return messages.FORBIDDEN;
  if (status >= 500) return 'Payment service ขัดข้อง กรุณาลองใหม่';
  return body?.message || 'ทำรายการไม่สำเร็จ';
}
