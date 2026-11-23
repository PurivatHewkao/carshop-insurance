// Hire-purchase (เช่าซื้อ) estimate, the way Thai car finance quotes it:
// flat annual interest on the financed amount for the whole term, paid in equal
// monthly installments (rounded up to whole baht). Estimate only: real finance
// companies add fees, insurance and their own approval.
import { httpError } from '../../utils/httpError.js';
import { formatMoney, parseAmount } from '../../utils/money.js';

export const TERMS = [12, 24, 36, 48, 60, 72, 84];
const DEFAULT_RATE = 2.49; // % per year, flat (demo rate)
const MAX_PRICE = 100_000_000 * 100; // satang

function invalid(field, message, issue) {
  return httpError(400, 'VALIDATION_ERROR', message, [{ field, issue }]);
}

/** "25" / 25 -> 25 ; must be a number with at most 2 decimals inside [min, max]. */
function readPercent(value, field, { min, max, fallback }) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw invalid(field, field + ' is required', 'required');
  }
  const text = String(value).trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) {
    throw invalid(field, field + ' must be a number like "25" or "2.49"', 'not_number');
  }
  const number = Number(text);
  if (number < min || number > max) {
    throw invalid(field, field + ' must be between ' + min + ' and ' + max, 'out_of_range');
  }
  return number;
}

function readTerm(value) {
  const months = Number(value);
  if (!TERMS.includes(months)) {
    throw invalid('months', 'months must be one of ' + TERMS.join(', '), 'not_allowed');
  }
  return months;
}

/** All money in satang. */
export function installment({ price, downPercent, annualRate, months }) {
  const downPayment = Math.round((price * downPercent) / 100);
  const financed = price - downPayment;
  const interest = Math.round((financed * annualRate * months) / 1200);
  const monthly = Math.ceil((financed + interest) / months / 100) * 100;
  return {
    downPayment,
    financed,
    interest,
    monthly,
    totalPayable: downPayment + monthly * months,
  };
}

/** GET /financing/quote?price=&downPercent=&months=&annualRate= */
export function quote(queryString) {
  const price = parseAmount(queryString.price, 'price');
  if (price > MAX_PRICE) throw invalid('price', 'price is too high', 'too_high');
  const downPercent = readPercent(queryString.downPercent, 'downPercent', {
    min: 0,
    max: 90,
  });
  const months = readTerm(queryString.months);
  const annualRate = readPercent(queryString.annualRate, 'annualRate', {
    min: 0,
    max: 20,
    fallback: DEFAULT_RATE,
  });
  const result = installment({ price, downPercent, annualRate, months });
  return {
    price: formatMoney(price),
    downPercent,
    downPayment: formatMoney(result.downPayment),
    financedAmount: formatMoney(result.financed),
    annualRate,
    rateType: 'FLAT',
    months,
    totalInterest: formatMoney(result.interest),
    monthlyInstallment: formatMoney(result.monthly),
    totalPayable: formatMoney(result.totalPayable),
    // Same down payment and rate for every term, to compare in one table.
    terms: TERMS.map((term) => ({
      months: term,
      monthlyInstallment: formatMoney(
        installment({ price, downPercent, annualRate, months: term }).monthly,
      ),
    })),
    currency: 'THB',
    note: 'ประมาณการแบบดอกเบี้ยคงที่ (flat rate) ยังไม่รวมค่าธรรมเนียมและประกัน ขึ้นกับการอนุมัติของบริษัทไฟแนนซ์',
  };
}
