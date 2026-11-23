// GET /payments/{id}/receipt — ใบเสร็จรับเงิน (A4 PDF) for one payment the showroom
// actually received (SUCCESS, or REFUNDED later: then stamped "คืนเงินแล้ว").
// Same visibility as GET /payments/{id}: customer own orders, seller orders they
// sold, staff everything; others get 404.
// Receipt number = RC-<Bangkok date of payment>-<first 6 hex of payment id>, so it
// is stable without another table.
import PDFDocument from 'pdfkit';
import { query } from '../../db/transaction.js';
import {
  carDescription,
  findInvoiceContext,
  findOrder,
} from '../../clients/orders.js';
import { orderScope } from '../../middleware/auth.js';
import { httpError } from '../../utils/httpError.js';
import {
  bahtText,
  splitVat,
  toSatang,
  VAT_RATE_PERCENT,
} from '../../utils/money.js';
import {
  baht,
  BOLD,
  METHOD,
  PAYMENT_TYPE,
  REGULAR,
  thaiDate,
} from '../invoices/pdf.js';
import { orderBalance } from './balance.js';

export function receiptNumber(payment) {
  const date = new Date(
    new Date(payment.payment_date || payment.created_at).getTime() +
      7 * 3600 * 1000,
  )
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');
  return 'RC-' + date + '-' + payment.id.slice(0, 6).toUpperCase();
}

async function loadReceipt(actor, paymentId) {
  const scope = orderScope(actor);
  const [rows] = await query(
    `SELECT id, order_id, amount, payment_method, payment_type, payment_date, status,
            transaction_reference, finance_company, created_at
     FROM payments WHERE id = ?` + (scope.sql ? ' AND ' + scope.sql : ''),
    [paymentId, ...scope.params],
  );
  if (!rows.length)
    throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
  const payment = rows[0];
  if (payment.status !== 'SUCCESS' && payment.status !== 'REFUNDED') {
    throw httpError(
      409,
      'RECEIPT_NOT_AVAILABLE',
      'A receipt exists only for received payments (current: ' +
        payment.status +
        ')',
    );
  }
  const pool = { query };
  const order = await findOrder(pool, payment.order_id);
  const context = await findInvoiceContext(pool, payment.order_id, null);
  const balance = order ? await orderBalance(pool, order) : null;
  const [invoices] = await query(
    "SELECT invoice_number FROM invoices WHERE order_id = ? AND status <> 'CANCELLED' ORDER BY created_at DESC LIMIT 1",
    [payment.order_id],
  );
  return {
    payment,
    order,
    context,
    balance,
    invoiceNumber: invoices[0]?.invoice_number || null,
  };
}

