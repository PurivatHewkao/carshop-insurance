// apps/web/src/features/sales/pages/AdminRequestsPage.jsx
import React, { useState } from 'react';
import { salesStore } from '../api/mockSalesData';
import '../sales.css';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState(() => salesStore.getRequests());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const updateStatus = (id, newStatus) => {
    const updated = requests.map((item) =>
      item.id === id ? { ...item, status: newStatus } : item
    );
    setRequests(updated);
    salesStore.saveRequests(updated);
  };

  const deleteRequest = (id) => {
    const updated = requests.filter((item) => item.id !== id);
    setRequests(updated);
    salesStore.saveRequests(updated);
  };

  const filtered = requests.filter((r) => {
    const matchText =
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.carModel.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchText && matchStatus;
  });

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>จัดการคำขอลูกค้า (Admin Customer Requests)</h1>
          <p>ตรวจสอบ คัดกรอง และอัปเดตสถานะคำขอนัดหมายจากลูกค้าทุกช่องทาง</p>
        </div>
      </div>

      <div className="sales-stats-grid">
        <div className="sales-stat-card">
          <div className="sales-stat-label">คำขอทั้งหมด</div>
          <div className="sales-stat-value">{requests.length}</div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">รอดำเนินการ (Pending)</div>
          <div className="sales-stat-value" style={{ color: '#d97706' }}>
            {requests.filter((r) => r.status === 'PENDING').length}
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">มอบหมาย Seller แล้ว</div>
          <div className="sales-stat-value" style={{ color: '#2563eb' }}>
            {requests.filter((r) => r.status === 'ASSIGNED').length}
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">เสร็จสมบูรณ์</div>
          <div className="sales-stat-value" style={{ color: '#16a34a' }}>
            {requests.filter((r) => r.status === 'COMPLETED').length}
          </div>
        </div>
      </div>

      <div className="sales-card">
        <div className="sales-filter-bar">
          <input
            type="text"
            className="sales-input"
            style={{ maxWidth: '320px' }}
            placeholder="ค้นหาชื่อลูกค้า, รหัสคำขอ, รุ่นรถ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="sales-select"
            style={{ maxWidth: '200px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">ทุกสถานะ (All Status)</option>
            <option value="PENDING">PENDING (รอดำเนินการ)</option>
            <option value="ASSIGNED">ASSIGNED (มอบหมายแล้ว)</option>
            <option value="COMPLETED">COMPLETED (สำเร็จ)</option>
            <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
          </select>
        </div>

        <div className="sales-table-wrapper">
          <table className="sales-table">
            <thead>
              <tr>
                <th>รหัสคำขอ</th>
                <th>ข้อมูลลูกค้า</th>
                <th>บริการ / รุ่นรถ</th>
                <th>เวลานัดหมาย</th>
                <th>ผู้รับผิดชอบ</th>
                <th>สถานะ</th>
                <th>การจัดการ (Admin)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="sales-empty">ไม่พบรายการคำขอที่ค้นหา</td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.id}>
                    <td><strong>{req.id}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>โทร: {req.phone}</div>
                    </td>
                    <td>
                      <div>{req.type}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>{req.carModel}</div>
                      {req.note && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>หมายเหตุ: {req.note}</div>}
                    </td>
                    <td>{req.preferredDate} ({req.preferredTime})</td>
                    <td>{req.assignedSeller || '-'}</td>
                    <td>
                      <span className={`sales-badge ${
                        req.status === 'PENDING' ? 'badge-pending' :
                        req.status === 'ASSIGNED' ? 'badge-assigned' :
                        req.status === 'COMPLETED' ? 'badge-completed' : 'badge-cancelled'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <div className="sales-actions">
                        <button
                          onClick={() => updateStatus(req.id, 'COMPLETED')}
                          className="sales-btn sales-btn-success sales-btn-sm"
                        >
                          ปิดงาน
                        </button>
                        <button
                          onClick={() => deleteRequest(req.id)}
                          className="sales-btn sales-btn-outline sales-btn-sm"
                        >
                          ลบ
                        </button>
                      </div>
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