// apps/web/src/features/sales/pages/SellerOrdersPage.jsx
import React, { useCallback } from 'react';
import { fetchOrders } from '../api/salesApi.js';
import { useOrderForm } from '../hooks/useOrderForm.js';
import { useSalesData } from '../hooks/useSalesData.js';
import { ActionError, LoadStatus } from '../components/SalesState.jsx';
import '../sales.css';
import VehicleConfigurationPicker from '../components/VehicleConfigurationPicker.jsx';
import NovaInsuranceFields from '../components/NovaInsuranceFields.jsx';

export default function SellerOrdersPage() {
  const orderList = useSalesData((signal) => fetchOrders({}, signal), []);
  const order = useOrderForm({ onCreated: () => orderList.reload() });
  const orders = orderList.data ?? [];
  const {
    form, setForm, customers, cars, insurances, sellers,
    customerId, sellerId, carPrice, insurancePrice, netTotal,
  } = order;
  const setVehicleConfiguration = useCallback((vehicleConfiguration) => setForm((current) => ({ ...current, vehicleConfiguration })), [setForm]);

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>สร้างและติดตามใบสั่งซื้อ (Seller Orders & Insurance)</h1>
          <p>ออกใบจองรถยนต์ควบคู่แพ็กเกจประกันภัย และส่งขออนุมัติจากผู้จัดการ</p>
        </div>
      </div>

      <ActionError message={order.action.error} onClose={order.action.clearError} />
      <LoadStatus
        loading={orderList.loading || order.lookups.loading}
        error={orderList.error || order.lookups.error}
        hasData={orderList.data !== null}
        onRetry={() => { orderList.reload(); order.lookups.reload(); }}
      />

      <div className="sales-grid-layout">
        {/* ฟอร์มสร้างใบจอง */}
        <div className="sales-card">
          <h2 className="sales-card-title">ออกใบสั่งซื้อ / ใบจองใหม่</h2>
          <form onSubmit={order.submit}>
            <div className="sales-form-group">
              <label>ลูกค้าผู้จอง *</label>
              <select
                className="sales-select"
                value={customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                required
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="sales-form-group">
              <label>พนักงานขายผู้รับผิดชอบ</label>
              <select
                className="sales-select"
                value={sellerId}
                onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
                required
              >
                {sellers.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            </div>

            <h3>สเปกรถสำหรับใบจอง</h3>
            <VehicleConfigurationPicker models={cars} initialModel={form.vehicleConfiguration?.modelSlug || ''} onChange={setVehicleConfiguration} />

            <div className="sales-form-group">
              <label>แพ็กเกจประกันภัยรถยนต์</label>
              <select
                className="sales-select"
                value={form.insuranceId}
                disabled={!form.vehicleConfiguration || order.nova.loading}
                onChange={(e) => setForm({ ...form, insuranceId: e.target.value })}
              >
                <option value="">{order.nova.loading ? 'กำลังคำนวณราคาประกัน…' : 'ไม่รับประกันภัยเพิ่มเติม'}</option>
                {insurances.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {!form.vehicleConfiguration && <small className="sales-slot-help">เลือกสเปกรถให้ครบเพื่อดูแพ็กเกจและราคาประกัน</small>}
            <NovaInsuranceFields form={form} setForm={setForm} plans={insurances} {...order.nova} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="sales-form-group">
                <label>ราคารถยนต์ (บาท) — จากระบบ</label>
                <input
                  type="number"
                  className="sales-input"
                  value={carPrice}
                  readOnly
                />
              </div>
              <div className="sales-form-group">
                <label>เบี้ยประกันภัย (บาท) — จากระบบ</label>
                <input
                  type="number"
                  className="sales-input"
                  value={insurancePrice}
                  readOnly
                />
              </div>
            </div>

            <div className="sales-form-group">
              <label>ส่วนลดพิเศษที่ขออนุมัติ (บาท)</label>
              <input
                type="number"
                className="sales-input"
                min="0"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>

            <div className="sales-config-grid">
              <div className="sales-form-group"><label>เงินดาวน์ (% จากยอดสุทธิ) *</label><select className="sales-select" required value={form.downPaymentPercent} onChange={(e) => setForm({ ...form, downPaymentPercent: e.target.value })}>{[0, 5, 10, 15, 20, 25, 30, 40, 50].map((percent) => <option key={percent} value={percent}>{percent}%</option>)}</select><small className="sales-slot-help">คิดเป็น ฿{(Math.round(netTotal * Number(form.downPaymentPercent || 0)) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small></div>
              <div className="sales-form-group"><label>ดอกเบี้ยต่อปี (%) *</label><input className="sales-input" type="number" min="0" max="20" step="0.01" required value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} /></div>
              <div className="sales-form-group"><label>ระยะผ่อน / จำนวนงวด *</label><select className="sales-select" required value={form.installmentCount} onChange={(e) => setForm({ ...form, installmentCount: e.target.value })}><option value="">เลือกระยะผ่อน</option>{[12, 24, 36, 48, 60, 72, 84].map((months) => <option key={months} value={months}>{months} งวด ({months / 12} ปี)</option>)}</select></div>
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

            <button type="submit" disabled={order.action.busy || !order.canSubmit} className="sales-btn sales-btn-primary" style={{ width: '100%' }}>
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
                    <td><strong>{ord.code}</strong></td>
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
