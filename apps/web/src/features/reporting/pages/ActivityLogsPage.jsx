import { useEffect, useState } from 'react';
import { getActivityLogs, getReport } from '../api/client.js';
import ReportTabs from '../components/ReportTabs.jsx';
import { formatDate, statusText } from '../components/reportFormat.js';
import { getMessage } from '../hooks/useReports.js';

const ACTION_LABELS = {
  ORDER_CREATED: 'สร้างออเดอร์',
  APPOINTMENT_REQUESTED: 'ขอนัดหมาย',
  PAYMENT_RECORDED: 'ชำระเงิน',
  INVOICE_ISSUED: 'ออกใบแจ้งหนี้',
  REFUND_REQUESTED: 'ขอคืนเงิน',
  REFUND_REVIEWED: 'พิจารณาคืนเงิน',
  FINANCE_REQUEST_CREATED: 'ส่งคำขอการเงิน',
  FINANCE_REQUEST_REPLIED: 'ตอบคำขอการเงิน',
};
const ROLE_LABELS = { admin: 'Admin', manager: 'ผู้จัดการ', seller: 'พนักงานขาย', finance: 'การเงิน', customer: 'ลูกค้า', system: 'ระบบ' };
const SOURCE_LABELS = { orders: 'ออเดอร์', appointments: 'นัดหมาย', payments: 'การชำระเงิน', invoices: 'ใบแจ้งหนี้', refunds: 'คืนเงิน', financeRequests: 'คำขอการเงิน' };
const SERVICES = ['', 'identity', 'catalog', 'sales', 'payment', 'reporting'];
const inputStyle = { borderColor: 'var(--line2)', background: 'var(--bg)', color: 'var(--ink)' };
const muted = { color: 'var(--mute)' };

function Filters({ service, setService, services, dateFrom, setDateFrom, dateTo, setDateTo }) {
  return (
    <section className="s-card mb-5 grid gap-4 sm:grid-cols-3">
      <label className="grid gap-1 text-sm font-medium">บริการ
        <select className="rounded-lg border px-3 py-2" style={inputStyle} value={service} onChange={(event) => setService(event.target.value)}>
          {services.map((item) => <option key={item || 'all'} value={item}>{item || 'ทั้งหมด'}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">ตั้งแต่วันที่
        <input className="rounded-lg border px-3 py-2" style={inputStyle} type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm font-medium">ถึงวันที่
        <input className="rounded-lg border px-3 py-2" style={inputStyle} type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
      </label>
    </section>
  );
}

function Table({ headings, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--mute)' }}>
            {headings.map((heading) => <th key={heading} className="px-3 py-2 font-medium">{heading}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// "ใครทำอะไร" built by Reporting from Sales/Payment records (works today).
function TransactionActivity({ service, dateFrom, dateTo, refresh }) {
  const requestKey = JSON.stringify([service, dateFrom, dateTo, refresh]);
  const [state, setState] = useState({ key: null, data: null, error: '' });
  const loading = state.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    const params = { limit: 200 };
    if (service === 'sales' || service === 'payment') params.service = service;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    getReport('activity', params, controller.signal)
      .then((data) => setState({ key: requestKey, data, error: '' }))
      .catch((err) => {
        if (!controller.signal.aborted) setState({ key: requestKey, data: null, error: getMessage(err) });
      });
    return () => controller.abort();
  }, [service, dateFrom, dateTo, refresh, requestKey]);

  const items = state.data?.items || [];
  const failedSources = Object.entries(state.data?.sources || {}).filter(([, value]) => value !== 'ok');
  const notCovered = service && service !== 'sales' && service !== 'payment';

  return (
    <section className="s-card mb-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">กิจกรรมจากข้อมูลธุรกรรม</h2>
          <p className="text-sm" style={muted}>ใครสร้างออเดอร์ ขอนัดหมาย ชำระเงิน ออกใบแจ้งหนี้ และคืนเงิน (Sales และ Payment)</p>
        </div>
        {loading ? <span className="status loading">กำลังโหลด</span> : !state.error && <span className="text-xs" style={muted}>{state.data?.total ?? 0} รายการ</span>}
      </div>
      {notCovered ? (
        <p className="text-sm" style={muted}>บริการ {service} ยังไม่มีข้อมูลกิจกรรมจากธุรกรรม ดูส่วน Activity Logs ด้านล่าง</p>
      ) : state.error ? (
        <div className="notice" role="alert"><strong>โหลดกิจกรรมไม่สำเร็จ</strong><p className="mt-1">{state.error}</p></div>
      ) : loading && !items.length ? (
        <p className="text-sm" style={muted}>กำลังโหลดข้อมูล…</p>
      ) : !items.length ? (
        <p className="text-sm" style={muted}>ไม่มีกิจกรรมในช่วงวันที่ที่เลือก</p>
      ) : (
        <Table headings={['วันเวลา', 'ผู้ทำรายการ', 'บทบาท', 'กิจกรรม', 'รายการ', 'รายละเอียด', 'สถานะ']}>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
              <td className="px-3 py-3 whitespace-nowrap">{formatDate(item.dateOnly ? item.day : item.occurredAt)}</td>
              <td className="px-3 py-3">{item.actor || '—'}</td>
              <td className="px-3 py-3">{ROLE_LABELS[item.actorRole] || '—'}</td>
              <td className="px-3 py-3">{ACTION_LABELS[item.action] || item.action}</td>
              <td className="px-3 py-3">{item.entity || '—'}</td>
              <td className="px-3 py-3">{item.detail || '—'}</td>
              <td className="px-3 py-3">{item.status ? statusText(item.status) : '—'}</td>
            </tr>
          ))}
        </Table>
      )}
      {failedSources.length > 0 && (
        <p className="mt-3 text-xs" style={{ color: 'var(--warn)' }}>
          ดึงข้อมูลบางส่วนไม่ได้: {failedSources.map(([key, value]) => `${SOURCE_LABELS[key] || key} (${value})`).join(', ')}
        </p>
      )}
      {state.data?.truncated && <p className="mt-2 text-xs" style={{ color: 'var(--warn)' }}>แสดง 200 รายการล่าสุด กรองช่วงวันที่เพื่อดูรายการก่อนหน้า</p>}
      <p className="mt-3 text-xs" style={muted}>ออเดอร์มีเฉพาะวันที่ (ไม่มีเวลา) ตามข้อมูลจาก Sales API · ยังไม่มีเหตุการณ์อนุมัติ/แก้ไขข้อมูลรถ/ล็อกอิน จนกว่าเจ้าของ service จะส่ง Activity events</p>
    </section>
  );
}

