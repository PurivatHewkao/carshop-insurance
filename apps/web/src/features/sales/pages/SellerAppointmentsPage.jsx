// apps/web/src/features/sales/pages/SellerAppointmentsPage.jsx
import React from 'react';
import { fetchAppointments, fetchSellers, setAppointmentStatus } from '../api/salesApi.js';
import { useAction, useActorChoice, useSalesData } from '../hooks/useSalesData.js';
import { ActionError, ActorSwitcher, LoadStatus } from '../components/SalesState.jsx';
import '../sales.css';

const STAGES = [['PENDING', 'รอดำเนินการ'], ['CONFIRMED', 'ยืนยันแล้ว'], ['COMPLETED', 'เสร็จสิ้น'], ['CANCELLED', 'ยกเลิก']];

const today = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

export default function SellerAppointmentsPage() {
  const actor = useActorChoice('SELLER', fetchSellers, (a) => a.employeeId);
  const list = useSalesData(
    (signal) =>
      actor.actorId
        ? fetchAppointments({ sellerId: actor.actorId }, signal)
        : Promise.resolve([]),
    [actor.actorId],
  );
  const appointments = list.data ?? [];
  const action = useAction();
  async function updateStage(id, status) {
    const result = await action.run(() => setAppointmentStatus(id, status));
    if (result.ok) list.reload();
  }

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>ตารางนัดหมายของฉัน (Seller Appointments)</h1>
          <p>ตรวจสอบคิวทดลองขับ ปรึกษาไฟแนนซ์ และเวลานัดหมายกับลูกค้าประจำวัน</p>
        </div>
      </div>

      <LoadStatus
        loading={list.loading || actor.loading}
        error={list.error || actor.error}
        hasData={list.data !== null}
        onRetry={() => { list.reload(); actor.reload(); }}
      />
      <ActionError message={action.error} onClose={action.clearError} />
      <ActorSwitcher
        label="Seller"
        options={actor.options}
        value={actor.actorId}
        onChange={actor.pick}
        isStandIn={actor.isStandIn}
      />

      <div className="sales-stats-grid">
        <div className="sales-stat-card">
          <div className="sales-stat-label">นัดหมายทั้งหมด</div>
          <div className="sales-stat-value">{appointments.length}</div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">วันนี้</div>
          <div className="sales-stat-value" style={{ color: '#2563eb' }}>
            {appointments.filter((a) => a.preferredDate === today() && a.status !== 'CANCELLED').length} คิว
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">รอยืนยัน / มอบหมาย</div>
          <div className="sales-stat-value" style={{ color: '#d97706' }}>
            {appointments.filter((a) => a.taskStatus === 'PENDING').length}
          </div>
        </div>
      </div>

      <div className="sales-card">
        <h2 className="sales-card-title">📅 ปฏิทินและรายการคิวนัดหมายลูกค้า</h2>

        <div className="sales-table-wrapper">
          <table className="sales-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>รหัสคิว</th>
                <th style={{ width: '22%' }}>ชื่อลูกค้า / เบอร์โทร</th>
                <th style={{ width: '28%' }}>ประเภทนัดหมาย / รุ่นรถ</th>
                <th style={{ width: '20%' }}>วันและเวลานัดหมาย</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Stage / สถานะคิว</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="sales-empty">ไม่มีรายการนัดหมายในขณะนี้</td>
                </tr>
              ) : (
                appointments.map((item) => (
                  <tr key={item.id}>
                    <td><strong style={{ color: '#2563eb' }}>{item.code}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.type}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>{item.carModel}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>📅 {item.preferredDate}</div>
                      <div style={{ fontSize: '0.85rem', color: '#0284c7' }}>⏰ เวลา {item.preferredTime} น.</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`sales-badge ${
                        item.status === 'PENDING' ? 'badge-pending' :
                        item.status === 'ASSIGNED' ? 'badge-assigned' :
                        item.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-completed'
                      }`}>
                        {item.status}
                      </span>
                      <select aria-label={`เปลี่ยน stage ${item.code}`} className="sales-select sales-stage-select" value={item.dbStatus} onChange={(event) => updateStage(item.id, event.target.value)} disabled={action.busy}>
                        {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
