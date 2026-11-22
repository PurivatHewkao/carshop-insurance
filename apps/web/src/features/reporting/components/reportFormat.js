// Thai labels for status codes coming from Sales / Payment / Catalog.
export const STATUS_LABELS = {
  PENDING: 'รอดำเนินการ',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  ASSIGNED: 'มอบหมายแล้ว',
  CONFIRMED: 'ยืนยันแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'ปิดแล้ว',
  CANCELLED: 'ยกเลิก',
  PAID: 'ชำระแล้ว',
  SUCCESS: 'สำเร็จ',
  FAILED: 'ไม่สำเร็จ',
  ISSUED: 'ค้างชำระ',
  REFUNDED: 'คืนเงินแล้ว',
  OPEN: 'เปิดอยู่',
  DONE: 'เสร็จแล้ว',
  IN_STOCK: 'มีสต็อก',
  LOW_STOCK: 'ใกล้หมด',
  OUT_OF_STOCK: 'หมด',
  PAYMENT: 'รับชำระ',
  REFUND: 'คืนเงิน',
  INVOICE: 'ใบแจ้งหนี้',
  FINANCE_REQUEST: 'คำขอการเงิน',
};

export const statusText = (value) => STATUS_LABELS[value] || value;

export const formatDate = (value) => {
  if (!value) return '—';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T00:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? text : date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
};

// [key, label, type]; type: money | number | status | date | text (default)
export const REPORT_COLUMNS = {
  'sales-summary': [['period', 'ช่วงเวลา'], ['orderCount', 'จำนวนออเดอร์', 'number'], ['totalSales', 'ยอดขาย', 'money']],
  'sales-by-seller': [['sellerName', 'พนักงานขาย'], ['orderCount', 'จำนวนออเดอร์', 'number'], ['totalSales', 'ยอดขาย', 'money']],
  'sales-by-model': [['carModel', 'รุ่นรถ'], ['orderCount', 'จำนวนออเดอร์', 'number'], ['totalSales', 'ยอดขาย', 'money']],
  inventory: [['brand', 'ยี่ห้อ'], ['model', 'รุ่น'], ['stock', 'คงเหลือ (คัน)', 'number'], ['stockStatus', 'สถานะ', 'status'], ['price', 'ราคาเริ่มต้น', 'money']],
  appointments: [['code', 'รหัส'], ['customerName', 'ลูกค้า'], ['type', 'ประเภท'], ['carModel', 'รุ่นรถ'], ['dueDate', 'วันนัด'], ['assignedSeller', 'ผู้รับผิดชอบ'], ['dbStatus', 'สถานะ', 'status']],
  finance: [['recordType', 'ประเภท', 'status'], ['invoiceNumber', 'เลขที่'], ['amount', 'จำนวนเงิน', 'money'], ['paymentMethod', 'ช่องทาง'], ['status', 'สถานะ', 'status'], ['createdAt', 'วันที่', 'date']],
  orders: [['code', 'รหัสออเดอร์'], ['createdAt', 'วันที่', 'date'], ['customerName', 'ลูกค้า'], ['sellerName', 'พนักงานขาย'], ['carModel', 'รุ่นรถ'], ['totalAmount', 'ยอดรวม', 'money'], ['approvalStatus', 'การอนุมัติ', 'status'], ['orderStatus', 'สถานะออเดอร์', 'status']],
};
