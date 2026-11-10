// apps/web/src/features/sales/pages/ManagerAssignmentsPage.jsx
import React, { useState } from 'react';
import { assignAppointment, fetchAppointments, fetchSellers } from '../api/salesApi.js';
import { resolveManagerId } from '../api/actor.js';
import { useAction, useSalesData } from '../hooks/useSalesData.js';
import { ActionError, LoadStatus } from '../components/SalesState.jsx';
import '../sales.css';

export default function ManagerAssignmentsPage() {
  const sellerList = useSalesData((signal) => fetchSellers(signal), []);
  // Only appointments that have not been accepted yet can be (re)assigned.
  const requestList = useSalesData(
    (signal) => fetchAppointments({ status: 'PENDING' }, signal),
    [],
  );
  const action = useAction();
  const sellers = sellerList.data ?? [];
  const requests = requestList.data ?? [];
  const [selectedSellers, setSelectedSellers] = useState({});

  const handleAssign = async (req) => {
    const sellerId = selectedSellers[req.id] || req.sellerId || sellers[0]?.id;
    if (!sellerId) return;
    const result = await action.run(async () => {
      const assignedBy = await resolveManagerId();
      return assignAppointment(req.id, {
        sellerId,
        assignedBy,
        note: req.note || 'รับมอบหมายจากผู้จัดการทีมขาย',
      });
    });
    if (result.ok) {
      requestList.reload();
      sellerList.reload();
    }
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>มอบหมายงานให้พนักงานขาย (Manager Seller Assignments)</h1>
          <p>กระจายคำขอลูกค้าให้ Seller ตามความเชี่ยวชาญและปริมาณงานในมือ</p>
        </div>
      </div>

      <ActionError message={action.error} onClose={action.clearError} />
      <LoadStatus
        loading={sellerList.loading || requestList.loading}
        error={sellerList.error || requestList.error}
        hasData={sellerList.data !== null && requestList.data !== null}
        onRetry={() => { sellerList.reload(); requestList.reload(); }}
      />

      {/* ภาพรวมทีมขาย */}
      <div className="sales-stats-grid">
        {sellers.map((seller) => (
          <div key={seller.id} className="sales-stat-card">
            <div className="sales-stat-label">{seller.branch}</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
              {seller.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 600 }}>
              ดูแลลูกค้าอยู่: {seller.activeTasks} รายการ
            </div>
          </div>
        ))}
      </div>

      {/* ตารางจ่ายงาน */}
      <div className="sales-card">
        <h2 className="sales-card-title">รายการคำขอที่รอมอบหมายและจัดการผู้ดูแล</h2>
        <div className="sales-table-wrapper">
          <table className="sales-table">
            <thead>
              <tr>
                <th>รหัสคำขอ</th>
                <th>ลูกค้า</th>
                <th>รายละเอียดความต้องการ</th>
                <th>วันนัดหมาย</th>
                <th>สถานะปัจจุบัน</th>
                <th>เลือก Seller ผู้รับผิดชอบ</th>
                <th>ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td><strong>{req.code}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.customerName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{req.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{req.carModel}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{req.type}</div>
                  </td>
                  <td>{req.preferredDate} {req.preferredTime}</td>
                  <td>
                    <span className={`sales-badge ${
                      req.status === 'PENDING' ? 'badge-pending' : 'badge-assigned'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="sales-select"
                      value={selectedSellers[req.id] || req.sellerId || sellers[0]?.id || ''}
                      onChange={(e) =>
                        setSelectedSellers({ ...selectedSellers, [req.id]: e.target.value })
                      }
                    >
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      disabled={action.busy || sellers.length === 0}
                      onClick={() => handleAssign(req)}
                      className="sales-btn sales-btn-primary sales-btn-sm"
                    >
                      {req.assignedSeller ? 'เปลี่ยนผู้ดูแล' : 'มอบหมายงาน'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}