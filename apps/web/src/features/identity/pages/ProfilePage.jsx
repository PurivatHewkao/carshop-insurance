import { useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  authError,
  getProfile,
  getSession,
  logout,
  subscribeSession,
  updateProfile,
} from '../api/auth.js';
import { Feedback, ModeNotice } from '../components/AuthUI.jsx';
import { useAuthData } from '../hooks/useAuthData.js';

function ProfileForm() {
  const { data, loading, error, reload } = useAuthData(getProfile);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', error: false });
  async function save(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!values.name.trim())
      return setFeedback({ message: 'กรุณาระบุชื่อและนามสกุล', error: true });
    setBusy(true);
    setFeedback({ message: '' });
    try {
      await updateProfile({
        name: values.name.trim(),
        phone: values.phone.trim(),
      });
      reload();
      setFeedback({ message: 'บันทึกข้อมูลโปรไฟล์แล้ว', error: false });
    } catch (err) {
      setFeedback({ message: authError(err), error: true });
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">กำลังโหลดโปรไฟล์…</p>;
  if (error)
    return (
      <div>
        <Feedback message={error} error />
        <button className="s-btn out" onClick={reload}>
          ลองอีกครั้ง
        </button>
        <Link className="s-btn pri" to="/login">
          เข้าสู่ระบบใหม่
        </Link>
      </div>
    );
  return (
    <div className="auth-profile-grid">
      <aside className="s-card auth-account">
        <div className="auth-avatar">{data.name.charAt(0)}</div>
        <h2>{data.name}</h2>
        <p>{data.email}</p>
        <span className="s-pill t-good">{data.role}</span>
        <hr />
        <p className="small">
          ข้อมูลส่วนตัวใช้สำหรับการติดต่อและนัดหมายกับทีม TOYOTY
        </p>
        <Link className="s-act" to="/customer/requests">
          ดูคำขอของฉัน →
        </Link>
      </aside>
      <section className="s-card">
        <h2>ข้อมูลส่วนตัว</h2>
        <form className="auth-form" onSubmit={save} aria-busy={busy}>
          <fieldset disabled={busy}>
            <label className="s-fld">
              <span>ชื่อ–นามสกุล</span>
              <input
                className="s-in"
                name="name"
                autoComplete="name"
                defaultValue={data.name}
                maxLength={100}
                required
              />
            </label>
            <label className="s-fld">
              <span>อีเมล</span>
              <input
                className="s-in"
                type="email"
                value={data.email}
                readOnly
              />
              <small>อีเมลใช้เป็นบัญชีเข้าสู่ระบบ</small>
            </label>
            <label className="s-fld">
              <span>เบอร์โทรศัพท์</span>
              <input
                className="s-in"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={data.phone}
                pattern="0[0-9]{8,9}"
                title="เบอร์โทรศัพท์ 9–10 หลัก เริ่มต้นด้วย 0"
                required
              />
            </label>
            <Feedback {...feedback} />
            <button className="s-btn pri" disabled={busy}>
              {busy ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
export default function ProfilePage() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="page-content auth-workspace">
      <header className="s-ph">
        <div>
          <p className="s-crumb">MY TOYOTY / บัญชีของฉัน</p>
          <h1>โปรไฟล์ของฉัน</h1>
          <p>จัดการข้อมูลของคุณ เพื่อให้ทุกการติดต่อราบรื่น</p>
        </div>
        {session && (
          <button
            className="s-btn out"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            ออกจากระบบ
          </button>
        )}
      </header>
      <ModeNotice />
      {session ? (
        <>
          {location.state?.registered && (
            <Feedback message="สร้างบัญชีเรียบร้อยแล้ว ยินดีต้อนรับสู่ TOYOTY" />
          )}
          <ProfileForm />
        </>
      ) : (
        <section className="s-card auth-empty">
          <h2>ยินดีต้อนรับสู่บัญชีของคุณ</h2>
          <p>เข้าสู่ระบบเพื่อดูและแก้ไขข้อมูลส่วนตัว</p>
          <Link className="s-btn pri" to="/login">
            เข้าสู่ระบบ
          </Link>
          <Link className="s-btn out" to="/register">
            สร้างบัญชี
          </Link>
        </section>
      )}
    </div>
  );
}
