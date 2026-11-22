import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { REPORTS, formatMoney, getRows, useReports } from '../hooks/useReports.js';

function DataTable({ title, value, loading, error }) {
  const rows = getRows(value);
  const columns = useMemo(() => {
    const first = rows[0];
    return first ? Object.keys(first).filter((key) => !['id', '_id'].includes(key)).slice(0, 7) : [];
  }, [rows]);

  return (
    <section className="s-card min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {loading && <span className="status loading">กำลังโหลด</span>}
      </div>
      {error ? (
        <div className="notice" role="alert">
          <strong>ยังดึงข้อมูลรายงานไม่ได้</strong>
          <p className="mt-1">{error}</p>
        </div>
      ) : loading ? (
        <p className="text-sm text-slate-500">กำลังติดต่อ Reporting API…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">ไม่พบข้อมูลในช่วงวันที่ที่เลือก</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500">
              {columns.map((column) => <th key={column} className="px-3 py-2 font-medium">{column}</th>)}
            </tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={row.id || row._id || index} className="border-b border-slate-100 last:border-0">
                {columns.map((column) => {
                  const value = row[column];
                  const money = /amount|price|revenue|total|paid|refund/i.test(column);
                  return <td key={column} className="px-3 py-3 text-slate-700">{money ? formatMoney(value) : (value == null || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value))}</td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ReportsPage({ title = 'รายงานและ Dashboard', breadcrumb = 'Workspace / ผู้จัดการ / Reports' }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState('month');
  const [refresh, setRefresh] = useState(0);
  const { data, errors, loading } = useReports({ dateFrom, dateTo, groupBy, refresh });

  const finance = data.finance?.summary;
  const summary = data['sales-summary'];
  const summaryObject = Array.isArray(summary) ? summary[0] : summary;
  const cards = [
    ['ยอดขายรวม', summaryObject?.totalSales ?? summaryObject?.total_sales ?? summaryObject?.revenue, true],
    ['จำนวนออเดอร์', summaryObject?.orderCount ?? summaryObject?.order_count ?? summaryObject?.orders, false],
    ['ยอดชำระแล้ว', summaryObject?.paidAmount ?? summaryObject?.paid_amount, true],
    ['ยอดคืนเงิน', summaryObject?.refundedAmount ?? summaryObject?.refunded_amount, true],
  ];

  return (
    <main className="page-content admin-content">
      <header className="s-ph">
        <div>
          <p className="s-crumb">{breadcrumb}</p>
          <h1>{title}</h1>
          <p>ข้อมูลยอดขาย การเงิน รถในสต็อก และนัดหมายจากระบบจริง</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/reporting/activity-logs" className="button">ประวัติกิจกรรม</Link>
          <button type="button" className="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
            {loading ? 'กำลังโหลด…' : 'รีเฟรชข้อมูล'}
          </button>
        </div>
      </header>

      <section className="s-card mb-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">ตั้งแต่วันที่
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">ถึงวันที่
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">จัดกลุ่มยอดขาย
            <select className="rounded-lg border border-slate-300 px-3 py-2" value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
              <option value="day">รายวัน</option><option value="month">รายเดือน</option><option value="year">รายปี</option>
            </select>
          </label>
          <div className="flex items-end"><button type="button" className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => { setDateFrom(''); setDateTo(''); setGroupBy('month'); }}>ล้างตัวกรอง</button></div>
        </div>
      </section>

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, money]) => (
          <article key={label} className="s-card">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-800">{value == null ? (errors['sales-summary'] ? '—' : '…') : (money ? formatMoney(value) : new Intl.NumberFormat('th-TH').format(Number(value)))}</p>
            {errors['sales-summary'] && <p className="mt-2 text-xs text-red-700">รอ API รายงานยอดขาย</p>}
          </article>
        ))}
      </section>

      {finance && <section className="s-card mb-5">
        <div className="mb-4"><h2 className="text-lg font-semibold">ภาพรวมการเงิน</h2><p className="text-sm text-slate-500">สรุปจาก Payments, Refunds, Invoices และ Finance Requests</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['ยอดรับชำระสำเร็จ', finance.paidAmount, true],
            ['ยอดคืนเงินสำเร็จ', finance.refundedAmount, true],
            ['ยอดใบแจ้งหนี้ค้างชำระ', finance.outstandingInvoiceAmount, true],
            ['คำขอการเงินที่ยังเปิด', finance.openFinanceRequestCount, false],
          ].map(([label, value, money]) => <article key={label} className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold">{value == null ? '—' : money ? formatMoney(value) : new Intl.NumberFormat('th-TH').format(Number(value))}</p></article>)}
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <p>รายการชำระทั้งหมด: {finance.paymentCount ?? 0}</p><p>รายการคืนเงิน: {finance.refundCount ?? 0}</p><p>ใบแจ้งหนี้: {finance.invoiceCount ?? 0}</p>
        </div>
        {Object.values(data.finance?.pagination || {}).some(Boolean) && <p className="mt-3 text-xs text-amber-700">ข้อมูลบางส่วนเกินขีดจำกัดการดึงข้อมูล โปรดตรวจสอบ Pagination ของ Payment Service</p>}
      </section>}

      <div className="grid gap-5 xl:grid-cols-2">
        {REPORTS.map(([key, title]) => <DataTable key={key} title={title} value={data[key]} loading={loading} error={errors[key]} />)}
      </div>
      {['sales-summary', 'sales-by-seller', 'sales-by-model', 'appointments'].some((key) => data[key]?.sourceLimitReached) &&<p className="mt-5 text-sm text-amber-700">คำเตือน: Sales API ส่งข้อมูลได้สูงสุด 500 รายการต่อคำขอ รายงานยอดขายหรือนัดหมายอาจไม่ครอบคลุมทั้งหมด</p>}
      {data.inventory?.sourceLimitReached && <p className="mt-2 text-sm text-amber-700">คำเตือน: ดึงข้อมูลรุ่นรถได้ไม่ครบตามจำนวนทั้งหมดจาก Catalog API</p>}
      <p className="mt-5 text-xs text-slate-500">หมายเหตุ: หน้านี้ไม่สร้างข้อมูลตัวอย่าง หาก API ยังไม่พร้อมจะแสดงสถานะผิดพลาดแทนยอดจำลอง</p>
    </main>
  );
}
