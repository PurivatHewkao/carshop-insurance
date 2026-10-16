import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CarImage } from '../../../components/common/Showroom.jsx';
import { isDemo } from '../api/auth.js';
import '../styles/auth.css';

export function ModeNotice() {
  return (
    <p className="auth-mode">
      {isDemo
        ? 'โหมดสาธิต · ข้อมูลตัวอย่างในหน่วยความจำ รีเฟรชแล้วเริ่มใหม่'
        : 'เชื่อมต่อระบบบัญชีผ่าน Identity API'}
    </p>
  );
}
export function Feedback({ message, error = false }) {
  return message ? (
    <p
      className={`auth-feedback ${error ? 'error' : 'success'}`}
      role={error ? 'alert' : 'status'}
    >
      {message}
    </p>
  ) : null;
}
export function PasswordField({
  label = 'รหัสผ่าน',
  name = 'password',
  autoComplete = 'current-password',
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="s-fld">
      <span>{label}</span>
      <span className="auth-password">
        <input
          className="s-in"
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={8}
          maxLength={128}
          required
        />
        <button
          type="button"
          aria-label={`${visible ? 'ซ่อน' : 'แสดง'}${label}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'ซ่อน' : 'แสดง'}
        </button>
      </span>
    </label>
  );
}
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="page-content auth-page">
      <div className="auth-shell">
        <aside className="auth-story">
          <span className="auth-overline">YOUR NEXT CHAPTER</span>
          <h2>
            ทุกการเดินทาง
            <br />
            เริ่มต้นที่คุณ
          </h2>
          <p>
            บัญชีเดียวสำหรับค้นหารถที่ใช่
            <br />
            นัดทดลองขับ และติดตามคำขอของคุณ
          </p>
          <CarImage type="suv" color="#c9cbd0" />
          <div className="auth-story-foot">
            <span>01 / บัญชี TOYOTY</span>
            <Link to="/catalog">ค้นหารถของคุณ ↗</Link>
          </div>
        </aside>
        <section className="auth-form-panel">
          <Link className="auth-back" to="/">
            ← กลับหน้าเว็บไซต์
          </Link>
          <p className="s-eyebrow">TOYOTY ACCOUNT</p>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          <ModeNotice />
          {children}
        </section>
      </div>
    </div>
  );
}
