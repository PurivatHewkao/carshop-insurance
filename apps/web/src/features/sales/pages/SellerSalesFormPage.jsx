// apps/web/src/features/sales/pages/SellerSalesFormPage.jsx
import React, { useState } from 'react';
import { useOrderForm } from '../hooks/useOrderForm.js';
import { ActionError, LoadStatus } from '../components/SalesState.jsx';
import '../sales.css';

export default function SellerSalesFormPage() {
    const [successMsg, setSuccessMsg] = useState('');
    const order = useOrderForm({
        onCreated: (created) => {
            setSuccessMsg(`สร้างฟอร์มขายสำเร็จ! รหัสคำสั่งซื้อ: ${created.code}`);
            setTimeout(() => setSuccessMsg(''), 5000);
        },
    });
    const {
        form, setForm, customers, cars, insurances, sellers,
        customerId, carId, sellerId, customer, carPrice, insurancePrice, netTotal,
    } = order;
    const handleSubmit = order.submit;

    return (
        <div className="sales-container">
            <div className="sales-header">
                <div className="sales-title-group">
                    <h1>สร้างฟอร์มขายและใบจองรถยนต์ (Sales & Insurance Form)</h1>
                    <p>บันทึกข้อมูลการจองรถยนต์และแพ็กเกจประกันภัย เพื่อส่งขออนุมัติจากผู้จัดการ</p>
                </div>
            </div>

            {successMsg && (
                <div style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontWeight: 600,
                    border: '1px solid #bbf7d0'
                }}>
                    {successMsg}
                </div>
            )}

            <ActionError message={order.action.error} onClose={order.action.clearError} />
            <LoadStatus
                loading={order.lookups.loading}
                error={order.lookups.error}
                hasData={order.lookups.data !== null}
                onRetry={order.lookups.reload}
            />

            <div className="sales-grid-layout" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
                <div className="sales-card">
                    <h2 className="sales-card-title" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                        แบบฟอร์มบันทึกการขาย
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="sales-form-group">
                                <label>ลูกค้า *</label>
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
                                <label>เบอร์โทรศัพท์ลูกค้า</label>
                                <input type="tel" className="sales-input" value={customer?.phone || ''} readOnly />
                            </div>
                        </div>

                        <div className="sales-form-group">
                            <label>รถยนต์ที่จอง (เฉพาะคันที่ยังว่าง)</label>
                            <select
                                className="sales-select"
                                value={carId}
                                onChange={(e) => setForm({ ...form, carId: e.target.value })}
                                required
                            >
                                {cars.map((c) => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sales-form-group">
                            <label>แพ็กเกจประกันภัยควบคู่</label>
                            <select
                                className="sales-select"
                                value={form.insuranceId}
                                onChange={(e) => setForm({ ...form, insuranceId: e.target.value })}
                            >
                                <option value="">ไม่รับประกันภัยเพิ่มเติม</option>
                                {insurances.map((p) => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div className="sales-form-group">
                                <label>ราคารถ (บาท)</label>
                                <input
                                    type="number"
                                    className="sales-input"
                                    value={carPrice}
                                    readOnly
                                />
                            </div>
                            <div className="sales-form-group">
                                <label>ค่าประกัน (บาท)</label>
                                <input
                                    type="number"
                                    className="sales-input"
                                    value={insurancePrice}
                                    readOnly
                                />
                            </div>
                            <div className="sales-form-group">
                                <label>ส่วนลด (บาท)</label>
                                <input
                                    type="number"
                                    className="sales-input"
                                    min="0"
                                    value={form.discount}
                                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="sales-form-group">
                            <label>พนักงานขายผู้รับผิดชอบ (Seller)</label>
                            <select
                                className="sales-select"
                                value={sellerId}
                                onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
                                required
                            >
                                {sellers.map((x) => (
                                    <option key={x.id} value={x.id}>{x.name}{x.branch ? ` (${x.branch})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sales-form-group">
                            <label>หมายเหตุ / ของแถมพิเศษ</label>
                            <textarea
                                rows="2"
                                className="sales-textarea"
                                placeholder="เช่น ฟิล์มกรองแสง, ผ้ายาง, กรอบป้าย..."
                                value={form.note}
                                onChange={(e) => setForm({ ...form, note: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={order.action.busy || !order.canSubmit}
                            className="sales-btn"
                            style={{
                                width: '100%',
                                padding: '14px',
                                marginTop: '15px',
                                backgroundColor: '#dc2626', // สีแดงพรีเมียมตัดกับพื้นหลัง
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                        >
                             บันทึกและส่งขออนุมัติฟอร์มขาย
                        </button>
                    </form>
                </div>

                <div>
                    <div className="sales-card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a' }}> สรุปยอดชำระสุทธิ</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                            <span>ราคารถยนต์:</span>
                            <span>฿{carPrice.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                            <span>เบี้ยประกันภัย:</span>
                            <span>฿{insurancePrice.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.9rem', color: '#dc2626' }}>
                            <span>หัก ส่วนลดพิเศษ:</span>
                            <span>-฿{Number(form.discount || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '1rem', color: '#1e293b' }}>ยอดสุทธิรวม:</strong>
                            <strong style={{ fontSize: '1.5rem', color: '#2563eb' }}>฿{netTotal.toLocaleString()}</strong>
                        </div>
                    </div>

                    <div className="sales-card">
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}> คำแนะนำการใช้งาน</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                            เมื่อบันทึกฟอร์มขายนี้ ระบบจะสร้างคำสั่งซื้อ (Order) และส่งต่อไปยังหน้า <strong>Manager อนุมัติรายการ</strong> ทันที
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}