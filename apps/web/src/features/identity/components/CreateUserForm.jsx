import { useState } from 'react';
import { createUser, authError } from '../api/auth.js';
import { Feedback, PasswordField } from './AuthUI.jsx';

export default function CreateUserForm({ onSaved, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await createUser({
        ...values,
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        status: 'active',
      });
      onSaved();
    } catch (error) {
      setError(authError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="s-card" aria-label="สร้างบัญชีผู้ใช้">
      <h2>สร้างบัญชีผู้ใช้</h2>
      <form className="auth-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <label className="s-fld">
            ชื่อ–นามสกุล
            <input className="s-in" name="name" maxLength={100} required />
          </label>
          <label className="s-fld">
            อีเมล
            <input
              className="s-in"
              name="email"
              type="email"
              maxLength={254}
              required
            />
          </label>
          <label className="s-fld">
            เบอร์โทรศัพท์
            <input
              className="s-in"
              name="phone"
              type="tel"
              pattern="0[0-9]{8,9}"
              required
            />
          </label>
          <PasswordField autoComplete="new-password" />
          <p>รหัสผ่าน 8–128 ตัวอักษร มีตัวอักษรอังกฤษและตัวเลข</p>
          <label className="s-fld">
            บทบาท
            <select className="s-in" name="role" defaultValue="customer">
              <option value="customer">ลูกค้า</option>
              <option value="seller">พนักงานขาย</option>
              <option value="manager">ผู้จัดการ</option>
              <option value="admin">ผู้ดูแลระบบ</option>
              <option value="finance">การเงิน</option>
              <option value="stock">คลังสินค้า</option>
            </select>
          </label>
          <Feedback message={error} error />
          <div className="auth-actions">
            <button className="s-btn out" type="button" onClick={onClose}>
              ยกเลิก
            </button>
            <button className="s-btn pri" disabled={busy}>
              {busy ? 'กำลังสร้าง…' : 'สร้างบัญชี'}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
