// apps/web/src/features/sales/pages/CustomerRequestsPage.jsx
import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createAppointment,
  fetchAppointments,
  fetchAppointmentAvailability,
  fetchCars,
  setAppointmentStatus,
} from '../api/salesApi.js';
import { useAction, useActorChoice, useSalesData } from '../hooks/useSalesData.js';
import { ActionError, LoadStatus } from '../components/SalesState.jsx';
import VehicleConfigurationPicker from '../components/VehicleConfigurationPicker.jsx';
import { fetchCars as fetchCatalogCars } from '../../catalog/api/catalogApi.js';
import '../sales.css';

const today = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
const SLOT_DURATION_MINUTES = 60;

function slotIsTaken(slot, bookedTimes) {
  const slotMinutes = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3, 5));
  return bookedTimes.some((time) => {
    const bookedMinutes = Number(String(time).slice(0, 2)) * 60 + Number(String(time).slice(3, 5));
    return Math.abs(slotMinutes - bookedMinutes) < SLOT_DURATION_MINUTES;
  });
}

function normalizeModel(value) {
  return String(value || '').toLocaleLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
}

function matchesRequestedModel(car, requestedName, requestedBrand) {
  const model = normalizeModel(car.modelName);
  const requested = normalizeModel(requestedName);
  const brandMatches = !requestedBrand || normalizeModel(car.brand) === normalizeModel(requestedBrand);
  return Boolean(requested && brandMatches && (model === requested || model.includes(requested) || requested.includes(model)));
}

export default function CustomerRequestsPage() {
  const [searchParams] = useSearchParams();
  const actor = useActorChoice('CUSTOMER', (a) => a.customerId);
  const cars = useSalesData((signal) => fetchCars(signal), []);
  const catalogModels = useSalesData(fetchCatalogCars, []);
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
  const requestedModel = searchParams.get('car') || '';
  const requestedBrand = searchParams.get('brand') || '';
  const requestedModelRef = searchParams.get('model') || '';
  const requestedSelection = { trim: searchParams.get('trim') || '', colorId: searchParams.get('colorId') || '', wheelId: searchParams.get('wheelId') || '' };
  const initialModel = requestedModelRef || catalogModels.data?.find((model) => normalizeModel(model.name) === normalizeModel(requestedModel) && (!requestedBrand || normalizeModel(model.brand) === normalizeModel(requestedBrand)))?.id || '';
  const [vehicleConfiguration, setVehicleConfiguration] = useState(null);
  const onVehicleChange = useCallback((value) => setVehicleConfiguration(value), []);
  const matchingSalesCar = vehicleConfiguration && carOptions.find((car) => car.modelId === vehicleConfiguration.modelId || matchesRequestedModel(car, vehicleConfiguration.modelName, vehicleConfiguration.modelBrand));
  const [form, setForm] = useState({
    appointmentType: searchParams.get('type') === 'นัดดูรถ' ? 'VIEW_CAR' : 'TEST_DRIVE',
    appointmentDate: today(),
    appointmentTime: '10:00',
    note: '',
  });
  const availability = useSalesData(
    (signal) => fetchAppointmentAvailability(form.appointmentDate, signal),
    [form.appointmentDate],
  );
  const selectedCarId = matchingSalesCar?.id || '';
  const bookedTimes = availability.data?.bookedTimes ?? [];
  const hasAvailableTimes = TIME_SLOTS.some((time) => !slotIsTaken(time, bookedTimes));
  const appointmentTime = form.appointmentTime && !slotIsTaken(form.appointmentTime, bookedTimes)
    ? form.appointmentTime
    : TIME_SLOTS.find((time) => !slotIsTaken(time, bookedTimes)) || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!actor.actorId || !selectedCarId || !vehicleConfiguration) return;
    const result = await action.run(() =>
      createAppointment({
        customerId: actor.actorId,
        carId: selectedCarId,
        vehicleConfiguration,
        appointmentType: form.appointmentType,
        appointmentDate: form.appointmentDate,
        appointmentTime,
        note: form.note,
      }),
    );
    if (result.ok) {
      setForm({ ...form, note: '' });
      list.reload();
      availability.reload();
    } else {
      availability.reload();
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
        loading={list.loading || actor.loading || cars.loading || catalogModels.loading || availability.loading}
        error={list.error || actor.error || cars.error || catalogModels.error || availability.error}
        hasData={list.data !== null}
        onRetry={() => { list.reload(); actor.reload(); cars.reload(); catalogModels.reload(); availability.reload(); }}
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
              <VehicleConfigurationPicker models={catalogModels.data || []} initialModel={initialModel} initialSelection={requestedSelection} onChange={onVehicleChange} />
              {vehicleConfiguration && !matchingSalesCar && <small className="sales-slot-help">ยังไม่มีรถรุ่นนี้ในรายการนัดหมายของโชว์รูม</small>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="sales-form-group">
                <label>วันที่นัดหมาย</label>
                <input
                  type="date"
                  className="sales-input"
                  min={today()}
                  required
                  value={form.appointmentDate}
                  onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                />
              </div>
              <div className="sales-form-group">
                <label>เวลานัดหมาย</label>
                <select
                  className="sales-select"
                  value={appointmentTime}
                  onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                  required
                  disabled={availability.loading || Boolean(availability.error) || !hasAvailableTimes}
                >
                  {!appointmentTime && <option value="" disabled>ไม่มีช่วงเวลาว่าง</option>}
                  {TIME_SLOTS.map((time) => {
                    const unavailable = slotIsTaken(time, bookedTimes);
                    return <option key={time} value={time} disabled={unavailable}>{time} น. {unavailable ? '· มีผู้จองแล้ว' : ''}</option>;
                  })}
                </select>
                <small className="sales-slot-help">แต่ละช่วงใช้เวลา 1 ชั่วโมง เวลาที่มีคิวแล้วจะเลือกไม่ได้</small>
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

            <button type="submit" disabled={action.busy || availability.loading || Boolean(availability.error) || !actor.actorId || !selectedCarId || !appointmentTime} className="sales-btn sales-btn-primary" style={{ width: '100%', padding: '12px' }}>
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
