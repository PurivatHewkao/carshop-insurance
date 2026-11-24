import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCustomerPipeline } from '../api/salesApi.js';
import { useSalesData } from '../hooks/useSalesData.js';
import { LoadStatus } from '../components/SalesState.jsx';
import '../sales.css';

export default function CustomerPipelinePage({ base = '/manager' }) {
  const list = useSalesData(fetchCustomerPipeline, []);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const rows = useMemo(() => (list.data || []).filter((item) =>
    (!stage || item.stage === stage) && `${item.name} ${item.phone} ${item.email}`.toLowerCase().includes(search.toLowerCase().trim())), [list.data, search, stage]);
  const stages = [...new Set((list.data || []).map((item) => item.stage))];
  return <div className="sales-container">
    <div className="sales-header"><div className="sales-title-group"><p className="sales-eyebrow">CUSTOMER PIPELINE</p><h1>ภาพรวมสถานะลูกค้า</h1><p>ติดตามลูกค้าทุกคนตั้งแต่คำขอนัดหมาย ใบจอง การอนุมัติ จนถึงการชำระเงิน</p></div></div>
    <LoadStatus loading={list.loading} error={list.error} hasData={list.data !== null} onRetry={list.reload} />
    <div className="sales-stats-grid">{stages.map((item) => <div key={item} className="sales-stat-card"><div className="sales-stat-label">{item}</div><div className="sales-stat-value">{list.data?.filter((row) => row.stage === item).length || 0}</div></div>)}</div>
    <section className="sales-card"><div className="sales-filter-bar"><input className="sales-input" placeholder="ค้นหาชื่อ เบอร์โทร หรืออีเมล" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="sales-select" value={stage} onChange={(event) => setStage(event.target.value)}><option value="">ทุกขั้นตอน</option>{stages.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="sales-table-wrapper"><table className="sales-table"><thead><tr><th>ลูกค้า</th><th>นัดหมายล่าสุด</th><th>ใบจองล่าสุด</th><th>พนักงานขาย</th><th>ขั้นตอนปัจจุบัน</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small className="sales-cell-subtitle">{item.phone}{item.email ? ` · ${item.email}` : ''}</small></td><td>{item.appointmentId ? <>{base === '/manager' ? <Link to={`${base}/appointments`}>{item.appointmentType === 'VIEW_CAR' ? 'นัดดูรถ' : 'ทดลองขับ'}</Link> : (item.appointmentType === 'VIEW_CAR' ? 'นัดดูรถ' : 'ทดลองขับ')}<small className="sales-cell-subtitle">{item.appointmentStatus}</small></> : '—'}</td><td>{item.orderId ? <>{base === '/manager' ? <Link to={`${base}/approvals`}>{item.approvalStatus === 'PENDING_APPROVAL' ? 'รออนุมัติ' : item.approvalStatus}</Link> : (item.approvalStatus === 'PENDING_APPROVAL' ? 'รออนุมัติ' : item.approvalStatus)}<small className="sales-cell-subtitle">{item.paymentStatus ? `การชำระ: ${item.paymentStatus}` : item.orderStatus}</small></> : '—'}</td><td>{item.sellerName || '—'}</td><td><span className="sales-badge badge-pending">{item.stage}</span></td></tr>)}{rows.length === 0 && <tr><td colSpan="5" className="sales-empty">ไม่พบลูกค้าในขั้นตอนนี้</td></tr>}</tbody></table></div>
    </section>
  </div>;
}
