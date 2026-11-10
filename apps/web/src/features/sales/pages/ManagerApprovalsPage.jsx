// apps/web/src/features/sales/pages/ManagerApprovalsPage.jsx
import React, { useState } from 'react';
import { decideOrder, fetchOrders } from '../api/salesApi.js';
import { useAction, useSalesData } from '../hooks/useSalesData.js';
import { ActionError, LoadStatus } from '../components/SalesState.jsx';
import '../sales.css';

export default function ManagerApprovalsPage() {
  const list = useSalesData((signal) => fetchOrders({}, signal), []);
  const action = useAction();
  const orders = list.data ?? [];
  const [comments, setComments] = useState({});

  const handleDecision = async (orderId, decision) => {
    const commentText =
      comments[orderId] ||
      (decision === 'APPROVED'
        ? 'อนุมัติรายการขายและส่วนลดตามเสนอ'
        : 'ไม่อนุมัติ เนื่องจากส่วนลดเกินเพดานแคมเปญ');
    const result = await action.run(() => decideOrder(orderId, decision, commentText));
    if (result.ok) list.reload();
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>อนุมัติรายการขายและส่วนลด (Manager Order Approvals)</h1>
          <p>ตรวจสอบใบจองรถยนต์ แคมเปญประกันภัย และอนุมัติวงเงินส่วนลดของทีม Seller</p>
        </div>
      </div>

      <ActionError message={action.error} onClose={action.clearError} />
      <LoadStatus
        loading={list.loading}
        error={list.error}
        hasData={list.data !== null}
        onRetry={list.reload}
      />

      <div className="sales-stats-grid">
        <div className="sales-stat-card">
          <div className="sales-stat-label">รออนุมัติ (Pending Approval)</div>
          <div className="sales-stat-value" style={{ color: '#d97706' }}>
            {orders.filter((o) => o.status === 'PENDING_APPROVAL').length}
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">อนุมัติแล้ว (Approved)</div>
          <div className="sales-stat-value" style={{ color: '#16a34a' }}>
            {orders.filter((o) => o.status === 'APPROVED').length}
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">ส่งกลับแก้ไข / ไม่อนุมัติ</div>
          <div className="sales-stat-value" style={{ color: '#dc2626' }}>
            {orders.filter((o) => o.status === 'REJECTED').length}
          </div>
        </div>
      </div>

      <div className="sales-card">
        <h2 className="sales-card-title">รายการใบสั่งซื้อที่ส่งขออนุมัติ</h2>
        <div className="sales-table-wrapper">
          <table className="sales-table">
            <thead>
              <tr>
                <th>เลขที่ Order</th>
                <th>ลูกค้า / ผู้ขาย</th>
                <th>รถยนต์และประกันภัย</th>
                <th>รายละเอียดราคา</th>
                <th>สถานะ</th>
                <th>ความเห็นผู้จัดการ</th>
                <th>การอนุมัติ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord.id}>
                  <td><strong>{ord.code}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ord.customerName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ผู้ขาย: {ord.sellerName}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ord.carModel}</div>
                    <div style={{ fontSize: '0.8rem', color: '#2563eb' }}>{ord.insurancePlan}</div>
                  </td>
                  <td>
                    <div>ยอดสุทธิ: <strong>฿{ord.totalAmount.toLocaleString()}</strong></div>
                    <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>
                      ขอส่วนลด: ฿{ord.discount.toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <span className={`sales-badge ${
                      ord.status === 'PENDING_APPROVAL' ? 'badge-pending' :
                      ord.status === 'APPROVED' ? 'badge-approved' : 'badge-rejected'
                    }`}>
                      {ord.status}
                    </span>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="sales-input"
                      placeholder="ระบุเหตุผล/หมายเหตุ..."
                      value={comments[ord.id] ?? ord.managerComment}
                      onChange={(e) =>
                        setComments({ ...comments, [ord.id]: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <div className="sales-actions">
                      <button
                        onClick={() => handleDecision(ord.id, 'APPROVED')}
                        disabled={action.busy || ord.status !== 'PENDING_APPROVAL'}
                        className="sales-btn sales-btn-success sales-btn-sm"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => handleDecision(ord.id, 'REJECTED')}
                        disabled={action.busy || ord.status !== 'PENDING_APPROVAL'}
                        className="sales-btn sales-btn-danger sales-btn-sm"
                      >
                        ไม่อนุมัติ
                      </button>
                    </div>
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