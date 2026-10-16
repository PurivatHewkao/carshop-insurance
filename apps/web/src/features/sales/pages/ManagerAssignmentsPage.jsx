// apps/web/src/features/sales/pages/ManagerAssignmentsPage.jsx
import React, { useState } from 'react';
import { salesStore, SELLERS_LIST } from '../api/mockSalesData';
import '../sales.css';

export default function ManagerAssignmentsPage() {
  const [requests, setRequests] = useState(() => salesStore.getRequests());
  const [selectedSellers, setSelectedSellers] = useState({});

  const handleAssign = (req) => {
    const chosenSeller = selectedSellers[req.id] || SELLERS_LIST[0].name;

    // 1. อัปเดตสถานะใน Requests
    const updatedRequests = requests.map((item) =>
      item.id === req.id
        ? { ...item, status: 'ASSIGNED', assignedSeller: chosenSeller }
        : item
    );
    setRequests(updatedRequests);
    salesStore.saveRequests(updatedRequests);

    // 2. สร้าง Task อัตโนมัติส่งไปยังหน้า SellerTasksPage
    const currentTasks = salesStore.getTasks();
    const newTask = {
      id: `TSK-${Math.floor(100 + Math.random() * 900)}`,
      requestId: req.id,
      customerName: req.customerName,
      phone: req.phone,
      taskTitle: `${req.type} - ${req.carModel}`,
      dueDate: `${req.preferredDate} ${req.preferredTime}`,
      sellerName: chosenSeller,
      priority: 'HIGH',
      status: 'PENDING',
      note: req.note || 'รับมอบหมายจากผู้จัดการทีมขาย',
    };
    salesStore.saveTasks([newTask, ...currentTasks]);
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>มอบหมายงานให้พนักงานขาย (Manager Seller Assignments)</h1>
          <p>กระจายคำขอลูกค้าให้ Seller ตามความเชี่ยวชาญและปริมาณงานในมือ</p>
        </div>
      </div>

      {/* ภาพรวมทีมขาย */}
      <div className="sales-stats-grid">
        {SELLERS_LIST.map((seller) => (
          <div key={seller.id} className="sales-stat-card">
            <div className="sales-stat-label">{seller.branch}</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
              {seller.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 600 }}>
              ดูแลลูกค้าอยู่: {
                requests.filter((r) => r.assignedSeller === seller.name).length
              } รายการ
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
                  <td><strong>{req.id}</strong></td>
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
                      value={selectedSellers[req.id] || req.assignedSeller || SELLERS_LIST[0].name}
                      onChange={(e) =>
                        setSelectedSellers({ ...selectedSellers, [req.id]: e.target.value })
                      }
                    >
                      {SELLERS_LIST.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
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