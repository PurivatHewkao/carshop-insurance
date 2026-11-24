import { useState } from 'react';
import ReportTable from '../components/ReportTable.jsx';
import ReportTabs from '../components/ReportTabs.jsx';
import { REPORTS, formatMoney, getRows, useReports } from '../hooks/useReports.js';

const titleOf = Object.fromEntries(REPORTS);

// Which Reporting endpoints each page loads and shows.
const VIEWS = {
  all: {
    title: 'รายงานทั้งหมด',
    description: 'ภาพรวมยอดขาย การเงิน รถในสต็อก และนัดหมายจากระบบจริง',
    reports: ['sales-summary', 'sales-by-seller', 'sales-by-model', 'inventory', 'appointments', 'finance'],
    salesCards: true,
    financeCards: true,
  },
  sales: {
    title: 'ยอดขายและออเดอร์',
    description: 'ยอดขายรวม ยอดขายตามพนักงานและรุ่นรถ และรายการออเดอร์จาก Sales',
    reports: ['sales-summary', 'sales-by-seller', 'sales-by-model', 'sales-by-configuration', 'orders'],
    salesCards: true,
    wide: ['sales-by-configuration', 'orders'],
  },
  finance: {
    title: 'การเงิน',
    description: 'รับชำระ คืนเงิน ใบแจ้งหนี้ และคำขอการเงินจาก Payment',
    reports: ['finance'],
    financeCards: true,
    wide: ['finance'],
  },
  inventory: {
    title: 'รถและสต็อก',
    description: 'รถ TOYOTY แยกรุ่น × รุ่นย่อย ตามขั้นผลิต คิวผลิตรายสัปดาห์ และรถที่ล่าช้า จาก Catalog',
    reports: ['inventory', 'production-delays'],
    stockCards: true,
    noDateFilter: true,
    wide: ['inventory', 'production-delays'],
  },
};

// ตารางย่อยที่มาจากรายงานเดียวกัน: [report, field, title, columns]
const EXTRA_TABLES = [
  ['inventory', 'queue', 'คิวผลิตรายสัปดาห์ (8 สัปดาห์)', 'inventory-queue'],
  ['sales-by-configuration', 'byTrim', 'ยอดขายตามรุ่นย่อย', 'configuration-group'],
  ['sales-by-configuration', 'byColor', 'ยอดขายตามสี', 'configuration-group'],
  ['sales-by-configuration', 'byWheel', 'ยอดขายตามล้อ', 'configuration-group'],
];

// Catalog ที่ยังไม่ได้รัน migration TOYOTY ตอบรายงานแบบเดิม (mode legacy)
const columnsFor = (key, value) => (key === 'inventory' && value?.mode === 'legacy' ? 'inventory-legacy' : key);

const number = (value) => (value == null ? '—' : new Intl.NumberFormat('th-TH').format(Number(value)));

function Cards({ items, error }) {
  return (
    <section className="s-kpis mb-5">
      {items.map(([label, value, money]) => {
        const text = value == null ? (error ? '—' : '…') : money ? formatMoney(value) : number(value);
        return (
          <article key={label} className="s-card s-kpi">
            <span className="l">{label}</span>
            <strong className="v" title={text}>{text}</strong>
            {error && <span className="text-xs" style={{ color: 'var(--bad)' }}>โหลดไม่สำเร็จ</span>}
          </article>
        );
      })}
    </section>
  );
}

