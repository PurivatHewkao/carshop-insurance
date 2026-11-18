import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, Feedback, PasswordField } from '../components/AuthUI.jsx';
import { authError, demoAccount, isDemo, login } from '../api/auth.js';

const testRoles = [
  'customer',
  'seller',
  'admin',
  'manager',
  'finance',
  'stock',
];
const roleTestPassword =
  import.meta.env.DEV && import.meta.env.VITE_IDENTITY_ROLE_TEST_PASSWORD;
const showLocalRoleButtons =
  roleTestPassword &&
  ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export default function LoginPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const destinations = {
        admin: '/admin/users',
        customer: '/customer/profile',
        seller: '/seller/tasks',
        manager: '/manager',
        finance: '/finance',
        stock: '/account',
      };
      navigate(destinations[user.role] || '/account');
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
      <Feedback
        message={
          state?.passwordReset
            ? 'เปลี่ยนรหัสผ่านแล้ว เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย'
            : ''
        }
      />
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <PasswordField
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="auth-switch">
            <Link to="/forgot-password">ลืมรหัสผ่าน?</Link>
          </p>
          <Feedback message={error} error />
          <button className="s-btn pri auth-submit" disabled={busy}>
            {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ →'}
          </button>
        </fieldset>
      </form>
      {(isDemo || import.meta.env.PROD || showLocalRoleButtons) && (
        <section className="auth-demo" aria-label="บัญชีทดลอง">
          <strong>บัญชีทดลอง</strong>
          <p>
            {isDemo || showLocalRoleButtons
              ? 'เลือกบทบาทเพื่อกรอกข้อมูล แล้วกดเข้าสู่ระบบ'
              : 'เลือกบทบาทเพื่อกรอกอีเมล แล้วใส่รหัสผ่านของบัญชีทดลอง'}
          </p>
          <div className="auth-role-buttons">
            {testRoles.map((role) => (
              <button
                key={role}
                type="button"
                className="s-btn out"
                disabled={busy}
                onClick={() => {
                  setEmail(
                    isDemo
                      ? `${role}@toyoty.demo`
                      : `role-${role}@carshop.test`,
                  );
                  setPassword(
                    isDemo
                      ? demoAccount.password
                      : showLocalRoleButtons
                        ? roleTestPassword
                        : '',
                  );
                  setError('');
                }}
              >
                {role.toUpperCase()}
              </button>
            ))}
          </div>
        </section>
      )}
      <p className="auth-switch">
        ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
      </p>
    </AuthShell>
  );
}
