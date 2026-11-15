// ตัวช่วยอ่านข้อมูลจาก loadFinanceData() — ยอดเงินทั้งหมดคิดที่ backend แล้ว
// ที่นี่แค่จับคู่รายการและแปลงเป็นสตางค์เพื่อแสดงผล
import { dateInput, toSatang } from './format.js';

export const orderOf = (data, orderId) =>
  data.orders.find((o) => o.orderId === orderId);

/** ใบแจ้งหนี้ที่ยังไม่ยกเลิกของออเดอร์ (มีได้ใบเดียว) */
export const activeInvoice = (data, orderId) =>
  data.invoices.find((i) => i.orderId === orderId && i.status !== 'CANCELLED');

/** ISSUED ที่เลยวันครบกำหนดแสดงเป็น OVERDUE (คิดที่หน้าเว็บ) */
export function invoiceStatus(invoice) {
  if (
    invoice.status === 'ISSUED' &&
    invoice.dueDate &&
    invoice.dueDate < dateInput()
  )
    return 'OVERDUE';
  return invoice.status;
}

export const outstanding = (order) => toSatang(order.outstandingAmount);
export const netPaid = (order) =>
  toSatang(order.paidAmount) - toSatang(order.refundedAmount);

/** ชำระเพิ่มได้ไหม: อนุมัติแล้วและยังมียอดคงค้าง */
export const canPay = (order) =>
  order.orderStatus === 'CONFIRMED' && outstanding(order) > 0;

/** ออกบิลได้ไหม: อนุมัติแล้ว/ชำระแล้ว และยังไม่มีบิลที่ใช้งานอยู่ */
export const canInvoice = (data, order) =>
  ['CONFIRMED', 'PAID'].includes(order.orderStatus) &&
  !activeInvoice(data, order.orderId);

export function refundableSatang(data, payment) {
  const refunded = data.refunds
    .filter((r) => r.paymentId === payment.id && r.status === 'REFUNDED')
    .reduce((sum, r) => sum + toSatang(r.amount), 0);
  return toSatang(payment.amount) - refunded;
}

export const openRefund = (data, paymentId) =>
  data.refunds.find(
    (r) => r.paymentId === paymentId && r.status === 'REQUESTED',
  );

export const shortId = (id) => id.slice(0, 8).toUpperCase();

// สีใน catalog บางคันเก็บเป็นรหัส hex (#E8E8E4) ซึ่งอ่านไม่รู้เรื่อง จึงไม่แสดง
export const carLabel = (order) =>
  [
    order.car.name,
    /^#[0-9a-f]{3,8}$/i.test(order.car.color ?? '') ? null : order.car.color,
    order.car.year,
  ]
    .filter(Boolean)
    .join(' ');
