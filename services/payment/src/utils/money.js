import { httpError } from './httpError.js';

// Money travels as decimal strings ("1250000.00") and is computed in satang
// (integer) so no float rounding happens. DECIMAL(14,2) fits in a safe integer.
const MONEY_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

/** Parse a client amount (string or number) into satang; must be > 0. */
export function parseAmount(value, field = 'amount') {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !MONEY_PATTERN.test(text.trim())) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      field +
        ' must be a decimal string with at most 2 decimals, e.g. "1500.00"',
      [{ field, issue: 'invalid_amount' }],
    );
  }
  const satang = toSatang(text.trim());
  if (satang <= 0) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      field + ' must be greater than 0',
      [{ field, issue: 'not_positive' }],
    );
  }
  return satang;
}

/** Convert a DECIMAL string from MySQL (or a validated client string) to satang. */
export function toSatang(decimal) {
  if (decimal === null || decimal === undefined) return 0;
  const text = String(decimal);
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.');
  const value = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return negative ? -value : value;
}

/** Satang -> "1234.50" */
export function formatMoney(satang) {
  const negative = satang < 0;
  const abs = Math.abs(satang);
  const text = Math.trunc(abs / 100) + '.' + String(abs % 100).padStart(2, '0');
  return negative ? '-' + text : text;
}

// Thai VAT is 7% and car prices are quoted VAT-inclusive.
export const VAT_RATE_PERCENT = 7;

/** VAT-inclusive satang -> { base, vat } with base + vat === total (base rounded half up). */
export function splitVat(totalSatang) {
  const base = Math.round((totalSatang * 100) / (100 + VAT_RATE_PERCENT));
  return { base, vat: totalSatang - base };
}

const DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** Reads 0..999999; `higher` = a non-zero digit stands before it (1 in the ones -> เอ็ด). */
function readGroup(n, higher) {
  const text = String(n);
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const d = Number(text[i]);
    const pos = text.length - 1 - i;
    if (d === 0) continue;
    if (pos === 1) out += (d === 1 ? '' : d === 2 ? 'ยี่' : DIGITS[d]) + 'สิบ';
    else if (pos === 0 && d === 1 && (higher || n > 9)) out += 'เอ็ด';
    else out += DIGITS[d] + UNITS[pos];
  }
  return out;
}

function readNumber(n) {
  if (n < 1_000_000) return readGroup(n, false);
  const millions = Math.floor(n / 1_000_000);
  return readNumber(millions) + 'ล้าน' + readGroup(n % 1_000_000, true);
}

/** satang -> Thai words like Excel BAHTTEXT: 150050 -> "หนึ่งพันห้าร้อยบาทห้าสิบสตางค์" */
export function bahtText(satang) {
  const baht = Math.trunc(satang / 100);
  const st = satang % 100;
  if (baht === 0 && st === 0) return 'ศูนย์บาทถ้วน';
  const head = baht ? readNumber(baht) + 'บาท' : '';
  return head + (st ? readGroup(st, false) + 'สตางค์' : 'ถ้วน');
}
