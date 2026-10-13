import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const [message, setMessage] = useState('');
  return (
    <div className="page-content login-page">
      <section className="s-card login-card">
        <p className="s-eyebrow">TOYOTY ACCOUNT</p>
        <h1>เข้าสู่ระบบ</h1>
        <p className="small">หน้าฟอร์มตัวอย่าง ยังไม่เชื่อมระบบยืนยันตัวตน</p>
        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(
              'ระบบเข้าสู่ระบบยังอยู่ระหว่างพัฒนา ข้อมูลนี้ไม่ได้ถูกส่งหรือบันทึก',
            );
          }}
        >
          <label className="s-fld">
            <span>อีเมล</span>
            <input
              className="s-in"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@example.com"
              required
            />
          </label>
          <label className="s-fld">
            <span>รหัสผ่าน</span>
            <input
              className="s-in"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="s-btn pri" type="submit">
            เข้าสู่ระบบ
          </button>
          <p className="small" role="status">
            {message}
          </p>
        </form>
        <Link className="s-act" to="/register">
          ยังไม่มีบัญชี? สมัครสมาชิก
        </Link>
        <Link className="s-act" to="/">
          ← กลับหน้าแรก
        </Link>
      </section>
    </div>
  );
}
