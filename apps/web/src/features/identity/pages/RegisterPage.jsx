import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell, Feedback, PasswordField } from '../components/AuthUI.jsx';
import { authError, register } from '../api/auth.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!values.name.trim()) return setError('กรุณาระบุชื่อและนามสกุล');
    if (!/(?=.*[a-zA-Z])(?=.*\d).{8,}/.test(values.password))
      return setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัว รวมตัวอักษรและตัวเลข');
    if (values.password !== values.confirmPassword)
      return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    setBusy(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        password: values.password,
      });
      navigate('/customer/profile', { state: { registered: true } });
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      title="เริ่มต้นการเดินทาง"
      subtitle="สร้างบัญชี TOYOTY และค้นหารถที่เป็นคุณ"
    >
      <form className="auth-form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label className="s-fld">
            <span>ชื่อ–นามสกุล</span>
            <input
              className="s-in"
              name="name"
              autoComplete="name"
              maxLength={100}
              required
              placeholder="ชื่อและนามสกุลของคุณ"
            />
          </label>
          <label className="s-fld">
            <span>อีเมล</span>
            <input
              className="s-in"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              placeholder="you@example.com"
            />
          </label>
          <label className="s-fld">
            <span>เบอร์โทรศัพท์</span>
            <input
              className="s-in"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              pattern="0[0-9]{8,9}"
              title="เบอร์โทรศัพท์ 9–10 หลัก เริ่มต้นด้วย 0"
              required
              placeholder="0812345678"
            />
          </label>
          <PasswordField autoComplete="new-password" />
          <small className="auth-help">
            อย่างน้อย 8 ตัวอักษร รวมตัวอักษรและตัวเลข
          </small>
          <PasswordField
            name="confirmPassword"
            label="ยืนยันรหัสผ่าน"
            autoComplete="new-password"
          />
          <Feedback message={error} error />
          <button className="s-btn pri auth-submit" disabled={busy}>
            {busy ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี →'}
          </button>
        </fieldset>
      </form>
      <p className="auth-switch">
        มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
      </p>
    </AuthShell>
  );
}
