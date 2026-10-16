// apps/web/src/features/sales/pages/SellerAppointmentsPage.jsx
import React, { useState } from 'react';
import { salesStore } from '../api/mockSalesData';
import '../sales.css';

export default function SellerAppointmentsPage() {
  const [requests, setRequests] = useState(() => salesStore.getRequests());

  // กรองเฉพาะนัดหมายที่มีการนัดวันเวลา
  const appointments = requests.filter(r => r.preferredDate);

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>ตารางนัดหมายของฉัน (Seller Appointments)</h1>
          <p>ตรวจสอบคิวทดลองขับ ปรึกษาไฟแนนซ์ และเวลานัดหมายกับลูกค้าประจำวัน</p>
        </div>
      </div>

      <div className="sales-stats-grid">
        <div className="sales-stat-card">
          <div className="sales-stat-label">นัดหมายทั้งหมด</div>
          <div className="sales-stat-value">{appointments.length}</div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">วันนี้</div>
          <div className="sales-stat-value" style={{ color: '#2563eb' }}>
            {appointments.filter(a => a.preferredDate === '2026-10-20').length} คิว
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">รอยืนยัน / มอบหมาย</div>
          <div className="sales-stat-value" style={{ color: '#d97706' }}>
            {appointments.filter(a => a.status === 'PENDING').length}
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
                <th style={{ width: '15%', textAlign: 'center' }}>สถานะคิว</th>
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
                    <td><strong style={{ color: '#2563eb' }}>{item.id}</strong></td>
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
                        item.status === 'ASSIGNED' ? 'badge-assigned' : 'badge-completed'
                      }`}>
                        {item.status}
                      </span>
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