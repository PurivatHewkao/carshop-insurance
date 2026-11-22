import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAppointments } from '../api/salesApi.js';
import { LoadStatus } from '../components/SalesState.jsx';
import { useSalesData } from '../hooks/useSalesData.js';
import '../sales.css';

const STATUS_OPTIONS = [
  ['ALL', 'ทุกสถานะ'],
  ['PENDING', 'รอมอบหมาย'],
  ['ASSIGNED', 'มอบหมายแล้ว'],
  ['IN_PROGRESS', 'กำลังดำเนินการ'],
  ['COMPLETED', 'เสร็จสิ้น'],
  ['CANCELLED', 'ยกเลิก'],
];
const EMPTY_APPOINTMENTS = [];

export default function ManagerAppointmentsPage() {
  const list = useSalesData((signal) => fetchAppointments({}, signal), []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const appointments = list.data || EMPTY_APPOINTMENTS;
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return appointments.filter((item) => {
      const matchesStatus =
        status === 'ALL' ||
        item.status === status ||
        item.taskStatus === status;
      const matchesSearch =
        !term ||
        [
          item.code,
          item.customerName,
          item.phone,
          item.carModel,
          item.assignedSeller,
        ]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [appointments, search, status]);
  const pending = appointments.filter(
    (item) => item.status === 'PENDING',
  ).length;
  const assigned = appointments.filter(
    (item) => item.status === 'ASSIGNED',
  ).length;
  const active = appointments.filter(
    (item) => item.taskStatus === 'IN_PROGRESS',
  ).length;

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <p className="sales-eyebrow">MANAGER / APPOINTMENTS</p>
          <h1>ภาพรวมนัดหมาย</h1>
          <p>ติดตามคิวนัดหมาย การมอบหมาย Seller และสถานะงานทั้งหมด</p>
        </div>
        <button
          className="sales-btn sales-btn-outline"
          onClick={list.reload}
          disabled={list.loading}
        >
          รีเฟรชข้อมูล
        </button>
      </div>

      <LoadStatus
        loading={list.loading}
        error={list.error}
        hasData={list.data !== null}
        onRetry={list.reload}
      />

      <div className="sales-stats-grid">
        <article className="sales-stat-card">
          <div className="sales-stat-label">นัดหมายทั้งหมด</div>
          <div className="sales-stat-value">{appointments.length}</div>
        </article>
        <article className="sales-stat-card">
          <div className="sales-stat-label">รอมอบหมาย</div>
          <div className="sales-stat-value" style={{ color: '#d97706' }}>
            {pending}
          </div>
        </article>
        <article className="sales-stat-card">
          <div className="sales-stat-label">มอบหมายแล้ว</div>
          <div className="sales-stat-value" style={{ color: '#2563eb' }}>
            {assigned}
          </div>
        </article>
        <article className="sales-stat-card">
          <div className="sales-stat-label">กำลังดำเนินการ</div>
          <div className="sales-stat-value" style={{ color: '#0284c7' }}>
            {active}
          </div>
        </article>
      </div>

      <section className="sales-card">
        <div className="sales-filter-bar">
          <input
            className="sales-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาลูกค้า เบอร์โทร รุ่นรถ หรือรหัสนัด"
            aria-label="ค้นหานัดหมาย"
          />
          <select
            className="sales-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="กรองตามสถานะ"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sales-table-wrapper">
          <table className="sales-table">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ลูกค้า</th>
                <th>รายละเอียดนัดหมาย</th>
                <th>วันและเวลา</th>
                <th>Seller</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {!list.loading && visible.length === 0 ? (
                <tr>
                  <td colSpan="7" className="sales-empty">
                    ไม่พบรายการนัดหมาย
                  </td>
                </tr>
              ) : (
                visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.code}</strong>
                    </td>
                    <td>
                      <strong>{item.customerName}</strong>
                      <small className="sales-cell-subtitle">
                        {item.phone}
                      </small>
                    </td>
                    <td>
                      {item.type}
                      <small className="sales-cell-subtitle">
                        {item.carModel}
                      </small>
                    </td>
                    <td>
                      {item.preferredDate}
                      <small className="sales-cell-subtitle">
                        {item.preferredTime} น.
                      </small>
                    </td>
                    <td>{item.assignedSeller || 'ยังไม่มอบหมาย'}</td>
                    <td>
                      <span
                        className={`sales-badge ${item.status === 'COMPLETED' ? 'badge-completed' : item.status === 'CANCELLED' ? 'badge-cancelled' : item.status === 'ASSIGNED' ? 'badge-assigned' : 'badge-pending'}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.status === 'PENDING' ? (
                        <Link
                          className="sales-btn sales-btn-outline sales-btn-sm"
                          to="/manager/assignments"
                        >
                          มอบหมาย
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
