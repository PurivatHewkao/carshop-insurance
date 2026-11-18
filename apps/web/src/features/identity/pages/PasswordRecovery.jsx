import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, Feedback, PasswordField } from '../components/AuthUI.jsx';
import {
  authError,
  isDemo,
  requestPasswordReset,
  resetPassword,
} from '../api/auth.js';

const demoMessage = 'โหมดสาธิตไม่ส่งอีเมลและไม่สามารถเปลี่ยนรหัสผ่านได้';

export function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const { email } = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      title="ลืมรหัสผ่าน"
      subtitle="กรอกอีเมลที่ใช้สมัครบัญชีเพื่อขอลิงก์ตั้งรหัสผ่านใหม่"
    >
      {isDemo ? (
        <Feedback message={demoMessage} error />
      ) : sent ? (
        <Feedback message="หากอีเมลนี้ผูกกับบัญชีที่ใช้งานได้ คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ กรุณาตรวจกล่องจดหมายและโฟลเดอร์สแปม" />
      ) : (
        <form className="auth-form" onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy}>
            <label className="s-fld">
              <span>อีเมล</span>
              <input
                className="s-in"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={254}
                required
              />
            </label>
            <Feedback message={error} error />
            <button className="s-btn pri auth-submit">
              {busy ? 'กำลังส่งคำขอ…' : 'ส่งลิงก์ตั้งรหัสผ่าน'}
            </button>
          </fieldset>
        </form>
      )}
      <p className="auth-switch">
        <Link to="/login">กลับไปเข้าสู่ระบบ</Link>
      </p>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get('token');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const { password, confirmation } = Object.fromEntries(
      new FormData(event.currentTarget),
    );
    if (password !== confirmation) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await resetPassword(token, password);
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(authError(err));
      setBusy(false);
    }
  }
  return (
    <AuthShell
      title="ตั้งรหัสผ่านใหม่"
      subtitle="ใช้รหัสผ่าน 8–128 ตัวอักษร โดยมีตัวอักษรอังกฤษและตัวเลข"
    >
      {isDemo ? (
        <Feedback message={demoMessage} error />
      ) : !token ? (
        <Feedback message="ไม่พบลิงก์ตั้งรหัสผ่าน กรุณาขอลิงก์ใหม่" error />
      ) : (
        <form className="auth-form" onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy}>
            <PasswordField label="รหัสผ่านใหม่" autoComplete="new-password" />
            <PasswordField
              label="ยืนยันรหัสผ่านใหม่"
              name="confirmation"
              autoComplete="new-password"
            />
            <Feedback message={error} error />
            <button className="s-btn pri auth-submit">
              {busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
            </button>
          </fieldset>
        </form>
      )}
      <p className="auth-switch">
        <Link to="/forgot-password" replace>
          ขอลิงก์ใหม่
        </Link>
      </p>
    </AuthShell>
  );
}
