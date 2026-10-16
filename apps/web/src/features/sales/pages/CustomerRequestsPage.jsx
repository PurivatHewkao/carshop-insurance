// apps/web/src/features/sales/pages/CustomerRequestsPage.jsx
import React, { useState } from 'react';
import { salesStore, CAR_MODELS } from '../api/mockSalesData';
import '../sales.css';

export default function CustomerRequestsPage() {
  const [requests, setRequests] = useState(() => salesStore.getRequests());
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    type: 'ทดลองขับ (Test Drive)',
    carModel: CAR_MODELS[0],
    preferredDate: '2026-10-25',
    preferredTime: '10:00',
    note: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerName || !form.phone) return;

    const newReq = {
      id: `REQ-2026-00${requests.length + 1}`,
      ...form,
      status: 'PENDING',
      assignedSeller: null,
    };

    const updated = [newReq, ...requests];
    setRequests(updated);
    salesStore.saveRequests(updated);

    setForm({
      ...form,
      customerName: '',
      phone: '',
      note: '',
    });
  };

  const handleCancel = (id) => {
    const updated = requests.map((r) =>
      r.id === id ? { ...r, status: 'CANCELLED' } : r
    );
    setRequests(updated);
    salesStore.saveRequests(updated);
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>ระบบนัดหมายโชว์รูม (Customer Appointments)</h1>
          <p>จัดการคิวทดลองขับ จองรถ และนัดหมายปรึกษาเจ้าหน้าที่ฝ่ายขาย</p>
        </div>
      </div>

      <div className="sales-grid-layout">
        {/* ฟอร์มสร้างนัดหมาย */}
        <div className="sales-card">
          <h2 className="sales-card-title" style={{ borderBottom: '2px solid #eff6ff', paddingBottom: '10px' }}>
            📅 สร้างรายการนัดหมาย
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="sales-form-group">
              <label>ชื่อ - นามสกุลลูกค้า *</label>
              <input
                type="text"
                className="sales-input"
                placeholder="ระบุชื่อของคุณ"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
              />
            </div>

            <div className="sales-form-group">
              <label>เบอร์โทรศัพท์ติดต่อ *</label>
              <input
                type="tel"
                className="sales-input"
                placeholder="08X-XXX-XXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            <div className="sales-form-group">
              <label>ประเภทบริการ</label>
              <select
                className="sales-select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="ทดลองขับ (Test Drive)">ทดลองขับ (Test Drive)</option>
                <option value="ปรึกษาประกันภัยและไฟแนนซ์">ปรึกษาประกันภัยและไฟแนนซ์</option>
                <option value="ขอใบเสนอราคารถใหม่">ขอใบเสนอราคารถใหม่</option>
                <option value="นัดรับรถ / ตรวจเช็คเอกสาร">นัดรับรถ / ตรวจเช็คเอกสาร</option>
              </select>
            </div>

            <div className="sales-form-group">
              <label>รุ่นรถที่สนใจ</label>
              <select
                className="sales-select"
                value={form.carModel}
                onChange={(e) => setForm({ ...form, carModel: e.target.value })}
              >
                {CAR_MODELS.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="sales-form-group">
                <label>วันที่นัดหมาย</label>
                <input
                  type="date"
                  className="sales-input"
                  value={form.preferredDate}
                  onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                />
              </div>
              <div className="sales-form-group">
                <label>เวลานัดหมาย</label>
                <input
                  type="time"
                  className="sales-input"
                  value={form.preferredTime}
                  onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
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

            <button type="submit" className="sales-btn sales-btn-primary" style={{ width: '100%', padding: '12px' }}>
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
                      <strong style={{ color: '#2563eb' }}>{req.id}</strong>
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
                      {req.status === 'PENDING' ? (
                        <button
                          onClick={() => handleCancel(req.id)}
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