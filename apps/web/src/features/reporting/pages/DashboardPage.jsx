import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MonthlyChart from '../components/MonthlyChart.jsx';
import ModelDetailDialog from '../components/ModelDetailDialog.jsx';
import { STATUS_LABELS } from '../components/reportFormat.js';
import { monthLong, monthWindow, number, percent, toNumber } from '../components/dashboardFormat.js';
import { formatMoney, getRows, useReports } from '../hooks/useReports.js';
import { exportDashboardXlsx } from '../utils/exportDashboard.js';
import './dashboard.css';

// Dashboard ของ Admin และ Manager (หน้าเดียวกัน ต่างกันแค่ลิงก์ไปหน้าจัดการ)
// ทุกตัวเลขมาจาก Reporting API จริง ไม่มีข้อมูลตัวอย่าง
const DASHBOARD_REPORTS = [
  ['sales-summary', 'ภาพรวมยอดขาย'],
  ['sales-by-model', 'ยอดขายตามรุ่นรถ'],
  ['orders', 'รายการออเดอร์'],
  ['inventory', 'รถและสต็อก'],
  ['production-delays', 'รถสั่งผลิตที่ล่าช้า'],
  ['sales-by-configuration', 'ยอดขายตามสเปก'],
  ['appointments', 'นัดหมาย'],
  ['finance', 'การเงิน'],
];

// หน้าที่กดไปจัดการต่อได้ของแต่ละ workspace
const LINKS = {
  '/admin': { orders: '/admin/requests', finance: '/admin/finance', appointments: '/admin/requests', stock: '/admin/reports/inventory', reports: '/admin/reports' },
  '/manager': { orders: '/manager/approvals', finance: '/manager/invoices', appointments: '/manager/appointments', stock: '/manager/reports/inventory', reports: '/manager/reports' },
};

const APPOINTMENT_ORDER = ['PENDING', 'ASSIGNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'];

function Notice({ error }) {
  return (
    <div className="notice" role="alert">
      <strong>ยังดึงข้อมูลส่วนนี้ไม่ได้</strong>
      <p className="mt-1">{error}</p>
    </div>
  );
}

function Kpi({ label, value, hint, error, loading }) {
  return (
    <article className="s-card s-kpi">
      <span className="l">{label}</span>
      <strong className="v" title={value ?? undefined}>{value ?? (error ? '—' : '…')}</strong>
      <span className="db-hint">{error ? 'โหลดไม่สำเร็จ' : loading && value == null ? 'กำลังโหลด' : hint}</span>
    </article>
  );
}

