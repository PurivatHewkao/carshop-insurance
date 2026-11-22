import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useOutletContext } from 'react-router-dom';
import { ItemList } from '../components/common/Showroom.jsx';
import { formatMoney, getRows, useReports } from '../features/reporting/hooks/useReports.js';

// Admin Dashboard reads the same Reporting APIs as the Manager dashboard.
// No sample numbers: while an API is unavailable the card shows an error state.
const DASHBOARD_REPORTS = [
  ['sales-summary', 'ภาพรวมยอดขาย'],
  ['sales-by-model', 'ยอดขายตามรุ่นรถ'],
  ['inventory', 'รายงานรถและสต็อก'],
  ['appointments', 'รายงานนัดหมาย'],
  ['finance', 'รายงานการเงิน'],
];

const APPOINTMENT_STATUS = {
  PENDING: 'รอดำเนินการ',
  ASSIGNED: 'มอบหมายแล้ว',
  CONFIRMED: 'ยืนยันแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'ปิดแล้ว',
  CANCELLED: 'ยกเลิก',
  REJECTED: 'ไม่อนุมัติ',
};

const TABLE_COLUMNS = [
  ['carModel', 'รุ่นรถ'],
  ['orderCount', 'จำนวนออเดอร์'],
  ['totalSales', 'ยอดขาย'],
];

const number = (value) => (value == null ? '—' : new Intl.NumberFormat('th-TH').format(Number(value)));

function ModelDialog({ selected, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} className="s-card order-modal" aria-labelledby="model-title">
      <h2 id="model-title">{selected.carModel}</h2>
      <dl className="s-kv">
        <div className="r"><dt className="k">จำนวนออเดอร์</dt><dd>{number(selected.orderCount)}</dd></div>
        <div className="r"><dt className="k">ยอดขาย</dt><dd>{formatMoney(selected.totalSales)}</dd></div>
      </dl>
      <button autoFocus className="s-btn pri" onClick={onClose}>ปิดรายละเอียด</button>
    </dialog>
  );
}

function Notice({ error }) {
  return (
    <div className="notice" role="alert">
      <strong>ยังดึงข้อมูลรายงานไม่ได้</strong>
      <p className="mt-1">{error}</p>
    </div>
  );
}