/** Builds the PDF in memory and returns { fileName, buffer }. */
export async function renderReceiptPdf(actor, paymentId) {
  const { payment, order, context, balance, invoiceNumber } = await loadReceipt(
    actor,
    paymentId,
  );
  const number = receiptNumber(payment);
  const amount = toSatang(payment.amount);
  const vat = splitVat(amount);
  const typeLabel = PAYMENT_TYPE[payment.payment_type] || 'ชำระยอด';

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: 'ใบเสร็จรับเงิน ' + number, Author: 'ศูนย์รถโตโยตี้ (CarShop)' },
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
  const green = '#047857';
  const line = (y) =>
    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .lineWidth(0.7)
      .strokeColor('#d1d5db')
      .stroke();
  const pair = (label, value, x, y, valueX, valueWidth) => {
    doc.font('th').fontSize(10).fillColor(muted).text(label, x, y);
    doc
      .font('th-bold')
      .fontSize(10)
      .fillColor(ink)
      .text(value, valueX, y, { width: valueWidth, align: 'right' });
  };

  // Header
  doc.font('th-bold').fontSize(22).fillColor(accent).text('ศูนย์รถโตโยตี้', left, 48);
  doc
    .font('th')
    .fontSize(10)
    .fillColor(muted)
    .text('ขาย · ซ่อม · อะไหล่  |  ระบบ CarShop', left, 78);
  doc
    .font('th-bold')
    .fontSize(20)
    .fillColor(ink)
    .text('ใบเสร็จรับเงิน', left, 46, { width, align: 'right' });
  doc
    .font('th')
    .fontSize(10)
    .fillColor(muted)
    .text('RECEIPT', left, 74, { width, align: 'right' });
  line(100);

  // Facts (right) and payer (left)
  const facts = [
    ['เลขที่', number],
    ['วันที่รับเงิน', thaiDate(payment.payment_date || payment.created_at)],
    ['เลขที่ออเดอร์', 'ORD-' + payment.order_id.slice(0, 8).toUpperCase()],
    ['อ้างอิงใบแจ้งหนี้', invoiceNumber || '-'],
  ];
  let y = 114;
  for (const [label, value] of facts) {
    pair(label, value, 330, y, 420, right - 420);
    y += 18;
  }
  doc.font('th-bold').fontSize(11).fillColor(ink).text('ได้รับเงินจาก', left, 114);
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

  // Item
  y = Math.max(y, 190) + 14;
  doc.rect(left, y, width, 24).fill('#f3f4f6');
  doc.font('th-bold').fontSize(10).fillColor(ink);
  doc.text('รายการ', left + 10, y + 6);
  doc.text('จำนวนเงิน (บาท)', 430, y + 6, { width: right - 440, align: 'right' });
  y += 32;
  const carName = carDescription(context);
  doc
    .font('th-bold')
    .fontSize(11)
    .fillColor(ink)
    .text(typeLabel, left + 10, y, { width: 360 });
  doc
    .font('th')
    .text(baht(amount), 430, y, { width: right - 440, align: 'right' });
  doc
    .fontSize(9)
    .fillColor(muted)
    .text(
      carName + (context ? '  ·  เลขตัวถัง ' + context.vin : ''),
      left + 10,
      y + 18,
      { width: 360 },
    );
  y += 44;
  line(y);

  // VAT and total
  y += 10;
  for (const [label, value] of [
    ['มูลค่าก่อน VAT', baht(vat.base)],
    ['VAT ' + VAT_RATE_PERCENT + '%', baht(vat.vat)],
  ]) {
    doc.font('th').fontSize(10).fillColor(muted).text(label, 330, y);
    doc.fillColor(ink).text(value, 430, y, { width: right - 440, align: 'right' });
    y += 18;
  }
  doc.rect(320, y + 2, right - 320, 28).fill('#ecfdf5');
  doc
    .font('th-bold')
    .fontSize(12)
    .fillColor(green)
    .text('รับเงินแล้ว', 330, y + 8)
    .text(baht(amount) + ' บาท', 400, y + 8, {
      width: right - 410,
      align: 'right',
    });
  doc
    .font('th')
    .fontSize(10)
    .fillColor(ink)
    .text('(' + bahtText(amount) + ')', left, y + 10, { width: 260 });
  y += 50;

  // How it was paid
  doc.font('th-bold').fontSize(11).fillColor(ink).text('ชำระโดย', left, y);
  y += 20;
  const how = [
    ['ช่องทาง', METHOD[payment.payment_method] || payment.payment_method],
    ...(payment.finance_company
      ? [['บริษัทไฟแนนซ์', payment.finance_company]]
      : []),
    [
      payment.payment_method === 'FINANCE' ? 'เลขที่สัญญา' : 'เลขอ้างอิง',
      payment.transaction_reference || '-',
    ],
  ];
  for (const [label, value] of how) {
    doc.font('th').fontSize(10).fillColor(muted).text(label, left, y);
    doc.fillColor(ink).text(value, left + 110, y, { width: 260 });
    y += 18;
  }

  // Order position after all payments so far
  if (order && balance) {
    y += 10;
    doc.font('th-bold').fontSize(11).fillColor(ink).text('สรุปยอดออเดอร์ ณ วันที่พิมพ์', left, y);
    y += 20;
    for (const [label, value] of [
      ['ยอดรวมออเดอร์ (รวม VAT)', baht(balance.total)],
      ['ชำระสุทธิแล้ว', baht(balance.netPaid)],
      [
        'คงค้าง',
        baht(
          order.status === 'PENDING' || order.status === 'CONFIRMED'
            ? balance.outstanding
            : 0,
        ),
      ],
    ]) {
      doc.font('th').fontSize(10).fillColor(muted).text(label, left, y);
      doc.fillColor(ink).text(value, left + 110, y, { width: 150, align: 'right' });
      y += 18;
    }
  }

  // Signature + footer
  const signY = Math.max(y + 30, doc.page.height - 210);
  doc
    .moveTo(right - 200, signY + 30)
    .lineTo(right, signY + 30)
    .lineWidth(0.7)
    .strokeColor('#9ca3af')
    .stroke();
  doc
    .font('th')
    .fontSize(10)
    .fillColor(muted)
    .text('ผู้รับเงิน (ฝ่ายการเงิน)', right - 200, signY + 36, {
      width: 200,
      align: 'center',
    });
  const footY = doc.page.height - 130;
  line(footY);
  doc
    .font('th')
    .fontSize(9)
    .fillColor(muted)
    .text(
      'ราคารวมภาษีมูลค่าเพิ่ม ' +
        VAT_RATE_PERCENT +
        '% แล้ว  ·  เอกสารนี้สร้างจากระบบ CarShop (งานวิชา CSI400) ไม่ใช่ใบกำกับภาษีเต็มรูป',
      left,
      footY + 8,
      { width },
    );

  if (payment.status === 'REFUNDED') {
    doc
      .save()
      .rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] })
      .font('th-bold')
      .fontSize(80)
      .fillColor(accent)
      .opacity(0.15)
      .text('คืนเงินแล้ว', 0, doc.page.height / 2 - 60, {
        width: doc.page.width,
        align: 'center',
      })
      .restore();
  }

  doc.end();
  await done;
  return { fileName: number + '.pdf', buffer: Buffer.concat(chunks) };
}
