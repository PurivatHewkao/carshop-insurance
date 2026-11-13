const thb = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
});
const tz = 'Asia/Bangkok';

export const baht = (satang) => thb.format(satang / 100);
export const money = (amount) => thb.format(Number(amount));
export const thDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: tz,
      })
    : '–';
export const thDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: tz,
      })
    : '–';
// ค่า yyyy-mm-dd สำหรับ <input type="date"> ตามเวลาไทย
export const dateInput = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 864e5).toLocaleDateString('sv-SE', {
    timeZone: tz,
  });

// "1234.50" → 123450 (สตางค์) คำนวณเป็นจำนวนเต็มเพื่อไม่ให้ทศนิยมเพี้ยน
export const toSatang = (amount) => Math.round(Number(amount) * 100);
export const satangInput = (satang) => (Math.max(0, satang) / 100).toFixed(2);

export const paymentMethods = {
  BANK_TRANSFER: 'โอนเงิน',
  CREDIT_CARD: 'บัตรเครดิต (จำลอง)',
  CASH: 'เงินสด',
};

// enum ของ API → ข้อความไทย + โทนสีของ .s-pill
export const statusLabels = {
  payment: {
    PENDING: ['รอตรวจสอบ', 'warn'],
    SUCCESS: ['ชำระแล้ว', 'good'],
    FAILED: ['ไม่ผ่าน', 'bad'],
    REFUNDED: ['คืนเงินแล้ว', 'info'],
  },
  invoice: {
    ISSUED: ['รอชำระ', 'warn'],
    PAID: ['ชำระครบ', 'good'],
    OVERDUE: ['เกินกำหนด', 'bad'],
    CANCELLED: ['ยกเลิกบิล', 'mute'],
  },
  refund: {
    REQUESTED: ['รอดำเนินการ', 'warn'],
    REFUNDED: ['คืนเงินแล้ว', 'good'],
    REJECTED: ['ไม่อนุมัติ', 'bad'],
  },
  order: {
    PENDING: ['รออนุมัติ', 'warn'],
    CONFIRMED: ['อนุมัติแล้ว รอชำระ', 'info'],
    PAID: ['ชำระครบ', 'good'],
    COMPLETED: ['ส่งมอบแล้ว', 'good'],
    CANCELLED: ['ยกเลิก', 'bad'],
  },
  request: {
    OPEN: ['รอการเงินตอบ', 'warn'],
    DONE: ['ตอบแล้ว', 'good'],
  },
};