export default function AdminPage() {
  const toolbarTarget = useOutletContext();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const { data, errors, loading } = useReports({ groupBy: 'month', refresh, reports: DASHBOARD_REPORTS });

  const summary = data['sales-summary'];
  const finance = data.finance?.summary;
  const inventory = data.inventory;
  const appointments = data.appointments;
  const series = (summary?.series || []).slice(-6);
  const values = series.map((item) => Number(item.orderCount) || 0);
  const maxValue = Math.max(1, ...values);
  const totalStock = getRows(inventory).reduce((total, item) => total + (Number(item.stock) || 0), 0);

  const kpis = [
    ['ยอดขายรวม', summary && formatMoney(summary.totalSales), 'sales-summary', `${number(summary?.orderCount)} ออเดอร์`],
    ['ยอดรับชำระสำเร็จ', finance && formatMoney(finance.paidAmount), 'finance', `${number(finance?.successfulPaymentCount)} รายการ`],
    ['รถในสต็อก', inventory && number(totalStock), 'inventory', `${number(inventory?.totalModels)} รุ่น`],
    ['นัดหมายทั้งหมด', appointments && number(appointments.total), 'appointments', `${number(appointments?.statusCounts?.COMPLETED ?? 0)} ปิดแล้ว`],
  ];

  const statusItems = Object.entries(appointments?.statusCounts || {})
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ a: APPOINTMENT_STATUS[status] || status, b: `${number(count)} นัดหมาย`, tag: APPOINTMENT_STATUS[status] || status }));

  const models = getRows(data['sales-by-model']);
  const rows = models.filter((row) => String(row.carModel || '').toLowerCase().includes(search.toLowerCase()));

  function exportReport() {
    const lines = [TABLE_COLUMNS.map(([, label]) => label), ...rows.map((row) => TABLE_COLUMNS.map(([key]) => row[key] ?? ''))];
    const csv = '﻿' + lines.map((line) => line.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `carshop-sales-by-model-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const limitWarnings = [
    (summary?.sourceLimitReached || data['sales-by-model']?.sourceLimitReached || appointments?.sourceLimitReached) && 'Sales API ส่งข้อมูลได้สูงสุด 500 รายการต่อคำขอ ยอดขายหรือนัดหมายอาจไม่ครบ',
    inventory?.sourceLimitReached && 'ดึงข้อมูลรุ่นรถจาก Catalog API ได้ไม่ครบ',
    Object.values(data.finance?.pagination || {}).some(Boolean) && 'ข้อมูลการเงินบางส่วนเกินขีดจำกัดการดึงข้อมูลของ Payment API',
  ].filter(Boolean);

  return (
    <>
      {toolbarTarget && createPortal(
        <label className="s-search">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">ค้นหารุ่นรถ</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหารุ่นรถในรายงาน…" type="search" />
        </label>,
        toolbarTarget,
      )}
      <main className="page-content admin-content">
        <header className="s-ph">
          <div>
            <p className="s-crumb">Workspace / ภาพรวม</p>
            <h1>Dashboard</h1>
            <p>ข้อมูลจริงจาก Reporting API (Sales, Payment, Catalog)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/reporting" className="s-btn">รายงานทั้งหมด</Link>
            <button className="s-btn" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
              {loading ? 'กำลังโหลด…' : 'รีเฟรช'}
            </button>
            <button className="s-btn pri" onClick={exportReport} disabled={!rows.length}>↓ ส่งออกรายงาน</button>
          </div>
        </header>

        <div className="s-kpis">
          {kpis.map(([label, value, key, detail]) => (
            <article className="s-card s-kpi" key={label}>
              <span className="l">{label}</span>
              <strong className="v">{value ?? (errors[key] ? '—' : '…')}</strong>
              <div className="r2">
                <span className="s-delta">{errors[key] ? 'โหลดไม่สำเร็จ' : value != null ? detail : 'กำลังโหลด'}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="request-columns">
          <section className="s-card">
            <h2>จำนวนออเดอร์รายเดือน</h2>
            {errors['sales-summary'] ? <Notice error={errors['sales-summary']} />
              : !summary ? <p className="small">กำลังโหลด…</p>
                : !series.length ? <p className="small">ยังไม่มีออเดอร์ในระบบ</p>
                  : (
                    <div className="bar-chart" role="img" aria-label={series.map((item) => `${item.period} ${item.orderCount} รายการ`).join(', ')}>
                      {series.map((item, i) => (
                        <div className="bar-column" key={item.period}>
                          <span>{item.orderCount}</span>
                          <div className={'chart-bar ' + (i === series.length - 1 ? 'highlight' : '')} style={{ height: (values[i] / maxValue) * 180 }} />
                          <small>{item.period}</small>
                        </div>
                      ))}
                    </div>
                  )}
          </section>
          {errors.appointments ? <section className="s-card"><Notice error={errors.appointments} /></section>
            : statusItems.length ? <ItemList title="สถานะนัดหมาย" items={statusItems} />
              : <section className="s-card s-list"><h3>สถานะนัดหมาย</h3><p className="small">{appointments ? 'ยังไม่มีนัดหมาย' : 'กำลังโหลด…'}</p></section>}
        </div>

        <section className="s-card flush">
          <div className="s-card-h"><h2>ยอดขายตามรุ่นรถ</h2></div>
          <div className="s-tw">
            {errors['sales-by-model'] ? <Notice error={errors['sales-by-model']} /> : (
              <table className="s-tbl">
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}
                    <th scope="col">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.carModel}>
                      <td>{row.carModel}</td>
                      <td>{number(row.orderCount)}</td>
                      <td>{formatMoney(row.totalSales)}</td>
                      <td><button className="s-act" onClick={() => setSelected(row)}>เปิดดู</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!errors['sales-by-model'] && !rows.length && (
              <p className="empty-state">{loading && !models.length ? 'กำลังโหลด…' : search ? 'ไม่พบรุ่นรถที่ค้นหา' : 'ยังไม่มียอดขาย'}</p>
            )}
          </div>
          <div className="s-card-f">แสดง {rows.length} จาก {models.length} รุ่น</div>
        </section>

        {limitWarnings.map((warning) => <p key={warning} className="mt-2 text-sm text-amber-700">คำเตือน: {warning}</p>)}
      </main>
      {selected && <ModelDialog selected={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
