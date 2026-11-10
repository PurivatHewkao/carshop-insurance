// apps/web/src/features/sales/pages/CustomerRequestsPage.jsx
import React, { useState } from 'react';
import {
  createAppointment,
  fetchAppointments,
  fetchCars,
  fetchCustomers,
  setAppointmentStatus,
} from '../api/salesApi.js';
import { useAction, useActorChoice, useSalesData } from '../hooks/useSalesData.js';
import { ActionError, ActorSwitcher, LoadStatus } from '../components/SalesState.jsx';
import '../sales.css';

const today = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

export default function CustomerRequestsPage() {
  const actor = useActorChoice('CUSTOMER', fetchCustomers, (a) => a.customerId);
  const cars = useSalesData((signal) => fetchCars(signal), []);
  const list = useSalesData(
    (signal) =>
      actor.actorId
        ? fetchAppointments({ customerId: actor.actorId }, signal)
        : Promise.resolve([]),
    [actor.actorId],
  );
  const action = useAction();
  const requests = list.data ?? [];
  const carOptions = cars.data ?? [];
  const [form, setForm] = useState({
    carId: '',
    appointmentType: 'TEST_DRIVE',
    appointmentDate: today(),
    appointmentTime: '10:00',
    note: '',
  });
  const selectedCarId = form.carId || carOptions[0]?.id || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!actor.actorId || !selectedCarId) return;
    const result = await action.run(() =>
      createAppointment({
        customerId: actor.actorId,
        carId: selectedCarId,
        appointmentType: form.appointmentType,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        note: form.note,
      }),
    );
    if (result.ok) {
      setForm({ ...form, note: '' });
      list.reload();
    }
  };

  const handleCancel = async (id) => {
    const result = await action.run(() => setAppointmentStatus(id, 'CANCELLED'));
    if (result.ok) list.reload();
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>ระบบนัดหมายโชว์รูม (Customer Appointments)</h1>
          <p>จัดการคิวทดลองขับ จองรถ และนัดหมายปรึกษาเจ้าหน้าที่ฝ่ายขาย</p>
        </div>
      </div>

      <ActionError message={action.error} onClose={action.clearError} />
      <LoadStatus
        loading={list.loading || actor.loading || cars.loading}
        error={list.error || actor.error || cars.error}
        hasData={list.data !== null}
        onRetry={() => { list.reload(); actor.reload(); cars.reload(); }}
      />
      <ActorSwitcher
        label="ลูกค้า"
        options={actor.options}
        value={actor.actorId}
        onChange={actor.pick}
        isStandIn={actor.isStandIn}
      />

      <div className="sales-grid-layout">
        {/* ฟอร์มสร้างนัดหมาย */}
        <div className="sales-card">
          <h2 className="sales-card-title" style={{ borderBottom: '2px solid #eff6ff', paddingBottom: '10px' }}>
            📅 สร้างรายการนัดหมาย
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="sales-form-group">
              <label>ประเภทบริการ</label>
              <select
                className="sales-select"
                value={form.appointmentType}
                onChange={(e) => setForm({ ...form, appointmentType: e.target.value })}
              >
                <option value="TEST_DRIVE">ทดลองขับ (Test Drive)</option>
                <option value="VIEW_CAR">นัดดูรถ</option>
              </select>
            </div>

            <div className="sales-form-group">
              <label>รถที่สนใจ</label>
              <select
                className="sales-select"
                value={selectedCarId}
                onChange={(e) => setForm({ ...form, carId: e.target.value })}
                required
              >
                {carOptions.map((car) => (
                  <option key={car.id} value={car.id}>{car.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="sales-form-group">
                <label>วันที่นัดหมาย</label>
                <input
                  type="date"
                  className="sales-input"
                  min={today()}
                  value={form.appointmentDate}
                  onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                />
              </div>
              <div className="sales-form-group">
                <label>เวลานัดหมาย</label>
                <input
                  type="time"
                  className="sales-input"
                  value={form.appointmentTime}
                  onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                />
              </div>
            </div>

            <div className="sales-form-group">
              <label>หมายเหตุเพิ่มเติม</label>
              <textarea
                rows="3"
                className="sales-textarea"
                placeholder="ระบุความต้องการเพิ่มเติม..."
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <button type="submit" disabled={action.busy || !actor.actorId || !selectedCarId} className="sales-btn sales-btn-primary" style={{ width: '100%', padding: '12px' }}>
              + บันทึกการนัดหมาย
            </button>
          </form>
        </div>

        {/* ตารางแสดงรายการนัดหมาย */}
        <div className="sales-card">
          <h2 className="sales-card-title" style={{ borderBottom: '2px solid #eff6ff', paddingBottom: '10px' }}>
            📋 ตารางคิวและประวัติการนัดหมาย ({requests.length})
          </h2>

          <div className="sales-table-wrapper">
            <table className="sales-table" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>รหัส / ประเภท</th>
                  <th style={{ width: '25%' }}>ลูกค้า</th>
                  <th style={{ width: '25%' }}>วัน-เวลา</th>
                  <th style={{ width: '18%' }}>สถานะ</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <strong style={{ color: '#2563eb' }}>{req.code}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{req.type}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>{req.carModel}</div>
                    </td>
                    <td>
                      <div>{req.preferredDate}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{req.preferredTime} น.</div>
                    </td>
                    <td>
                      <span className={`sales-badge ${
                        req.status === 'PENDING' ? 'badge-pending' :
                        req.status === 'ASSIGNED' ? 'badge-assigned' :
                        req.status === 'COMPLETED' ? 'badge-completed' : 'badge-cancelled'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {['PENDING', 'ASSIGNED'].includes(req.status) ? (
                        <button
                          onClick={() => handleCancel(req.id)}
                          disabled={action.busy}
                          className="sales-btn sales-btn-outline sales-btn-sm"
                          style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                        >
                          ยกเลิก
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}