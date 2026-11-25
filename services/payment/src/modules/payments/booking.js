// GET /orders/{orderId}/booking-document — ใบจองรถยนต์ (A4 PDF), step 2 of the purchase
// flow: the customer takes it to a finance company to apply for the loan.
// Available after the manager approved the order and the booking deposit was received.
// Same visibility as the order: customer own orders, seller orders they sold, staff all.
// Number = BK-<Bangkok date of the deposit>-<first 6 hex of the order id>.
import PDFDocument from 'pdfkit';
import { query } from '../../db/transaction.js';
import {
  carDescription,
  findInvoiceContext,
  findOrder,
  findOrderLines,
} from '../../clients/orders.js';
import { assertOrderAccess } from '../../middleware/auth.js';
import { httpError } from '../../utils/httpError.js';
import { bahtText, toSatang, VAT_RATE_PERCENT } from '../../utils/money.js';
import { baht, BOLD, METHOD, REGULAR, thaiDate } from '../invoices/pdf.js';
import { loadFlow } from './flow.js';

const bangkokDay = (value) =>
  new Date(new Date(value).getTime() + 7 * 3600 * 1000)
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');

async function loadBooking(actor, orderId) {
  const pool = { query };
  const order = await findOrder(pool, orderId);
  assertOrderAccess(actor, order, () =>
    httpError(404, 'ORDER_NOT_FOUND', 'Order not found'),
  );
  const flow = await loadFlow(pool, order);
  if (!flow.bookingDocumentAvailable) {
    throw httpError(
      409,
      'BOOKING_DOCUMENT_NOT_AVAILABLE',
      'The booking document is issued after the manager approved the order and the booking deposit was received',
    );
  }
  const [[deposit]] = await query(
    `SELECT id, amount, payment_method, payment_date, created_at, transaction_reference
     FROM payments WHERE order_id = ? AND payment_type = 'BOOKING_DEPOSIT' AND status = 'SUCCESS'
     ORDER BY created_at LIMIT 1`,
    [orderId],
  );
  return {
    order,
    flow,
    deposit,
    context: await findInvoiceContext(pool, orderId, null),
    lines: await findOrderLines(pool, orderId),
  };
}

