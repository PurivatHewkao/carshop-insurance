// apps/web/src/features/sales/pages/SellerSalesFormPage.jsx
import React, { useState } from 'react';
import { salesStore, CAR_MODELS, INSURANCE_PLANS, SELLERS_LIST } from '../api/mockSalesData';
import '../sales.css';

export default function SellerSalesFormPage() {
    const [orders, setOrders] = useState(() => salesStore.getOrders());
    const [successMsg, setSuccessMsg] = useState('');

    const [form, setForm] = useState({
        customerName: '',
        phone: '',
        carModel: CAR_MODELS[0],
        insurancePlan: INSURANCE_PLANS[0],
        carPrice: 1199000,
        insurancePrice: 24000,
        discount: 15000,
        sellerName: SELLERS_LIST[0].name,
        note: '',
    });

    const netTotal =
        Number(form.carPrice || 0) +
        Number(form.insurancePrice || 0) -
        Number(form.discount || 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.customerName || !form.phone) return;

        const newOrder = {
            id: `ORD-2026-${Math.floor(890 + orders.length)}`,
            ...form,
            carPrice: Number(form.carPrice),
            insurancePrice: Number(form.insurancePrice),
            discount: Number(form.discount),
            totalAmount: netTotal,
            createdAt: new Date().toISOString().split('T')[0],
            status: 'PENDING_APPROVAL',
            managerComment: 'รอผู้จัดการตรวจสอบและอนุมัติส่วนลด',
        };

        const updated = [newOrder, ...orders];
        setOrders(updated);
        salesStore.saveOrders(updated);

        setSuccessMsg(`สร้างฟอร์มขายสำเร็จ! รหัสคำสั่งซื้อ: ${newOrder.id}`);
        setTimeout(() => setSuccessMsg(''), 5000);

        setForm({
            ...form,
            customerName: '',
            phone: '',
            note: '',
        });
    };

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

            <div className="sales-grid-layout" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
                <div className="sales-card">
                    <h2 className="sales-card-title" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                        แบบฟอร์มบันทึกการขาย
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="sales-form-group">
                                <label>ชื่อ - นามสกุลลูกค้า *</label>
                                <input
                                    type="text"
                                    className="sales-input"
                                    placeholder="ระบุชื่อลูกค้า"
                                    value={form.customerName}
                                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="sales-form-group">
                                <label>เบอร์โทรศัพท์ลูกค้า *</label>
                                <input
                                    type="tel"
                                    className="sales-input"
                                    placeholder="08X-XXX-XXXX"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="sales-form-group">
                            <label>รุ่นรถยนต์ที่จอง</label>
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
                            <label>แพ็กเกจประกันภัยควบคู่</label>
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div className="sales-form-group">
                                <label>ราคารถ (บาท)</label>
                                <input
                                    type="number"
                                    className="sales-input"
                                    value={form.carPrice}
                                    onChange={(e) => setForm({ ...form, carPrice: e.target.value })}
                                />
                            </div>
                            <div className="sales-form-group">
                                <label>ค่าประกัน (บาท)</label>
                                <input
                                    type="number"
                                    className="sales-input"
                                    value={form.insurancePrice}
                                    onChange={(e) => setForm({ ...form, insurancePrice: e.target.value })}
                                />
                            </div>
                            <div className="sales-form-group">
                                <label>ส่วนลด (บาท)</label>
                                <input
                                    type="number"
                                    className="sales-input"
                                    value={form.discount}
                                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="sales-form-group">
                            <label>พนักงานขายผู้รับผิดชอบ (Seller)</label>
                            <select
                                className="sales-select"
                                value={form.sellerName}
                                onChange={(e) => setForm({ ...form, sellerName: e.target.value })}
                            >
                                {SELLERS_LIST.map((s) => (
                                    <option key={s.id} value={s.name}>{s.name} ({s.branch})</option>
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
                            <span>฿{Number(form.carPrice || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                            <span>เบี้ยประกันภัย:</span>
                            <span>฿{Number(form.insurancePrice || 0).toLocaleString()}</span>
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