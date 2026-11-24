// ส่งออก Dashboard เป็นไฟล์ Excel (.xlsx) หลายชีต: ข้อมูลครบทุกคอลัมน์ ตัวเลขเป็นตัวเลขจริง (รวมผลได้ใน Excel)
import { STATUS_LABELS } from '../components/reportFormat.js';
import { monthLong, toNumber } from '../components/dashboardFormat.js';

const MONEY = '#,##0.00';
const COUNT = '#,##0';
const PERCENT = '0.0%';
const DATE_TIME = 'dd/mm/yyyy hh:mm';
const DATE_ONLY = 'dd/mm/yyyy';
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

const header = (text) => ({ value: text, fontWeight: 'bold', backgroundColor: '#E8E9EC' });
const text = (value) => (value == null || value === '' ? null : { value: String(value), type: String });
const status = (value) => text(value == null ? null : STATUS_LABELS[value] || value);
const money = (value) => (value == null || value === '' ? null : { value: toNumber(value), type: Number, format: MONEY });
const count = (value) => (value == null || value === '' ? null : { value: toNumber(value), type: Number, format: COUNT });
const share = (value) => ({ value, type: Number, format: PERCENT });

/** Excel ไม่มีโซนเวลา: เลื่อนเป็นเวลาไทยก่อนเขียน วันที่ล้วนใช้ตามที่ได้มา */
function date(value) {
  if (!value) return null;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { value: new Date(`${raw}T00:00:00Z`), type: Date, format: DATE_ONLY };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return text(raw);
  return { value: new Date(parsed.getTime() + BKK_OFFSET_MS), type: Date, format: DATE_TIME };
}

/** ชีตจากรายการ object: columns = [[หัวคอลัมน์, (row) => cell, width]] */
function sheet(name, rows, columns) {
  return {
    sheet: name,
    data: [columns.map(([label]) => header(label)), ...rows.map((row) => columns.map(([, cell]) => cell(row)))],
    columns: columns.map(([, , width = 16]) => ({ width })),
    stickyRowsCount: 1,
  };
}