export default function DashboardPage({ base = '/admin', breadcrumb = 'Workspace / ภาพรวม' }) {
  const links = LINKS[base] || LINKS['/admin'];
  const [refresh, setRefresh] = useState(0);
  const [months, setMonths] = useState(6);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { data, errors, loading } = useReports({ groupBy: 'month', refresh, reports: DASHBOARD_REPORTS });

  const summary = data['sales-summary'];
  const finance = data.finance?.summary;
  const inventory = data.inventory;
  const delays = data['production-delays'];
  const appointments = data.appointments;
  const orders = data.orders;
  const toyoty = inventory?.mode === 'toyoty';
  const stockSummary = inventory?.summary;

  const chartMonths = useMemo(() => monthWindow(summary?.series || [], months), [summary, months]);
  const thisMonth = chartMonths[chartMonths.length - 1];
  const lastMonth = chartMonths[chartMonths.length - 2];

  // ---- ตัวเลขหลัก 4 ตัว: บอกว่าแต่ละตัวนับอะไร ----
  const legacyStock = getRows(inventory).reduce((total, item) => total + toNumber(item.stock), 0);
  const pendingAppointments = (appointments?.statusCounts?.PENDING || 0) + (appointments?.statusCounts?.ASSIGNED || 0);
  const kpis = [
    {
      label: 'ยอดขายรวม', money: true, raw: summary?.totalSales, error: errors['sales-summary'],
      value: summary ? formatMoney(summary.totalSales) : null,
      hint: summary ? `${number(summary.orderCount)} ออเดอร์ · ไม่นับที่ยกเลิก/ไม่อนุมัติ` : '',
    },
    {
      label: 'รับเงินแล้ว', money: true, raw: finance?.paidAmount, error: errors.finance,
      value: finance ? formatMoney(finance.paidAmount) : null,
      hint: finance ? `${number(finance.successfulPaymentCount)} รายการชำระสำเร็จ` : '',
    },
    toyoty
      ? {
        label: 'รถสั่งผลิตที่ยังไม่ส่งมอบ', raw: stockSummary?.open, error: errors.inventory,
        value: stockSummary ? `${number(stockSummary.open)} คัน` : null,
        hint: stockSummary ? `ถึงศูนย์รอส่งมอบ ${number(stockSummary.ready)} คัน` : '',
      }
      : {
        label: 'รถพร้อมขาย', raw: legacyStock, error: errors.inventory,
        value: inventory ? `${number(legacyStock)} คัน` : null,
        hint: inventory ? `จาก ${number(inventory.totalModels)} รุ่น` : '',
      },
    {
      label: 'นัดหมายที่ยังไม่ปิด', raw: pendingAppointments, error: errors.appointments,
      value: appointments ? `${number(pendingAppointments)} นัด` : null,
      hint: appointments ? `จากทั้งหมด ${number(appointments.total)} นัด` : '',
    },
  ];

  // ---- งานที่ต้องจัดการ ----
  const pendingOrders = (orders?.items || []).filter((item) => item.approvalStatus === 'PENDING_APPROVAL');
  const openInvoices = (data.finance?.items || []).filter((item) => item.recordType === 'INVOICE' && item.status === 'ISSUED');
  const attention = [
    {
      label: 'ออเดอร์รออนุมัติ', count: orders ? pendingOrders.length : null, error: errors.orders, to: links.orders,
      detail: pendingOrders.length ? `ยอดรวม ${formatMoney(pendingOrders.reduce((t, i) => t + toNumber(i.totalAmount), 0))}` : 'ไม่มีออเดอร์ค้างอนุมัติ',
    },
    {
      label: 'ใบแจ้งหนี้ค้างชำระ', count: finance ? openInvoices.length : null, error: errors.finance, to: links.finance,
      detail: finance && toNumber(finance.outstandingInvoiceAmount) > 0 ? `ค้างรับ ${formatMoney(finance.outstandingInvoiceAmount)}` : 'ไม่มียอดค้าง',
    },
    {
      label: 'คำขอการเงินที่ยังเปิด', count: finance ? finance.openFinanceRequestCount : null, error: errors.finance, to: links.finance,
      detail: 'เรื่องที่ Seller ส่งมาให้การเงินตอบ',
    },
    {
      label: 'รถสั่งผลิตล่าช้า', count: delays?.available ? delays.total : null, error: errors['production-delays'], to: links.stock,
      hidden: delays && !delays.available,
      detail: delays?.cancellable ? `${number(delays.cancellable)} คันช้าเกิน 30 วัน ลูกค้ายกเลิกได้` : 'ช้ากว่าช่วงวันรับรถที่แจ้งลูกค้า',
    },
    {
      label: 'นัดหมายรอดำเนินการ', count: appointments ? appointments.statusCounts?.PENDING || 0 : null, error: errors.appointments, to: links.appointments,
      detail: 'ยังไม่ได้มอบหมาย Seller',
    },
  ].filter((item) => !item.hidden);

  // ---- ยอดขายตามรุ่น ----
  const models = getRows(data['sales-by-model']);
  const totalModelSales = models.reduce((total, row) => total + toNumber(row.totalSales), 0);
  const maxModelSales = Math.max(1, ...models.map((row) => toNumber(row.totalSales)));
  const query = search.trim().toLowerCase();
  const rows = models.filter((row) => String(row.carModel || '').toLowerCase().includes(query));

  const appointmentRows = Object.entries(appointments?.statusCounts || {})
    .sort(([a], [b]) => APPOINTMENT_ORDER.indexOf(a) - APPOINTMENT_ORDER.indexOf(b));
  const appointmentMax = Math.max(1, ...appointmentRows.map(([, count]) => count));

  const limitWarnings = [
    [summary, data['sales-by-model'], appointments, orders].some((item) => item?.sourceLimitReached) && 'Sales API ส่งข้อมูลได้สูงสุด 500 รายการต่อครั้ง ยอดขาย ออเดอร์ หรือนัดหมายอาจไม่ครบ',
    inventory?.sourceLimitReached && 'ดึงข้อมูลรุ่นรถจาก Catalog API ได้ไม่ครบ',
    Object.values(data.finance?.pagination || {}).some(Boolean) && 'ข้อมูลการเงินบางส่วนเกินขีดจำกัดของ Payment API',
  ].filter(Boolean);

  async function exportExcel() {
    setExporting(true);
    setExportError('');
    try {
      await exportDashboardXlsx({ data, kpis, attention });
    } catch (error) {
      setExportError('สร้างไฟล์ Excel ไม่สำเร็จ: ' + (error?.message || error));
    } finally {
      setExporting(false);
    }
  }

  const change = lastMonth && thisMonth ? thisMonth.orderCount - lastMonth.orderCount : 0;

  return (
    <main className="page-content admin-content db-page">
      <header className="s-ph">
        <div>
          <p className="s-crumb">{breadcrumb}</p>
          <h1>Dashboard</h1>
          <p>สรุปภาพรวมร้านจากข้อมูลจริงของทุกระบบ (ขาย การเงิน รถ นัดหมาย)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={links.reports} className="s-btn">ดูรายงานละเอียด</Link>
          <button type="button" className="s-btn" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
            {loading ? 'กำลังโหลด…' : 'รีเฟรช'}
          </button>
          <button type="button" className="s-btn pri" onClick={exportExcel} disabled={loading || exporting}>
            {exporting ? 'กำลังสร้างไฟล์…' : '↓ ส่งออก Excel'}
          </button>
        </div>
      </header>
      {exportError && <p className="db-bad" role="alert">{exportError}</p>}

      <div className="s-kpis">
        {kpis.map((item) => <Kpi key={item.label} {...item} loading={loading} />)}
      </div>

      <section className="s-card">
        <div className="db-card-h">
          <div>
            <h2>สิ่งที่ต้องจัดการตอนนี้</h2>
            <p className="db-muted">ตัวเลขเป็น 0 = เรียบร้อย ไม่มีงานค้าง</p>
          </div>
        </div>
        <ul className="db-todo">
          {attention.map((item) => {
            const done = item.count === 0;
            return (
              <li key={item.label} className={done ? 'done' : item.count ? 'todo' : ''}>
                <span className="db-todo-n" aria-hidden="true">{item.error ? '!' : item.count == null ? '…' : done ? '✓' : number(item.count)}</span>
                <span className="db-todo-t">
                  <b>{item.label}</b>
                  <span>{item.error ? 'โหลดไม่สำเร็จ' : item.count == null ? 'กำลังโหลด' : done ? 'เรียบร้อย' : item.detail}</span>
                  {!done && item.count != null && !item.error && <Link className="s-act" to={item.to}>ไปจัดการ →</Link>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="db-grid">
        <section className="s-card">
          <div className="db-card-h">
            <div>
              <h2>ยอดขายรายเดือน</h2>
              <p className="db-muted">
                {thisMonth && `${monthLong(thisMonth.period)}: ${number(thisMonth.orderCount)} ออเดอร์`}
                {lastMonth && (change === 0 ? ' · เท่ากับเดือนก่อน' : ` · ${change > 0 ? 'มากกว่า' : 'น้อยกว่า'}เดือนก่อน ${number(Math.abs(change))}`)}
              </p>
            </div>
            <label className="db-select">
              <span className="sr-only">ช่วงเวลา</span>
              <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
                <option value={6}>6 เดือนล่าสุด</option>
                <option value={12}>12 เดือนล่าสุด</option>
              </select>
            </label>
          </div>
          {errors['sales-summary'] ? <Notice error={errors['sales-summary']} />
            : !summary ? <p className="db-muted">กำลังโหลด…</p>
              : <MonthlyChart months={chartMonths} />}
        </section>

        <section className="s-card">
          <div className="db-card-h">
            <div>
              <h2>นัดหมายตามสถานะ</h2>
              <p className="db-muted">{appointments ? `ทั้งหมด ${number(appointments.total)} นัด` : ''}</p>
            </div>
            <Link className="s-act" to={links.appointments}>ดูทั้งหมด</Link>
          </div>
          {errors.appointments ? <Notice error={errors.appointments} />
            : !appointments ? <p className="db-muted">กำลังโหลด…</p>
              : !appointmentRows.length ? <p className="db-muted">ยังไม่มีนัดหมาย</p>
                : (
                  <ul className="db-hbars">
                    {appointmentRows.map(([status, count]) => (
                      <li key={status}>
                        <span className="t">{STATUS_LABELS[status] || status}</span>
                        <span className="track"><span className="fill" style={{ width: `${(count / appointmentMax) * 100}%` }} /></span>
                        <span className="n">{number(count)}</span>
                      </li>
                    ))}
                  </ul>
                )}
        </section>
      </div>

      <section className="s-card flush">
        <div className="s-card-h db-card-h">
          <div>
            <h2>ยอดขายตามรุ่นรถ</h2>
            <p className="db-muted">กด "ดูรายละเอียด" เพื่อดูสต็อก สเปกที่ขายได้ และออเดอร์ของรุ่นนั้น</p>
          </div>
          <label className="s-search db-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">ค้นหารุ่นรถ</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารุ่นรถ…" type="search" />
          </label>
        </div>
        <div className="s-tw">
          {errors['sales-by-model'] ? <Notice error={errors['sales-by-model']} /> : (
            <table className="s-tbl db-model-tbl">
              <thead>
                <tr>
                  <th scope="col">รุ่นรถ</th>
                  <th scope="col" className="num">ออเดอร์</th>
                  <th scope="col" className="num">ยอดขาย</th>
                  <th scope="col">สัดส่วนยอดขาย</th>
                  <th scope="col" className="num">เฉลี่ย/ออเดอร์</th>
                  <th scope="col"><span className="sr-only">รายละเอียด</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const sales = toNumber(row.totalSales);
                  const count = toNumber(row.orderCount);
                  return (
                    <tr key={row.carModel}>
                      <td><b>{row.carModel}</b></td>
                      <td className="num">{number(count)}</td>
                      <td className="num">{formatMoney(sales)}</td>
                      <td>
                        <span className="db-share">
                          <span className="track"><span className="fill" style={{ width: `${(sales / maxModelSales) * 100}%` }} /></span>
                          <span>{percent(sales, totalModelSales)}</span>
                        </span>
                      </td>
                      <td className="num">{count ? formatMoney(sales / count) : '—'}</td>
                      <td><button type="button" className="s-act" onClick={() => setSelected(row)}>ดูรายละเอียด</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!errors['sales-by-model'] && !rows.length && (
            <p className="empty-state">{loading && !models.length ? 'กำลังโหลด…' : query ? 'ไม่พบรุ่นรถที่ค้นหา' : 'ยังไม่มียอดขาย'}</p>
          )}
        </div>
        <div className="s-card-f">แสดง {number(rows.length)} จาก {number(models.length)} รุ่น · ยอดขายรวมเบี้ยประกัน · ไฟล์ Excel มีออเดอร์ทุกรายการ</div>
      </section>

      {limitWarnings.map((warning) => <p key={warning} className="db-warn">คำเตือน: {warning}</p>)}

      {selected && (
        <ModelDetailDialog
          row={selected}
          totalSales={totalModelSales}
          inventory={inventory}
          configuration={data['sales-by-configuration']}
          orders={orders}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
