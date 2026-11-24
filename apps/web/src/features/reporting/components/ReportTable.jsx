import { formatMoney, getRows } from '../hooks/useReports.js';
import { REPORT_COLUMNS, formatDate, statusText } from './reportFormat.js';

function renderCell(row, [key, , type]) {
  const value = key === 'createdAt' && row.createdAt == null ? row.issueDate : row[key];
  if (type === 'yesno') return value ? 'ได้ (ช้าเกิน 30 วัน)' : '—';
  if (value == null || value === '') return '—';
  if (type === 'money') return formatMoney(value);
  if (type === 'number') return new Intl.NumberFormat('th-TH').format(Number(value));
  if (type === 'status') return statusText(value);
  if (type === 'date') return formatDate(value);
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export default function ReportTable({ title, reportKey, columnsKey = reportKey, value, loading, error, emptyText = 'ไม่พบข้อมูลในช่วงวันที่ที่เลือก' }) {
  const rows = getRows(value);
  const columns = REPORT_COLUMNS[columnsKey] || Object.keys(rows[0] || {}).filter((key) => key !== 'id').map((key) => [key, key]);
  return (
    <section className="s-card min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {loading ? <span className="status loading">กำลังโหลด</span> : !error && <span className="text-xs" style={{ color: 'var(--mute)' }}>{rows.length} รายการ</span>}
      </div>
      {error ? (
        <div className="notice" role="alert">
          <strong>ยังดึงข้อมูลรายงานไม่ได้</strong>
          <p className="mt-1">{error}</p>
        </div>
      ) : loading && !rows.length ? (
        <p className="text-sm" style={{ color: 'var(--mute)' }}>กำลังติดต่อ Reporting API…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--mute)' }}>{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--mute)' }}>
                {columns.map(([key, label]) => <th key={key} className="px-3 py-2 font-medium">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || row.period || row.carModel || row.sellerId || index} style={{ borderBottom: '1px solid var(--line)' }}>
                  {columns.map((column) => <td key={column[0]} className="px-3 py-3">{renderCell(row, column)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
