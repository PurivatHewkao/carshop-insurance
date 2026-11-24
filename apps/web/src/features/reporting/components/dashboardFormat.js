// ตัวช่วยจัดรูปแบบที่ Dashboard และไฟล์ Excel ใช้ร่วมกัน
export const number = (value) =>
  value == null || value === '' ? '—' : new Intl.NumberFormat('th-TH').format(Number(value));

export const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** ยอดเงินแบบสั้นสำหรับแกนกราฟ: 1.2 ล้าน, 850 พัน */
export function shortBaht(value) {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: abs >= 1e7 ? 0 : 1 }).format(value / 1e6)} ล้าน`;
  if (abs >= 1e3) return `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(value / 1e3)} พัน`;
  return number(value);
}

export const percent = (part, whole) =>
  whole > 0 ? `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 }).format((part / whole) * 100)}%` : '—';

/** เดือนปัจจุบันตามเวลาไทย เป็น YYYY-MM */
export const currentMonth = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 7);

/** 'YYYY-MM' → ย้อนหลัง/เดินหน้า n เดือน */
export function addMonths(period, n) {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + n, 1));
  return date.toISOString().slice(0, 7);
}

const monthDate = (period) => {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
};
/** 'พ.ย. 69' */
export const monthShort = (period) =>
  /^\d{4}-\d{2}$/.test(period) ? monthDate(period).toLocaleDateString('th-TH', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : period;
/** 'พฤศจิกายน 2569' */
export const monthLong = (period) =>
  /^\d{4}-\d{2}$/.test(period) ? monthDate(period).toLocaleDateString('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : period;

/**
 * เติมเดือนที่ไม่มีออเดอร์ให้เป็น 0 ตลอดช่วง `months` เดือนล่าสุด (ถึงเดือนนี้)
 * กราฟจึงมีจำนวนแท่งคงที่เสมอ ไม่ใช่แท่งเดียวเต็มกราฟตอนมีข้อมูลเดือนเดียว
 */
export function monthWindow(series = [], months = 6, end = currentMonth()) {
  const byPeriod = new Map(series.map((item) => [item.period, item]));
  return Array.from({ length: months }, (_, index) => {
    const period = addMonths(end, index - months + 1);
    const item = byPeriod.get(period);
    return { period, orderCount: toNumber(item?.orderCount), totalSales: toNumber(item?.totalSales) };
  });
}

const normalize = (text) => String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
/** ชื่อรุ่นจาก Sales (เช่น "TOYOTY Khon (ขาวมุก)") ตรงกับรุ่นใน Catalog หรือไม่ */
export function sameModel(carModel, ...names) {
  const haystack = ` ${normalize(String(carModel || '').replace(/[()·,]/g, ' '))} `;
  return names.filter(Boolean).some((name) => haystack.includes(` ${normalize(name)} `));
}
