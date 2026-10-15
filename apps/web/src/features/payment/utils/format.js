const thb = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
});
const tz = 'Asia/Bangkok';

export const baht = (satang) => thb.format(satang / 100);
export const money = (amount) => thb.format(Number(amount));
export const thDate = (iso) =>
  new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: tz,
  });
export const thDateTime = (iso) =>
  new Date(iso).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: tz,
  });
// ค่า yyyy-mm-dd สำหรับ <input type="date"> ตามเวลาไทย
export const dateInput = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 864e5).toLocaleDateString('sv-SE', {
    timeZone: tz,
  });

// enum ของ API → ข้อความไทย + โทนสีของ .s-pill
export const statusLabels = {
  payment: {
    pending: ['รอตรวจสอบ', 'warn'],
    confirmed: ['ชำระแล้ว', 'good'],
    failed: ['ไม่ผ่าน', 'bad'],
    refunded: ['คืนเงินแล้ว', 'info'],
  },
  invoice: {
    issued: ['รอชำระ', 'warn'],
    paid: ['ชำระครบ', 'good'],
    overdue: ['เกินกำหนด', 'bad'],
    void: ['ยกเลิกบิล', 'mute'],
  },
  refund: {
    requested: ['รอดำเนินการ', 'warn'],
    completed: ['คืนเงินแล้ว', 'good'],
    rejected: ['ไม่อนุมัติ', 'bad'],
  },
  order: {
    pending_approval: ['รออนุมัติ', 'warn'],
    approved: ['อนุมัติแล้ว', 'good'],
    cancelled: ['ยกเลิก', 'bad'],
  },
  request: {
    open: ['รอการเงินตอบ', 'warn'],
    done: ['ตอบแล้ว', 'good'],
  },
};