/** Builds the PDF in memory and returns { fileName, buffer }. */
export async function renderBookingPdf(actor, orderId) {
  const { order, flow, deposit, context, lines } = await loadBooking(
    actor,
    orderId,
  );
  const number =
    'BK-' +
    bangkokDay(deposit.payment_date || deposit.created_at) +
    '-' +
    order.id.slice(0, 6).toUpperCase();
  const financed = flow.plan === 'FINANCE';

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: 'ใบจองรถยนต์ ' + number, Author: 'ศูนย์รถโตโยตี้ (CarShop)' },
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
    .text('ใบจองรถยนต์', left, 46, { width, align: 'right' });
  doc
    .font('th')
    .fontSize(10)
    .fillColor(muted)
    .text('BOOKING CONFIRMATION', left, 74, { width, align: 'right' });
  line(100);

  // Facts (right) and buyer (left)
  const facts = [
    ['เลขที่ใบจอง', number],
    ['วันที่จอง', thaiDate(deposit.payment_date || deposit.created_at)],
    ['เลขที่ออเดอร์', 'ORD-' + order.id.slice(0, 8).toUpperCase()],
    ['สถานะ', 'ผู้จัดการอนุมัติแล้ว'],
  ];
  let y = 114;
  for (const [label, value] of facts) {
    pair(label, value, 330, y, 420, right - 420);
    y += 18;
  }
  doc.font('th-bold').fontSize(11).fillColor(ink).text('ผู้จอง', left, 114);
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

  // Car
  y = Math.max(y, 190) + 12;
  doc.font('th-bold').fontSize(11).fillColor(ink).text('รถที่จอง', left, y);
  y += 18;
  doc
    .font('th')
    .fontSize(11)
    .fillColor(ink)
    .text(carDescription(context), left, y, { width });
  y += 18;
  const production = flow.carReady
    ? 'รถพร้อมส่งมอบ'
    : 'รถสั่งผลิต — ดูกำหนดรับรถในระบบ (แจ้งเป็นช่วงวัน)';
  doc
    .fontSize(9)
    .fillColor(muted)
    .text(
      (context?.vin ? 'เลขตัวถัง ' + context.vin + '  ·  ' : '') + production,
      left,
      y,
      { width },
    );
  y += 24;

  // Price and money table
  doc.rect(left, y, width, 24).fill('#f3f4f6');
  doc.font('th-bold').fontSize(10).fillColor(ink);
  doc.text('รายการ', left + 10, y + 6);
  doc.text('จำนวนเงิน (บาท)', 400, y + 6, { width: right - 410, align: 'right' });
  y += 32;
  const rows = [
    ['ราคารถ + ประกัน', baht(toSatang(lines?.subtotal ?? order.total_amount))],
    ...(lines && toSatang(lines.discount) > 0
      ? [['ส่วนลด', '−' + baht(toSatang(lines.discount))]]
      : []),
    ['ราคาสุทธิ (รวม VAT ' + VAT_RATE_PERCENT + '%)', baht(toSatang(order.total_amount)), true],
    [
      'เงินจองที่ชำระแล้ว (' +
        (METHOD[deposit.payment_method] || deposit.payment_method) +
        ' · ' +
        (deposit.transaction_reference || '-') +
        ')',
      baht(toSatang(deposit.amount)),
    ],
  ];
  if (financed) {
    rows.push(
      ['เงินดาวน์ตามสัญญา', baht(flow.agreedDown)],
      ['เงินดาวน์ที่ต้องชำระเพิ่ม (หักเงินจองแล้ว)', baht(flow.downDue), true],
      ['ยอดจัดไฟแนนซ์ (ยอดที่ยื่นขอสินเชื่อ)', baht(flow.financeAmount), true],
    );
  } else {
    rows.push([
      'ยอดคงเหลือที่ต้องชำระ',
      baht(Math.max(0, toSatang(order.total_amount) - flow.depositPaid)),
      true,
    ]);
  }
  for (const [label, value, strong] of rows) {
    doc
      .font(strong ? 'th-bold' : 'th')
      .fontSize(10)
      .fillColor(ink)
      .text(label, left + 10, y, { width: 330 });
    doc.text(value, 400, y, { width: right - 410, align: 'right' });
    y += 20;
  }
  if (financed && flow.terms) {
    doc
      .font('th')
      .fontSize(9)
      .fillColor(muted)
      .text(
        'เงื่อนไขที่คุยกับพนักงานขาย: ผ่อน ' +
          flow.terms.installmentCount +
          ' งวด' +
          (flow.terms.installmentYears ? ' (' + flow.terms.installmentYears + ' ปี)' : '') +
          (flow.terms.interestRate != null
            ? ' · ดอกเบี้ยประมาณ ' + flow.terms.interestRate + '% ต่อปี'
            : '') +
          ' — อัตราจริงขึ้นกับบริษัทไฟแนนซ์ที่อนุมัติ',
        left + 10,
        y,
        { width: width - 20 },
      );
    y += 18;
  }
  line(y + 4);
  y += 14;

  // Next steps
  const steps = financed
    ? [
        'นำใบจองนี้พร้อมบัตรประชาชน ทะเบียนบ้าน และเอกสารรายได้ ไปยื่นขอสินเชื่อกับบริษัทไฟแนนซ์ที่ต้องการ (ลูกค้าติดต่อเอง)',
        'เมื่อไฟแนนซ์อนุมัติ กลับมาชำระเงินดาวน์ ' +
          baht(flow.downDue) +
          ' บาท (' +
          bahtText(flow.downDue) +
          ') เต็มจำนวนในครั้งเดียว พร้อมแจ้งชื่อบริษัทไฟแนนซ์',
        'บริษัทไฟแนนซ์โอนยอดจัด ' +
          baht(flow.financeAmount) +
          ' บาท ให้ศูนย์ เมื่อชำระครบและรถพร้อม ศูนย์นัดส่งมอบรถ',
      ]
    : [
        'ชำระยอดคงเหลือเมื่อรถพร้อมส่งมอบ',
        'เมื่อชำระครบ ศูนย์นัดส่งมอบรถ',
      ];
  doc.font('th-bold').fontSize(11).fillColor(ink).text('ขั้นตอนต่อไป', left, y);
  y += 20;
  steps.forEach((text, index) => {
    doc
      .font('th')
      .fontSize(10)
      .fillColor(ink)
      .text(index + 1 + '. ' + text, left + 10, y, { width: width - 20 });
    y = doc.y + 6;
  });

  // Signatures + footer
  const signY = Math.max(y + 30, doc.page.height - 220);
  const signWidth = 150;
  ['ผู้จอง', 'พนักงานขาย', 'ผู้จัดการ (อนุมัติ)'].forEach((label, index) => {
    const x = left + index * ((width - signWidth) / 2);
    doc
      .moveTo(x, signY + 30)
      .lineTo(x + signWidth, signY + 30)
      .lineWidth(0.7)
      .strokeColor('#9ca3af')
      .stroke();
    doc
      .font('th')
      .fontSize(10)
      .fillColor(muted)
      .text(label, x, signY + 36, { width: signWidth, align: 'center' });
  });
  const footY = doc.page.height - 130;
  line(footY);
  doc
    .font('th')
    .fontSize(9)
    .fillColor(muted)
    .text(
      'เงินจองหักเป็นส่วนหนึ่งของเงินดาวน์  ·  เอกสารนี้สร้างจากระบบ CarShop (งานวิชา CSI400) ใช้ประกอบการยื่นขอสินเชื่อ ไม่ใช่สัญญาซื้อขาย',
      left,
      footY + 8,
      { width },
    );

  doc.end();
  await done;
  return { fileName: number + '.pdf', buffer: Buffer.concat(chunks) };
}
