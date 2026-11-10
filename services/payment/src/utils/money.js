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
