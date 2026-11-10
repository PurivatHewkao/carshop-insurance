// Loading / error / action-error banners shared by the sales pages.
export function LoadStatus({ loading, error, hasData, onRetry }) {
  if (error)
    return (
      <div className="sales-alert sales-alert-error" role="alert">
        <span>{error}</span>
        {onRetry && (
          <button type="button" className="sales-btn sales-btn-outline sales-btn-sm" onClick={onRetry}>
            ลองใหม่
          </button>
        )}
      </div>
    );
  if (loading && !hasData)
    return <div className="sales-alert" role="status">กำลังโหลดข้อมูล...</div>;
  return null;
}

export function ActionError({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="sales-alert sales-alert-error" role="alert">
      <span>{message}</span>
      <button type="button" className="sales-btn sales-btn-outline sales-btn-sm" onClick={onClose}>
        ปิด
      </button>
    </div>
  );
}

// Shown only while the web app has no real Identity session (see api/actor.js).
export function ActorSwitcher({ label, options, value, onChange, isStandIn }) {
  if (!isStandIn || options.length === 0) return null;
  return (
    <div className="sales-alert">
      <label style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{label} (โหมดทดสอบ — ยังไม่มีระบบเข้าสู่ระบบจริง)</span>
        <select className="sales-select" style={{ width: 'auto' }} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
