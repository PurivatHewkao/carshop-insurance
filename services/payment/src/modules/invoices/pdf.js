// GET /invoices/{id}/pdf — A4 invoice rendered with pdfkit + Sarabun (Thai, OFL font
// in assets/fonts). Same visibility rule as GET /invoices/{id}: customers only their
// own orders, sellers orders they sold, staff everything; others get 404.
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { query } from '../../db/transaction.js';
import { findInvoiceContext, findOrderLines } from '../../clients/orders.js';
import { orderScope } from '../../middleware/auth.js';
import { httpError } from '../../utils/httpError.js';
import {
  formatMoney,
  splitVat,
  toSatang,
  VAT_RATE_PERCENT,
} from '../../utils/money.js';

const font = (name) =>
  fileURLToPath(new URL('../../../assets/fonts/' + name, import.meta.url));
export const REGULAR = font('Sarabun-Regular.ttf');
export const BOLD = font('Sarabun-Bold.ttf');

const MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];
export const METHOD = {
  CASH: 'เงินสด',
  BANK_TRANSFER: 'โอนเงิน',
  CREDIT_CARD: 'บัตรเครดิต',
  FINANCE: 'ไฟแนนซ์',
};
export const PAYMENT_TYPE = {
  BOOKING_DEPOSIT: 'เงินจอง',
  DOWN_PAYMENT: 'เงินดาวน์',
  BALANCE: 'ชำระยอด',
  FINANCE_DISBURSEMENT: 'ยอดจัดไฟแนนซ์',
};
const PAYMENT_STATUS = {
  PENDING: 'รอตรวจสอบ',
  SUCCESS: 'สำเร็จ',
  FAILED: 'ไม่สำเร็จ',
  REFUNDED: 'คืนเงินแล้ว',
};
const INVOICE_STATUS = {
  ISSUED: 'รอชำระ',
  PAID: 'ชำระแล้ว',
  CANCELLED: 'ยกเลิก',
};

/** Date / DATE string -> "17 พ.ย. 2569" (Bangkok time for DATETIME values). */
export function thaiDate(value) {
  if (!value) return '-';
  const date =
    value instanceof Date
      ? new Date(value.getTime() + 7 * 3600 * 1000)
      : new Date(String(value).slice(0, 10) + 'T00:00:00Z');
  return (
    date.getUTCDate() +
    ' ' +
    MONTHS[date.getUTCMonth()] +
    ' ' +
    (date.getUTCFullYear() + 543)
  );
}
// DATE columns already are UTC midnight (pool timezone 'Z'): do not shift them.
const dateOnly = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value;

/** satang -> "1,250,000.00" */
export function baht(satang) {
  const [whole, fraction] = formatMoney(satang).split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + fraction;
}

async function loadInvoice(actor, invoiceId) {
  const scope = orderScope(actor);
  const [rows] = await query(
    'SELECT id, order_id, issued_by, invoice_number, issue_date, due_date, amount, status FROM invoices WHERE id = ?' +
      (scope.sql ? ' AND ' + scope.sql : ''),
    [invoiceId, ...scope.params],
  );
  if (!rows.length)
    throw httpError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  const invoice = rows[0];
  const context = await findInvoiceContext(
    { query },
    invoice.order_id,
    invoice.issued_by,
  );
  const [payments] = await query(
    `SELECT payment_method, payment_type, finance_company, payment_date, created_at, status,
            transaction_reference, amount
     FROM payments WHERE order_id = ? AND status <> 'FAILED'
     ORDER BY COALESCE(payment_date, created_at), id`,
    [invoice.order_id],
  );
  const [[{ refunded }]] = await query(
    "SELECT COALESCE(SUM(amount), 0) AS refunded FROM refunds WHERE order_id = ? AND status = 'REFUNDED'",
    [invoice.order_id],
  );
  const lines = await findOrderLines({ query }, invoice.order_id);
  return { invoice, context, payments, lines, refunded: toSatang(refunded) };
}