// Events stored in Reporting MongoDB (filled once services send events).
function StoredActivityLogs({ service, dateFrom, dateTo, refresh }) {
  const [cursor, setCursor] = useState('');
  const [history, setHistory] = useState([]);
  const filterKey = JSON.stringify([service, dateFrom, dateTo]);
  const [pagedFilter, setPagedFilter] = useState(filterKey);
  // Reset paging when the filters change (state adjusted during render).
  if (pagedFilter !== filterKey) {
    setPagedFilter(filterKey);
    setCursor('');
    setHistory([]);
  }
  const requestKey = JSON.stringify([filterKey, cursor, refresh]);
  const [state, setState] = useState({ key: null, items: [], nextCursor: null, error: '' });
  const loading = state.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    const params = { limit: 25 };
    if (service) params.service = service;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (cursor) params.cursor = cursor;
    getActivityLogs(params, controller.signal)
      .then((data) => setState({ key: requestKey, items: data?.items || [], nextCursor: data?.nextCursor || null, error: '' }))
      .catch((err) => {
        if (!controller.signal.aborted) setState({ key: requestKey, items: [], nextCursor: null, error: getMessage(err) });
      });
    return () => controller.abort();
  }, [service, dateFrom, dateTo, cursor, refresh, requestKey]);

  return (
    <section className="s-card">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Activity Logs (MongoDB)</h2>
        <p className="text-sm" style={muted}>เหตุการณ์ที่ service ต่าง ๆ ส่งมาบันทึกที่ Reporting</p>
      </div>
      {state.error ? <div className="notice" role="alert"><strong>โหลด Activity Logs ไม่สำเร็จ</strong><p className="mt-1">{state.error}</p></div>
        : loading ? <p className="text-sm" style={muted}>กำลังโหลดข้อมูล…</p>
          : state.items.length ? (
            <Table headings={['วันเวลา', 'ผู้ใช้งาน', 'บทบาท', 'บริการ', 'กิจกรรม', 'รายการ', 'รายละเอียด']}>
              {state.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-3 py-3">{formatDate(item.occurredAt)}</td>
                  <td className="px-3 py-3">{item.actorUserId || 'ระบบ'}</td>
                  <td className="px-3 py-3">{ROLE_LABELS[item.actorRole] || item.actorRole || '—'}</td>
                  <td className="px-3 py-3">{item.service || '—'}</td>
                  <td className="px-3 py-3">{item.action || '—'}</td>
                  <td className="px-3 py-3">{[item.entityType, item.entityId].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="px-3 py-3">{item.metadata && Object.keys(item.metadata).length ? JSON.stringify(item.metadata) : '—'}</td>
                </tr>
              ))}
            </Table>
          ) : <p className="text-sm" style={muted}>ยังไม่มี Activity Logs ในเงื่อนไขที่เลือก — service ต้นทางยังไม่ได้ส่ง event มาบันทึก</p>}
      {(history.length > 0 || state.nextCursor) && (
        <div className="mt-4 flex justify-end gap-2">
          {history.length > 0 && <button type="button" className="s-btn" disabled={loading} onClick={() => { setCursor(history[history.length - 1]); setHistory((items) => items.slice(0, -1)); }}>รายการก่อนหน้า</button>}
          {state.nextCursor && <button type="button" className="s-btn" disabled={loading} onClick={() => { setHistory((items) => [...items, cursor]); setCursor(state.nextCursor); }}>รายการถัดไป</button>}
        </div>
      )}
    </section>
  );
}

export default function ActivityLogsPage({ base = '' }) {
  const [service, setService] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refresh, setRefresh] = useState(0);

  return (
    <main className="page-content admin-content">
      <header className="s-ph">
        <div>
          <p className="s-crumb">Workspace / รายงาน / Audit</p>
          <h1>ประวัติกิจกรรม</h1>
          <p>ใครทำอะไรบ้างในระบบ</p>
        </div>
        <button className="s-btn" type="button" onClick={() => setRefresh((value) => value + 1)}>รีเฟรช</button>
      </header>
      <ReportTabs base={base} />
      <Filters service={service} setService={setService} services={SERVICES} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <TransactionActivity service={service} dateFrom={dateFrom} dateTo={dateTo} refresh={refresh} />
      <StoredActivityLogs service={service} dateFrom={dateFrom} dateTo={dateTo} refresh={refresh} />
    </main>
  );
}