export default function ReportsPage({ view = 'all', base = '', title, breadcrumb }) {
  const config = VIEWS[view] || VIEWS.all;
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState('month');
  const [refresh, setRefresh] = useState(0);
  const { data, errors, loading } = useReports({
    dateFrom: config.noDateFilter ? '' : dateFrom,
    dateTo: config.noDateFilter ? '' : dateTo,
    groupBy,
    refresh,
    reports: config.reports.map((key) => [key, titleOf[key]]),
  });

  const summary = data['sales-summary'];
  const finance = data.finance?.summary;
  const stock = data.inventory?.summary;
  const toyotyStock = data.inventory?.mode === 'toyoty';
  const delays = data['production-delays'];
  const salesLimited = ['sales-summary', 'sales-by-seller', 'sales-by-model', 'appointments', 'orders'].some((key) => data[key]?.sourceLimitReached);

  return (
    <main className="page-content admin-content">
      <header className="s-ph">
        <div>
          <p className="s-crumb">{breadcrumb || 'Workspace / รายงาน'}</p>
          <h1>{title || config.title}</h1>
          <p>{config.description}</p>
        </div>
        <button type="button" className="s-btn" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
          {loading ? 'กำลังโหลด…' : 'รีเฟรชข้อมูล'}
        </button>
      </header>

      <ReportTabs base={base} />

      {!config.noDateFilter && (
        <section className="s-card mb-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium">ตั้งแต่วันที่
              <input className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line2)', background: 'var(--bg)', color: 'var(--ink)' }} type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium">ถึงวันที่
              <input className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line2)', background: 'var(--bg)', color: 'var(--ink)' }} type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            {config.reports.includes('sales-summary') ? (
              <label className="grid gap-1 text-sm font-medium">จัดกลุ่มยอดขาย
                <select className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line2)', background: 'var(--bg)', color: 'var(--ink)' }} value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
                  <option value="day">รายวัน</option><option value="month">รายเดือน</option><option value="year">รายปี</option>
                </select>
              </label>
            ) : <div />}
            <div className="flex items-end">
              <button type="button" className="s-btn w-full" onClick={() => { setDateFrom(''); setDateTo(''); setGroupBy('month'); }}>ล้างตัวกรอง</button>
            </div>
          </div>
        </section>
      )}

      {config.salesCards && (
        <Cards
          error={errors['sales-summary']}
          items={[
            ['ยอดขายรวม', summary?.totalSales, true],
            ['จำนวนออเดอร์', summary?.orderCount, false],
            ['ยอดชำระแล้ว', summary?.paidAmount, true],
            ['ยอดคืนเงิน', summary?.refundedAmount, true],
          ]}
        />
      )}

      {config.financeCards && (
        <Cards
          error={errors.finance}
          items={[
            ['ยอดรับชำระสำเร็จ', finance?.paidAmount, true],
            ['ยอดคืนเงินสำเร็จ', finance?.refundedAmount, true],
            ['ใบแจ้งหนี้ค้างชำระ', finance?.outstandingInvoiceAmount, true],
            ['คำขอการเงินที่ยังเปิด', finance?.openFinanceRequestCount, false],
          ]}
        />
      )}

      {config.stockCards && toyotyStock && (
        <Cards
          error={errors.inventory}
          items={[
            ['รถสั่งผลิตที่ยังไม่ส่งมอบ (คัน)', stock?.open, false],
            ['กำลังผลิต + ขนส่ง (คัน)', stock ? stock.inProduction + stock.inTransit : null, false],
            ['ถึงศูนย์ รอส่งมอบ (คัน)', stock?.ready, false],
            ['ล่าช้ากว่าช่วงวันคาดการณ์ (คัน)', stock?.delayed, false],
          ]}
        />
      )}

      {config.stockCards && !toyotyStock && (
        <Cards
          error={errors.inventory}
          items={[
            ['รถพร้อมขาย (คัน)', stock?.units, false],
            ['จำนวนรุ่น', stock?.models ?? data.inventory?.totalModels, false],
            ['รุ่นใกล้หมด', stock?.low, false],
            ['รุ่นที่หมดสต็อก', stock?.outOfStock, false],
          ]}
        />
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {config.reports.map((key) => (
          <div key={key} className={config.wide?.includes(key) ? 'xl:col-span-2' : ''}>
            <ReportTable
              reportKey={key}
              columnsKey={columnsFor(key, data[key])}
              title={key === 'finance' ? 'รายการทางการเงิน' : titleOf[key]}
              value={key === 'sales-summary' ? summary?.series : data[key]}
              loading={loading}
              error={errors[key]}
              emptyText={data[key]?.available === false ? data[key].message : key === 'inventory' ? 'ยังไม่มีรุ่นรถใน Catalog' : key === 'production-delays' ? 'ไม่มีรถที่ล่าช้า' : undefined}
            />
          </div>
        ))}
        {EXTRA_TABLES.filter(([key, field]) => config.reports.includes(key) && Array.isArray(data[key]?.[field])).map(([key, field, tableTitle, columnsKey]) => (
          <ReportTable
            key={key + field}
            reportKey={key}
            columnsKey={columnsKey}
            title={tableTitle}
            value={data[key][field]}
            loading={loading}
            error={errors[key]}
            emptyText={key === 'inventory' ? 'ยังไม่มีคิวผลิต' : undefined}
          />
        ))}
      </div>

      {delays?.cancellable > 0 && <p className="mt-5 text-sm" style={{ color: 'var(--warn)' }}>มีรถ {number(delays.cancellable)} คันที่ล่าช้าเกิน 30 วัน ลูกค้ายกเลิกและขอคืนเงินจองเต็มจำนวนได้</p>}

      {salesLimited && <p className="mt-5 text-sm" style={{ color: 'var(--warn)' }}>คำเตือน: Sales API ส่งข้อมูลได้สูงสุด 500 รายการต่อคำขอ รายงานยอดขาย ออเดอร์ หรือนัดหมายอาจไม่ครอบคลุมทั้งหมด</p>}
      {data.inventory?.sourceLimitReached && <p className="mt-2 text-sm" style={{ color: 'var(--warn)' }}>คำเตือน: ดึงข้อมูลรุ่นรถได้ไม่ครบตามจำนวนทั้งหมดจาก Catalog API</p>}
      {Object.values(data.finance?.pagination || {}).some(Boolean) && <p className="mt-2 text-sm" style={{ color: 'var(--warn)' }}>คำเตือน: ข้อมูลการเงินบางส่วนเกินขีดจำกัดการดึงข้อมูลของ Payment API</p>}
      {config.reports.some((key) => getRows(key === 'sales-summary' ? summary?.series : data[key]).length) || loading ? null : (
        <p className="mt-5 text-xs" style={{ color: 'var(--mute)' }}>หน้านี้ไม่สร้างข้อมูลตัวอย่าง หาก API ยังไม่พร้อมจะแสดงสถานะผิดพลาดแทนยอดจำลอง</p>
      )}
    </main>
  );
}