/** Builds the PDF in memory and returns { fileName, buffer }. */
export async function renderInvoicePdf(actor, invoiceId) {
  const { invoice, context, payments, lines, refunded } = await loadInvoice(
    actor,
    invoiceId,
  );
  const total = toSatang(invoice.amount);
  const vat = splitVat(total);
  const premium = toSatang(lines?.insurance_premium);
  const discount = toSatang(lines?.discount);
  // Car line = order subtotal minus insurance; old/odd data falls back to the invoice total.
  const carPrice = lines ? toSatang(lines.subtotal) - premium : total;
  const paid = payments
    .filter((p) => p.status === 'SUCCESS' || p.status === 'REFUNDED')
    .reduce((sum, p) => sum + toSatang(p.amount), 0);
  const balance =
    invoice.status === 'CANCELLED' ? 0 : Math.max(0, total - (paid - refunded));

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: 'ใบแจ้งหนี้ ' + invoice.invoice_number,
      Author: 'ศูนย์รถโตโยตี้ (CarShop)',
    },
  });
  doc.registerFont('th', REGULAR);
  doc.registerFont('th-bold', BOLD);
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
  });

  const left = 50;
  const right = doc.page.width - 50;
  const width = right - left;
  const ink = '#1f2937';
  const muted = '#6b7280';
  const accent = '#b91c1c';
  const line = (y) =>
    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .lineWidth(0.7)
      .strokeColor('#d1d5db')
      .stroke();

  // Header
  doc
    .font('th-bold')
    .fontSize(22)
    .fillColor(accent)
    .text('ศูนย์รถโตโยตี้', left, 48);
  doc
    .font('th')
    .fontSize(10)
    .fillColor(muted)
    .text('ขาย · ซ่อม · อะไหล่  |  ระบบ CarShop', left, 78);
  doc
    .font('th-bold')
    .fontSize(20)
    .fillColor(ink)
    .text('ใบแจ้งหนี้', left, 46, { width, align: 'right' });
  doc
    .font('th')
    .fontSize(10)
    .fillColor(muted)
    .text('INVOICE', left, 74, { width, align: 'right' });
  line(100);

  // Invoice facts (right) and buyer (left)
  const facts = [
    ['เลขที่', invoice.invoice_number],
    ['วันที่ออก', thaiDate(dateOnly(invoice.issue_date))],
    ['ครบกำหนดชำระ', thaiDate(dateOnly(invoice.due_date))],
    ['เลขที่ออเดอร์', 'ORD-' + invoice.order_id.slice(0, 8).toUpperCase()],
    ['สถานะ', INVOICE_STATUS[invoice.status] || invoice.status],
  ];
  let y = 114;
  for (const [label, value] of facts) {
    doc.font('th').fontSize(10).fillColor(muted).text(label, 330, y);
    doc
      .font('th-bold')
      .fontSize(10)
      .fillColor(ink)
      .text(value, 420, y, { width: right - 420, align: 'right' });
    y += 18;
  }
  doc.font('th-bold').fontSize(11).fillColor(ink).text('ผู้ซื้อ', left, 114);
  doc
    .font('th')
    .fontSize(11)
    .text(context?.customer_name || '-', left, 132, { width: 260 })
    .fontSize(10)
    .fillColor(muted)
    .text(
      [context?.customer_phone, context?.customer_email]
        .filter(Boolean)
        .join('  ·  ') || '-',
      left,
      150,
      { width: 260 },
    )
    .text('พนักงานขาย: ' + (context?.seller_name || '-'), left, 168, {
      width: 260,
    });

  // Item table
  y = Math.max(y, 190) + 14;
  doc.rect(left, y, width, 24).fill('#f3f4f6');
  doc.font('th-bold').fontSize(10).fillColor(ink);
  doc.text('รายการ', left + 10, y + 6);
  doc.text('จำนวน', 380, y + 6, { width: 50, align: 'center' });
  doc.text('จำนวนเงิน (บาท)', 430, y + 6, {
    width: right - 440,
    align: 'right',
  });
  y += 32;
  const carName = context
    ? `${context.brand} ${context.model_name} ปี ${context.manufacture_year} สี ${context.color}`
    : 'รถยนต์ตามออเดอร์';
  doc
    .font('th')
    .fontSize(11)
    .fillColor(ink)
    .text(carName, left + 10, y, {
      width: 320,
    });
  doc.text('1', 380, y, { width: 50, align: 'center' });
  doc.text(baht(carPrice), 430, y, { width: right - 440, align: 'right' });
  if (context) {
    doc
      .fontSize(9)
      .fillColor(muted)
      .text(
        'เลขตัวถัง ' +
          context.vin +
          (context.license_plate
            ? '  ·  ทะเบียน ' + context.license_plate
            : ''),
        left + 10,
        y + 18,
        { width: 320 },
      );
  }
  y += 40;
  const extraLines = [];
  if (premium > 0) extraLines.push(['ประกันภัยรถยนต์', '1', baht(premium)]);
  if (discount > 0) extraLines.push(['ส่วนลด', '', '-' + baht(discount)]);
  for (const [label, qty, value] of extraLines) {
    doc.font('th').fontSize(11).fillColor(ink).text(label, left + 10, y, {
      width: 320,
    });
    doc.text(qty, 380, y, { width: 50, align: 'center' });
    doc.text(value, 430, y, { width: right - 440, align: 'right' });
    y += 22;
  }
  y += 4;
  line(y);

  // Totals (prices are VAT-inclusive; show the VAT inside the total)
  y += 10;
  const totals = [
    ['มูลค่าก่อน VAT', baht(vat.base)],
    ['VAT ' + VAT_RATE_PERCENT + '%', baht(vat.vat)],
    ['ยอดรวม (รวม VAT)', baht(total)],
    ['ชำระแล้ว', baht(paid)],
    ['คืนเงินแล้ว', baht(refunded)],
  ];
  for (const [label, value] of totals) {
    doc.font('th').fontSize(10).fillColor(muted).text(label, 330, y);
    doc
      .fillColor(ink)
      .text(value, 430, y, { width: right - 440, align: 'right' });
    y += 18;
  }
  doc.rect(320, y + 2, right - 320, 28).fill('#fef2f2');
  doc
    .font('th-bold')
    .fontSize(12)
    .fillColor(accent)
    .text('ยอดคงค้าง', 330, y + 8)
    .text(baht(balance) + ' บาท', 400, y + 8, {
      width: right - 410,
      align: 'right',
    });
  y += 50;

  // Payment history
  doc
    .font('th-bold')
    .fontSize(11)
    .fillColor(ink)
    .text('ประวัติการชำระ', left, y);
  y += 20;
  if (!payments.length) {
    doc
      .font('th')
      .fontSize(10)
      .fillColor(muted)
      .text('ยังไม่มีรายการชำระ', left, y);
    y += 18;
  }
  for (const p of payments) {
    doc.font('th').fontSize(10).fillColor(ink);
    doc.text(thaiDate(p.payment_date || p.created_at), left, y, { width: 90 });
    doc.text(PAYMENT_TYPE[p.payment_type] || p.payment_type || '-', 145, y, {
      width: 70,
    });
    const how = [
      METHOD[p.payment_method] || p.payment_method,
      p.finance_company,
      p.transaction_reference,
    ]
      .filter(Boolean)
      .join(' · ');
    doc
      .fontSize(9)
      .fillColor(muted)
      .text(how, 215, y + 1, { width: 148, height: 12, ellipsis: true });
    doc.fontSize(10);
    doc
      .fillColor(ink)
      .text(PAYMENT_STATUS[p.status] || p.status, 365, y, { width: 70 });
    doc.text(baht(toSatang(p.amount)), 430, y, {
      width: right - 440,
      align: 'right',
    });
    y += 18;
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 50;
    }
  }

  // Footer
  y = Math.max(y + 24, doc.page.height - 130);
  line(y);
  doc
    .font('th')
    .fontSize(9)
    .fillColor(muted)
    .text(
      'ออกโดย ' +
        (context?.issuer_name || '-') +
        '  ·  ราคารวมภาษีมูลค่าเพิ่ม ' +
        VAT_RATE_PERCENT +
        '% แล้ว  ·  เอกสารนี้สร้างจากระบบ CarShop (งานวิชา CSI400) ไม่ใช่ใบกำกับภาษีเต็มรูป',
      left,
      y + 8,
      { width },
    );

  if (invoice.status === 'CANCELLED') {
    doc
      .save()
      .rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] })
      .font('th-bold')
      .fontSize(90)
      .fillColor(accent)
      .opacity(0.15)
      .text('ยกเลิก', 0, doc.page.height / 2 - 60, {
        width: doc.page.width,
        align: 'center',
      })
      .restore();
  }

  doc.end();
  await done;
  return {
    fileName: invoice.invoice_number + '.pdf',
    buffer: Buffer.concat(chunks),
  };
}
