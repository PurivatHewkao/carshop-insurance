// apps/web/src/features/sales/pages/SellerOrdersPage.jsx
import React, { useState } from 'react';
import { salesStore, CAR_MODELS, INSURANCE_PLANS, SELLERS_LIST } from '../api/mockSalesData';
import '../sales.css';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState(() => salesStore.getOrders());
  const [form, setForm] = useState({
    customerName: '',
    carModel: CAR_MODELS[0],
    insurancePlan: INSURANCE_PLANS[0],
    carPrice: 1199000,
    insurancePrice: 24000,
    discount: 15000,
    sellerName: SELLERS_LIST[0].name,
  });

  const netTotal =
    Number(form.carPrice || 0) +
    Number(form.insurancePrice || 0) -
    Number(form.discount || 0);

  const handleCreateOrder = (e) => {
    e.preventDefault();
    if (!form.customerName) return;

    const newOrder = {
      id: `ORD-2026-${Math.floor(883 + orders.length)}`,
      ...form,
      carPrice: Number(form.carPrice),
      insurancePrice: Number(form.insurancePrice),
      discount: Number(form.discount),
      totalAmount: netTotal,
      createdAt: '2026-10-16',
      status: 'PENDING_APPROVAL',
      managerComment: 'รอผู้จัดการตรวจสอบส่วนลดและของแถม',
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    salesStore.saveOrders(updated);
    setForm({ ...form, customerName: '' });
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>สร้างและติดตามใบสั่งซื้อ (Seller Orders & Insurance)</h1>
          <p>ออกใบจองรถยนต์ควบคู่แพ็กเกจประกันภัย และส่งขออนุมัติจากผู้จัดการ</p>
        </div>
      </div>

      <div className="sales-grid-layout">
        {/* ฟอร์มสร้างใบจอง */}
        <div className="sales-card">
          <h2 className="sales-card-title">ออกใบสั่งซื้อ / ใบจองใหม่</h2>
          <form onSubmit={handleCreateOrder}>
            <div className="sales-form-group">
              <label>ชื่อลูกค้าผู้จอง *</label>
              <input
                type="text"
                className="sales-input"
                placeholder="ชื่อ-นามสกุลลูกค้า"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
              />
            </div>

            <div className="sales-form-group">
              <label>รุ่นรถยนต์</label>
              <select
                className="sales-select"
                value={form.carModel}
                onChange={(e) => setForm({ ...form, carModel: e.target.value })}
              >
                {CAR_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="sales-form-group">
              <label>แพ็กเกจประกันภัยรถยนต์</label>
              <select
                className="sales-select"
                value={form.insurancePlan}
                onChange={(e) => setForm({ ...form, insurancePlan: e.target.value })}
              >
                {INSURANCE_PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="sales-form-group">
                <label>ราคารถยนต์ (บาท)</label>
                <input
                  type="number"
                  className="sales-input"
                  value={form.carPrice}
                  onChange={(e) => setForm({ ...form, carPrice: e.target.value })}
                />
              </div>
              <div className="sales-form-group">
                <label>เบี้ยประกันภัย (บาท)</label>
                <input
                  type="number"
                  className="sales-input"
                  value={form.insurancePrice}
                  onChange={(e) => setForm({ ...form, insurancePrice: e.target.value })}
                />
              </div>
            </div>

            <div className="sales-form-group">
              <label>ส่วนลดพิเศษที่ขออนุมัติ (บาท)</label>
              <input
                type="number"
                className="sales-input"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>

            <div style={{
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>ยอดสุทธิรวมประกันภัย</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1d4ed8' }}>
                ฿{netTotal.toLocaleString()}
              </div>
            </div>

            <button type="submit" className="sales-btn sales-btn-primary" style={{ width: '100%' }}>
              สร้าง Order และส่งขออนุมัติ
            </button>
          </form>
        </div>

        {/* ตารางติดตามสถานะ Order */}
        <div className="sales-card">
          <h2 className="sales-card-title">รายการคำสั่งซื้อและสถานะการอนุมัติ</h2>
          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>เลขที่ Order</th>
                  <th>ลูกค้า / รุ่นรถ</th>
                  <th>แพ็กเกจประกันภัย</th>
                  <th>ยอดสุทธิ</th>
                  <th>สถานะ</th>
                  <th>ความเห็นผู้จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td><strong>{ord.id}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ord.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>{ord.carModel}</div>
                    </td>
                    <td>{ord.insurancePlan}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>฿{ord.totalAmount.toLocaleString()}</div>
                      <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                        ส่วนลด: ฿{ord.discount.toLocaleString()}
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
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {ord.managerComment || '-'}
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