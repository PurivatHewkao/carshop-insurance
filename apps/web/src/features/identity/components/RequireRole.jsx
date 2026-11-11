import { useSyncExternalStore } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { getSession, subscribeSession, getProfile } from '../api/auth.js';
import { useAuthData } from '../hooks/useAuthData.js';

function VerifiedRole({ roles, children }) {
  const { data, loading, error, reload } = useAuthData(getProfile);
  if (loading) return <p role="status">กำลังตรวจสอบสิทธิ์…</p>;
  if (error)
    return (
      <section className="page-content">
        <p role="alert">{error}</p>
        <button onClick={reload}>ลองใหม่</button>
        <Link to="/login">เข้าสู่ระบบ</Link>
      </section>
    );
  if (roles && !roles.includes(data.role))
    return (
      <section className="page-content">
        <h1>ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <Link to="/account">บัญชีของฉัน</Link>
      </section>
    );
  return children;
}
export default function RequireRole({ roles, children }) {
  const session = useSyncExternalStore(subscribeSession, getSession);
  if (session === null) return <Navigate to="/login" replace />;
  return <VerifiedRole roles={roles}>{children}</VerifiedRole>;
}
