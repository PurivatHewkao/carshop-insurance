// apps/web/src/features/sales/pages/SellerTasksPage.jsx
import React, { useState } from 'react';
import { fetchAppointments, fetchSellers, setAppointmentStatus } from '../api/salesApi.js';
import { useAction, useActorChoice, useSalesData } from '../hooks/useSalesData.js';
import { ActionError, ActorSwitcher, LoadStatus } from '../components/SalesState.jsx';
import '../sales.css';

const STAGES = [['PENDING', 'รอดำเนินการ'], ['CONFIRMED', 'ยืนยันแล้ว'], ['COMPLETED', 'เสร็จสิ้น'], ['CANCELLED', 'ยกเลิก']];

export default function SellerTasksPage() {
  const actor = useActorChoice('SELLER', fetchSellers, (a) => a.employeeId);
  const list = useSalesData(
    (signal) =>
      actor.actorId
        ? fetchAppointments({ sellerId: actor.actorId }, signal)
        : Promise.resolve([]),
    [actor.actorId],
  );
  const action = useAction();
  const [filter, setFilter] = useState('ALL');
  // A task is an appointment assigned to this seller; taskStatus is derived by the API.
  const tasks = (list.data ?? [])
    .map((a) => ({ ...a, status: a.taskStatus, taskTitle: `${a.type} - ${a.carModel}` }));

  const handleStatusChange = async (taskId, nextStatus) => {
    const result = await action.run(() => setAppointmentStatus(taskId, nextStatus));
    if (result.ok) list.reload();
  };

  const visibleTasks = tasks.filter((t) =>
    filter === 'ALL' ? true : t.status === filter
  );

  const filterTabs = [
    { key: 'ALL', label: 'งานทั้งหมด', count: tasks.length },
    { key: 'PENDING', label: 'รอดำเนินการ', count: tasks.filter(t => t.status === 'PENDING').length },
    { key: 'IN_PROGRESS', label: 'กำลังดูแล', count: tasks.filter(t => t.status === 'IN_PROGRESS').length },
    { key: 'COMPLETED', label: 'เสร็จสิ้น', count: tasks.filter(t => t.status === 'COMPLETED').length },
    { key: 'CANCELLED', label: 'ยกเลิก', count: tasks.filter(t => t.status === 'CANCELLED').length },
  ];

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>งานของ Seller และติดตามลูกค้า (Seller Task Management)</h1>
          <p>จัดการเคสลูกค้าที่ได้รับมอบหมาย ติดตามผล และอัปเดตสถานะงานขาย</p>
        </div>
        <button
          onClick={list.reload}
          disabled={list.loading}
          className="sales-btn sales-btn-outline sales-btn-sm"
          title="โหลดข้อมูลล่าสุดจากระบบ"
        >
          🔄 รีเฟรช
        </button>
      </div>

      <ActionError message={action.error} onClose={action.clearError} />
      <LoadStatus
        loading={list.loading || actor.loading}
        error={list.error || actor.error}
        hasData={list.data !== null}
        onRetry={() => { list.reload(); actor.reload(); }}
      />
      <ActorSwitcher
        label="Seller"
        options={actor.options}
        value={actor.actorId}
        onChange={actor.pick}
        isStandIn={actor.isStandIn}
      />

      <div className="sales-stats-grid">
        <div className="sales-stat-card">
          <div className="sales-stat-label">งานทั้งหมดในระบบ</div>
          <div className="sales-stat-value">{tasks.length}</div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">รอดำเนินการ</div>
          <div className="sales-stat-value" style={{ color: '#d97706' }}>
            {tasks.filter((t) => t.status === 'PENDING').length}
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">กำลังดำเนินการ</div>
          <div className="sales-stat-value" style={{ color: '#0284c7' }}>
            {tasks.filter((t) => t.status === 'IN_PROGRESS').length}
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-label">ปิดงานสำเร็จ</div>
          <div className="sales-stat-value" style={{ color: '#16a34a' }}>
            {tasks.filter((t) => t.status === 'COMPLETED').length}
          </div>
        </div>
      </div>

      <div className="sales-card">
        {/* แถบ Tab กรองข้อมูล */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '24px', 
          flexWrap: 'wrap',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '16px'
        }}>
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isActive ? '1px solid #dc2626' : '1px solid #e2e8f0',
                  background: isActive ? '#dc2626' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  boxShadow: isActive ? '0 2px 6px rgba(220, 38, 38, 0.25)' : 'none',
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#334155',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="sales-table-wrapper">
          <table className="sales-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '11%' }}>รหัสงาน</th>
                <th style={{ width: '20%' }}>ข้อมูลลูกค้า</th>
                <th style={{ width: '31%' }}>รายละเอียดงาน</th>
                <th style={{ width: '15%' }}>กำหนดเวลา</th>
                <th style={{ width: '17%', textAlign: 'center' }}>Stage</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="sales-empty">ไม่พบรายการงานในหมวดหมู่นี้</td>
                </tr>
              ) : (
                visibleTasks.map((task) => (
                  <tr key={task.id}>
                    <td><strong style={{ color: '#0f172a' }}>{task.code}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{task.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{task.phone}</div>
                    </td>
                    <td>
                      <div style={{ 
                        maxHeight: '75px', 
                        overflowY: 'auto', 
                        paddingRight: '4px' 
                      }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{task.taskTitle}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>{task.note}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{task.dueDate}</td>
                    <td style={{ textAlign: 'center' }}>
                      <select aria-label={`เปลี่ยน stage ${task.code}`} className="sales-select sales-stage-select" value={task.dbStatus} onChange={(event) => handleStatusChange(task.id, event.target.value)} disabled={action.busy}>
                        {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
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
