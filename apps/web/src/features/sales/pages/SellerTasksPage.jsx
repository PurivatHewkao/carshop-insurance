// apps/web/src/features/sales/pages/SellerTasksPage.jsx
import React, { useState } from 'react';
import { salesStore } from '../api/mockSalesData';
import '../sales.css';

export default function SellerTasksPage() {
  const [tasks, setTasks] = useState(() => salesStore.getTasks());
  const [filter, setFilter] = useState('ALL');

  const handleStatusChange = (taskId, nextStatus) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: nextStatus } : t
    );
    setTasks(updated);
    salesStore.saveTasks(updated);
  };

  const handleResetData = () => {
    localStorage.removeItem('carshop_sales_tasks_v1');
    setTasks(salesStore.getTasks());
  };

  const visibleTasks = tasks.filter((t) =>
    filter === 'ALL' ? true : t.status === filter
  );

  const filterTabs = [
    { key: 'ALL', label: 'งานทั้งหมด', count: tasks.length },
    { key: 'PENDING', label: 'รอดำเนินการ', count: tasks.filter(t => t.status === 'PENDING').length },
    { key: 'IN_PROGRESS', label: 'กำลังดูแล', count: tasks.filter(t => t.status === 'IN_PROGRESS').length },
    { key: 'COMPLETED', label: 'เสร็จสิ้น', count: tasks.filter(t => t.status === 'COMPLETED').length },
  ];

  return (
    <div className="sales-container">
      <div className="sales-header">
        <div className="sales-title-group">
          <h1>งานของ Seller และติดตามลูกค้า (Seller Task Management)</h1>
          <p>จัดการเคสลูกค้าที่ได้รับมอบหมาย ติดตามผล และอัปเดตสถานะงานขาย</p>
        </div>
        <button
          onClick={handleResetData}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s'
          }}
          title="รีเซ็ตสถานะงานทั้งหมดกลับค่าเริ่มต้น"
        >
          🔄 รีเซ็ตข้อมูลจำลอง
        </button>
      </div>

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
                <th style={{ width: '11%', textAlign: 'center' }}>สถานะ</th>
                <th style={{ width: '12%', textAlign: 'center' }}>ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="sales-empty">ไม่พบรายการงานในหมวดหมู่นี้</td>
                </tr>
              ) : (
                visibleTasks.map((task) => (
                  <tr key={task.id}>
                    <td><strong style={{ color: '#0f172a' }}>{task.id}</strong></td>
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
                      <span className={`sales-badge ${
                        task.status === 'PENDING' ? 'badge-pending' :
                        task.status === 'IN_PROGRESS' ? 'badge-progress' : 'badge-completed'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        {task.status === 'PENDING' && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                            style={{
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            รับงาน
                          </button>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                            style={{
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            เสร็จสิ้น
                          </button>
                        )}
                        {task.status === 'COMPLETED' && (
                          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            ปิดงานแล้ว
                          </span>
                        )}
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