import { useEffect, useState } from 'react';
import { getActivityLogs } from '../api/client.js';

const SERVICES = ['', 'identity', 'catalog', 'sales', 'payment', 'reporting'];
const messageOf = (error) => error?.response?.data?.error?.message || error?.message || 'ไม่สามารถโหลดประวัติกิจกรรมได้';

export default function ActivityLogsPage() {
  const [service, setService] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // cursor/history drive paging; refresh forces a re-fetch of the same page.
  const [cursor, setCursor] = useState('');
  const [history, setHistory] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const requestKey = JSON.stringify([service, dateFrom, dateTo, cursor, refresh]);
  const [state, setState] = useState({ key: null, items: [], nextCursor: null, error: '' });
  const loading = state.key !== requestKey;
  const { error } = state;
  const result = state;

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
        if (!controller.signal.aborted) setState({ key: requestKey, items: [], nextCursor: null, error: messageOf(err) });
      });
    return () => controller.abort();
  }, [service, dateFrom, dateTo, cursor, refresh, requestKey]);

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setCursor('');
    setHistory([]);
  };
  const nextPage = () => {
    if (!result.nextCursor || loading) return;
    setHistory((items) => [...items, cursor]);
    setCursor(result.nextCursor);
  };
  const previousPage = () => {
    if (!history.length || loading) return;
    setCursor(history[history.length - 1]);
    setHistory((items) => items.slice(0, -1));
  };

  return (
    <main className="page-content admin-content">
      <header className="s-ph">
        <div>
          <p className="s-crumb">Workspace / ผู้จัดการ / Audit</p>
          <h1>ประวัติกิจกรรม</h1>
          <p>ตรวจสอบว่าใครทำอะไรในระบบ จาก Activity Logs ที่บันทึกไว้</p>
        </div>
        <button className="button" type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>
          {loading ? 'กำลังโหลด…' : 'รีเฟรช'}
        </button>
      </header>

      <section className="s-card mb-5 grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">บริการ
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={service} onChange={changeFilter(setService)}>
            {SERVICES.map((item) => <option key={item || 'all'} value={item}>{item || 'ทั้งหมด'}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">ตั้งแต่วันที่
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={dateFrom} max={dateTo || undefined} onChange={changeFilter(setDateFrom)} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">ถึงวันที่
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={dateTo} min={dateFrom || undefined} onChange={changeFilter(setDateTo)} />
        </label>
      </section>

      <section className="s-card">
        {error ? <div className="notice" role="alert"><strong>โหลดประวัติกิจกรรมไม่สำเร็จ</strong><p className="mt-1">{error}</p></div>
          : loading ? <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>
            : result.items?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-slate-500">{['วันเวลา', 'ผู้ใช้งาน', 'บทบาท', 'บริการ', 'กิจกรรม', 'รายการ', 'รายละเอียด'].map((heading) => <th key={heading} className="px-3 py-2 font-medium">{heading}</th>)}</tr></thead>
              <tbody>{result.items.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-3">{item.occurredAt ? new Date(item.occurredAt).toLocaleString('th-TH') : '—'}</td>
                <td className="px-3 py-3">{item.actorUserId || 'ระบบ'}</td>
                <td className="px-3 py-3">{item.actorRole || '—'}</td>
                <td className="px-3 py-3">{item.service || '—'}</td>
                <td className="px-3 py-3">{item.action || '—'}</td>
                <td className="px-3 py-3">{[item.entityType, item.entityId].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-3 py-3">{item.metadata && Object.keys(item.metadata).length ? JSON.stringify(item.metadata) : '—'}</td>
              </tr>)}</tbody>
            </table></div>
            : <p className="text-sm text-slate-500">ยังไม่มี Activity Logs ในเงื่อนไขที่เลือก</p>}
        {(history.length > 0 || result.nextCursor) && <div className="mt-4 flex justify-end gap-2">
          {history.length > 0 && <button type="button" className="button" disabled={loading} onClick={previousPage}>รายการก่อนหน้า</button>}
          {result.nextCursor && <button type="button" className="button" disabled={loading} onClick={nextPage}>รายการถัดไป</button>}
        </div>}
        <p className="mt-4 text-xs text-slate-500">หมายเหตุ: หน้านี้อ่านข้อมูลจาก Reporting MongoDB เท่านั้น หาก Service ต้นทางยังไม่ส่ง event จะยังไม่มีรายการแสดง</p>
      </section>
    </main>
  );
}
