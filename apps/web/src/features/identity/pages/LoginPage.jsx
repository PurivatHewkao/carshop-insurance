import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell, Feedback, PasswordField } from '../components/AuthUI.jsx';
import { authError, demoAccount, isDemo, login } from '../api/auth.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const user = await login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      navigate(user.role === 'admin' ? '/admin/users' : '/customer/profile');
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      title="ยินดีต้อนรับกลับ"
      subtitle="เข้าสู่ระบบเพื่อดูแลทุกการเดินทางของคุณ"
    >
      <form className="auth-form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label className="s-fld">
            <span>อีเมล</span>
            <input
              className="s-in"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              maxLength={254}
              required
            />
          </label>
          <PasswordField />
          <Feedback message={error} error />
          <button className="s-btn pri auth-submit" disabled={busy}>
            {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ →'}
          </button>
        </fieldset>
      </form>
      <p className="auth-switch">
        ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
      </p>
      {isDemo && (
        <div className="auth-demo">
          <strong>ทดลองใช้งาน</strong>
          <p>
            ลูกค้า: {demoAccount.email}
            <br />
            ผู้ดูแล: admin@toyoty.demo
            <br />
            รหัสผ่านทั้งสองบัญชี: {demoAccount.password}
          </p>
          <small>บัญชีสาธิตใช้ทดสอบหน้าจอ ไม่มีการยืนยันตัวตนจริง</small>
        </div>
      )}
    </AuthShell>
  );
}