export async function exportDashboardXlsx({ data, kpis, attention, generatedAt = new Date() }) {
  const sheets = [];
  const summary = data['sales-summary'];
  const byModel = data['sales-by-model']?.items || [];
  const totalSales = byModel.reduce((total, row) => total + toNumber(row.totalSales), 0);

  sheets.push(sheet('สรุป', [
    { topic: 'ส่งออกเมื่อ', value: date(generatedAt.toISOString()), note: 'เวลาไทย' },
    ...kpis.map((item) => ({ topic: item.label, value: item.money ? money(item.raw) : count(item.raw), note: item.hint })),
    ...attention.map((item) => ({ topic: `ต้องจัดการ: ${item.label}`, value: count(item.count), note: item.detail })),
  ], [['หัวข้อ', (row) => text(row.topic), 40], ['ค่า', (row) => row.value, 20], ['หมายเหตุ', (row) => text(row.note), 44]]));

  sheets.push(sheet('ยอดขายรายเดือน', summary?.series || [], [
    ['เดือน', (row) => text(monthLong(row.period)), 20],
    ['เดือน (ปี-เดือน)', (row) => text(row.period), 14],
    ['จำนวนออเดอร์', (row) => count(row.orderCount), 14],
    ['ยอดขาย (บาท)', (row) => money(row.totalSales), 18],
  ]));

  sheets.push(sheet('ยอดขายตามรุ่น', byModel, [
    ['รุ่นรถ', (row) => text(row.carModel), 34],
    ['จำนวนออเดอร์', (row) => count(row.orderCount), 14],
    ['ยอดขาย (บาท)', (row) => money(row.totalSales), 18],
    ['เฉลี่ยต่อออเดอร์ (บาท)', (row) => money(toNumber(row.orderCount) ? toNumber(row.totalSales) / toNumber(row.orderCount) : 0), 20],
    ['สัดส่วนยอดขาย', (row) => share(totalSales ? toNumber(row.totalSales) / totalSales : 0), 14],
  ]));

  sheets.push(sheet('ออเดอร์ทั้งหมด', data.orders?.items || [], [
    ['รหัสออเดอร์', (row) => text(row.code), 18],
    ['วันที่สร้าง', (row) => date(row.createdAt), 18],
    ['ลูกค้า', (row) => text(row.customerName), 24],
    ['พนักงานขาย', (row) => text(row.sellerName), 22],
    ['รุ่นรถ', (row) => text(row.carModel), 34],
    ['ยอดรวม (บาท)', (row) => money(row.totalAmount), 18],
    ['การอนุมัติ', (row) => status(row.approvalStatus), 14],
    ['สถานะออเดอร์', (row) => status(row.orderStatus), 14],
  ]));

  const inventory = data.inventory;
  if (inventory?.mode === 'toyoty') {
    sheets.push(sheet('สต็อกและการผลิต', inventory.items || [], [
      ['รุ่น', (row) => text(`${row.brand} ${row.model}`), 20],
      ['รุ่นย่อย', (row) => text(row.trimName), 18],
      ['ราคา (บาท)', (row) => money(row.price), 16],
      ['รถโชว์', (row) => count(row.showroom), 10],
      ['รถสต็อก', (row) => count(row.inStock), 10],
      ['รอจองคิว', (row) => count(row.waiting), 10],
      ['จองคิวแล้ว', (row) => count(row.scheduled), 10],
      ['กำลังผลิต', (row) => count(row.inProduction), 10],
      ['กำลังขนส่ง', (row) => count(row.inTransit), 10],
      ['ถึงศูนย์', (row) => count(row.ready), 10],
      ['ส่งมอบแล้ว', (row) => count(row.delivered), 10],
      ['ยังไม่ส่งมอบ', (row) => count(row.open), 12],
      ['ล่าช้า', (row) => count(row.delayed), 10],
      ['ยกเลิก', (row) => count(row.cancelled), 10],
    ]));
    sheets.push(sheet('คิวผลิต', inventory.queue || [], [
      ['รุ่น', (row) => text(row.model), 20],
      ['สัปดาห์ผลิต (วันจันทร์)', (row) => date(row.weekStart), 20],
      ['กำลังผลิต (คัน)', (row) => count(row.capacity), 14],
      ['จองแล้ว', (row) => count(row.booked), 10],
      ['ว่าง', (row) => count(row.free), 10],
    ]));
  } else if (inventory) {
    sheets.push(sheet('สต็อก', inventory.items || [], [
      ['ยี่ห้อ', (row) => text(row.brand), 16],
      ['รุ่น', (row) => text(row.model), 24],
      ['คงเหลือ (คัน)', (row) => count(row.stock), 12],
      ['สถานะ', (row) => status(row.stockStatus), 12],
      ['ราคาเริ่มต้น (บาท)', (row) => money(row.price), 18],
    ]));
  }

  const configuration = data['sales-by-configuration'];
  if (configuration?.available) {
    sheets.push(sheet('ยอดขายตามสเปก', configuration.items || [], [
      ['รุ่น', (row) => text(row.model), 20],
      ['รุ่นย่อย', (row) => text(row.trimName), 18],
      ['สี', (row) => text(row.color), 14],
      ['ล้อ', (row) => text(row.wheel), 20],
      ['จำนวน (คัน)', (row) => count(row.orderCount), 12],
      ['ยอดขาย ราคารถ (บาท)', (row) => money(row.totalSales), 20],
    ]));
  }

  const delays = data['production-delays'];
  if (delays?.available) {
    sheets.push(sheet('รถล่าช้า', delays.items || [], [
      ['รุ่น', (row) => text(row.model), 20],
      ['รุ่นย่อย', (row) => text(row.trimName), 18],
      ['สี', (row) => text(row.color), 14],
      ['VIN', (row) => text(row.vin), 20],
      ['ขั้นผลิต', (row) => status(row.productionStatus), 14],
      ['คาดว่าได้รับรถตั้งแต่', (row) => date(row.etaFrom), 18],
      ['ถึง', (row) => date(row.etaTo), 14],
      ['ช้ากว่าที่สัญญา (วัน)', (row) => count(row.delayDays), 18],
      ['ยกเลิก + คืนเงินจองได้', (row) => text(row.canCancelForDelay ? 'ได้' : 'ไม่ได้'), 18],
    ]));
  }

  sheets.push(sheet('นัดหมาย', data.appointments?.items || [], [
    ['รหัส', (row) => text(row.code), 16],
    ['ลูกค้า', (row) => text(row.customerName), 24],
    ['ประเภท', (row) => text(row.type), 16],
    ['รุ่นรถ', (row) => text(row.carModel), 28],
    ['วันนัด', (row) => date(row.dueDate || row.preferredDate), 14],
    ['ผู้รับผิดชอบ', (row) => text(row.assignedSeller), 22],
    ['สถานะ', (row) => status(row.dbStatus || row.status), 14],
  ]));

  sheets.push(sheet('การเงิน', data.finance?.items || [], [
    ['ประเภท', (row) => status(row.recordType), 14],
    ['เลขที่', (row) => text(row.invoiceNumber || row.id), 26],
    ['จำนวนเงิน (บาท)', (row) => money(row.amount), 18],
    ['ช่องทาง', (row) => text(row.paymentMethod), 14],
    ['หัวข้อ', (row) => text(row.topic), 24],
    ['สถานะ', (row) => status(row.status), 14],
    ['วันที่', (row) => date(row.createdAt || row.issueDate), 18],
  ]));

  const { default: writeXlsxFile } = await import('write-excel-file/universal');
  const blob = await writeXlsxFile(sheets, { fontFamily: 'Tahoma', fontSize: 11 }).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `carshop-dashboard-${generatedAt.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
