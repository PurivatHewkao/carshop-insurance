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
