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

// ---------- ขั้นตอนการซื้อ (backend คิดให้ใน order.flow — services/payment/src/modules/payments/flow.js) ----------
// ซื้อผ่อน: 1 จ่ายเงินจอง → 2 รับใบจองไปยื่นไฟแนนซ์เอง → 3 กลับมาจ่ายเงินดาวน์เต็มจำนวน → 4 รับรถ
// ซื้อเงินสด: 1 เงินจอง → 2 ชำระส่วนที่เหลือ → 3 รับรถ
export const STEP_LABELS = {
  BOOKING_DEPOSIT: 'ชำระเงินจอง',
  FINANCE_APPLICATION: 'ยื่นไฟแนนซ์ด้วยใบจอง',
  DOWN_PAYMENT: 'ชำระเงินดาวน์',
  BALANCE: 'ชำระส่วนที่เหลือ',
  DELIVERY: 'รับรถ',
};

/** ออเดอร์ยังเดินขั้นตอนอยู่ (รวมรออนุมัติ และจ่ายครบแล้วรอรับรถ) */
export const inProgress = (order) =>
  Boolean(order.flow) && !order.flow.completed && !order.flow.cancelled;

/**
 * ยอดถัดไปที่ "ลูกค้า" จ่ายเองได้ หรือ null ถ้าไม่มี (รออนุมัติ / รอตรวจยอด / รอไฟแนนซ์ / รอรับรถ)
 * ซื้อผ่อน: ขั้น 1 เงินจอง, ขั้น 2–3 เงินดาวน์ (ยอดตายตัว) · ซื้อเงินสด: เงินจองหรือชำระยอด
 */
export function customerNextPayment(order) {
  const flow = order.flow;
  if (!flow || order.orderStatus !== 'CONFIRMED') return null;
  if (flow.plan === 'CASH') {
    if (outstanding(order) <= 0) return null;
    return toSatang(order.paidAmount) + toSatang(order.pendingAmount) === 0
      ? 'BOOKING_DEPOSIT'
      : 'BALANCE';
  }
  if (flow.bookingDeposit.status === 'NOT_PAID') return 'BOOKING_DEPOSIT';
  if (flow.bookingDeposit.status !== 'PAID') return null;
  if (flow.downPayment.status === 'NOT_PAID') return 'DOWN_PAYMENT';
  return null;
}

/**
 * ฝ่ายการเงินรับเงินที่โชว์รูมได้แบบไหนบ้างตามขั้นตอน
 * types = ชนิดยอดเงินสดที่เลือกได้, finance = รับยอดจัดจากไฟแนนซ์ได้แล้วหรือยัง
 */
export function staffPaymentOptions(order) {
  const flow = order.flow;
  if (!flow || flow.plan === 'CASH')
    return { types: ['BOOKING_DEPOSIT', 'BALANCE'], finance: true };
  if (flow.bookingDeposit.status !== 'PAID')
    return { types: ['BOOKING_DEPOSIT'], finance: false };
  if (!['PAID', 'NOT_REQUIRED'].includes(flow.downPayment.status))
    return {
      types: flow.downPayment.status === 'NOT_PAID' ? ['DOWN_PAYMENT'] : [],
      finance: false,
    };
  return { types: ['BALANCE'], finance: true };
}

/** ข้อความสั้นบอกว่าตอนนี้รออะไรอยู่ */
export function flowWaitingText(order) {
  const flow = order.flow;
  if (!flow) return '';
  if (flow.currentStep === 0) return 'รอผู้จัดการอนุมัติ — อนุมัติแล้วจึงชำระเงินจองได้';
  if (flow.cancelled) return 'ออเดอร์ถูกยกเลิก';
  if (flow.completed) return 'รับรถแล้ว';
  if (flow.bookingDeposit.status === 'PENDING')
    return 'แจ้งโอนเงินจองแล้ว รอฝ่ายการเงินตรวจยอด';
  if (flow.plan === 'FINANCE') {
    if (flow.currentStep === 2)
      return 'ดาวน์โหลดใบจองไปยื่นขอสินเชื่อกับไฟแนนซ์ อนุมัติแล้วกลับมาชำระเงินดาวน์';
    if (flow.downPayment.status === 'PENDING')
      return 'แจ้งโอนเงินดาวน์แล้ว รอฝ่ายการเงินตรวจยอด';
    if (!flow.finance.received)
      return 'รอบริษัทไฟแนนซ์โอนยอดจัดให้ศูนย์ ' +
        Number(flow.finance.amount).toLocaleString('th-TH') + ' บาท';
  } else if (order.orderStatus === 'CONFIRMED') {
    return 'ชำระส่วนที่เหลือเมื่อรถพร้อมส่งมอบ';
  }
  return flow.car.ready
    ? 'ชำระครบแล้ว รอนัดส่งมอบรถ'
    : 'ชำระครบแล้ว รอรถผลิตเสร็จ/มาถึงศูนย์';
}

/** ออเดอร์ถูกยกเลิก (เช่น ผู้จัดการไม่อนุมัติ) แต่โชว์รูมยังถือเงินลูกค้าอยู่ → ต้องคืน */
export const needsRefund = (order) =>
  order.orderStatus === 'CANCELLED' && netPaid(order) > 0;

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
