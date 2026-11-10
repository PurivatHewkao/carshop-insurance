// Money is calculated in integer satang (BigInt) so no float rounding can leak
// into totals. MySQL DECIMAL(14,2) values arrive as strings ("1475000.00").
import { httpError } from './httpError.js';

const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

export function toSatang(value) {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !AMOUNT.test(text.trim())) {
    throw httpError(
      400,
      'INVALID_AMOUNT',
      'Amount must be a non-negative number with at most 2 decimals',
    );
  }
  const [baht, fraction = ''] = text.trim().split('.');
  return BigInt(baht) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function fromSatang(satang) {
  const value = BigInt(satang);
  const baht = value / 100n;
  const fraction = String(value % 100n).padStart(2, '0');
  return baht + '.' + fraction;
}

// Convert a DECIMAL string from MySQL into a JS number for the web UI.
export const toNumber = (value) => Number(value ?? 0);
