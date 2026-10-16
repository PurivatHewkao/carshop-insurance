import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import {
  authError,
  getSession,
  listUsers,
  subscribeSession,
  updateUser,
} from '../api/auth.js';
import { Feedback, ModeNotice } from '../components/AuthUI.jsx';
import { useAuthData } from '../hooks/useAuthData.js';

const roles = {
  customer: 'ลูกค้า',
  seller: 'พนักงานขาย',
  manager: 'ผู้จัดการ',
  admin: 'ผู้ดูแลระบบ',
};
function UserDialog({ user, onClose, onSaved }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await updateUser(user.id, values);
      onSaved();
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="s-card auth-dialog"
      aria-labelledby="auth-user-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <h2 id="auth-user-title">จัดการสิทธิ์ผู้ใช้</h2>
      <p>{user.name}</p>
      <p className="small">{user.email}</p>
      <form className="auth-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <label className="s-fld">
            <span>บทบาท</span>
            <select
              autoFocus
              className="s-in"
              name="role"
              defaultValue={user.role}
            >
              {Object.entries(roles).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="s-fld">
            <span>สถานะบัญชี</span>
            <select className="s-in" name="status" defaultValue={user.status}>
              <option value="active">ใช้งานอยู่</option>
              <option value="inactive">ระงับการใช้งาน</option>
            </select>
          </label>
          <Feedback message={error} error />
          <div className="auth-actions">
            <button type="button" className="s-btn out" onClick={onClose}>
              ยกเลิก
            </button>
            <button className="s-btn pri" disabled={busy}>
              {busy ? 'กำลังบันทึก…' : 'บันทึกสิทธิ์'}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
function UsersTable({ session }) {
  const { data, loading, error, reload } = useAuthData(listUsers);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const rows = (data || []).filter(
    (user) =>
      (!role || user.role === role) &&
      (!status || user.status === status) &&
      `${user.name} ${user.email}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <div className="auth-stats">
        {[
          ['ผู้ใช้ทั้งหมด', data?.length ?? '—'],
          [
            'ใช้งานอยู่',
            data?.filter((user) => user.status === 'active').length ?? '—',
          ],
          [
            'ผู้ดูแลระบบ',
            data?.filter((user) => user.role === 'admin').length ?? '—',
          ],
        ].map(([label, value]) => (
          <article className="s-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="s-card flush">
        <div className="s-card-h">
          <h2>บัญชีผู้ใช้</h2>
          <button className="s-btn out" onClick={reload} disabled={loading}>
            โหลดใหม่
          </button>
        </div>
        <div className="auth-filters">
          <label className="s-fld">
            <span>ค้นหาผู้ใช้</span>
            <input
              className="s-in"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ชื่อ หรืออีเมล"
            />
          </label>
          <label className="s-fld">
            <span>บทบาท</span>
            <select
              className="s-in"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">ทุกบทบาท</option>
              {Object.entries(roles).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="s-fld">
            <span>สถานะ</span>
            <select
              className="s-in"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">ทุกสถานะ</option>
              <option value="active">ใช้งานอยู่</option>
              <option value="inactive">ระงับการใช้งาน</option>
            </select>
          </label>
        </div>
        <div className="auth-table-feedback">
          <Feedback message={message} />
          <Feedback message={error} error />
        </div>
        {loading ? (
          <p className="auth-empty" role="status">
            กำลังโหลดผู้ใช้…
          </p>
        ) : error ? (
          <div className="auth-empty">
            <button className="s-btn out" onClick={reload}>
              ลองอีกครั้ง
            </button>
          </div>
        ) : (
          <>
            <div className="s-tw">
              <table className="s-tbl">
                <thead>
                  <tr>
                    {['ผู้ใช้', 'อีเมล', 'บทบาท', 'สถานะ', 'จัดการ'].map(
                      (label) => (
                        <th key={label} scope="col">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                        <small className="auth-user-id">{user.id}</small>
                      </td>
                      <td>{user.email}</td>
                      <td>{roles[user.role] || user.role}</td>
                      <td>
                        <span
                          className={`s-pill t-${user.status === 'active' ? 'good' : 'bad'}`}
                        >
                          {user.status === 'active'
                            ? 'ใช้งานอยู่'
                            : 'ระงับการใช้งาน'}
                        </span>
                      </td>
                      <td>
                        {user.id === session.id ? (
                          <span className="small">บัญชีของคุณ</span>
                        ) : (
                          <button
                            className="s-act"
                            onClick={() => setSelected(user)}
                            aria-label={`จัดการสิทธิ์ ${user.name}`}
                          >
                            แก้ไขสิทธิ์
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <div className="auth-empty">
                <h3>ไม่พบผู้ใช้</h3>
                <p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                <button
                  className="s-btn out"
                  onClick={() => {
                    setSearch('');
                    setRole('');
                    setStatus('');
                  }}
                >
                  ล้างตัวกรอง
                </button>
              </div>
            )}
            <div className="s-card-f" role="status">
              แสดง {rows.length} จาก {data.length} ผู้ใช้
            </div>
          </>
        )}
      </section>
      {selected && (
        <UserDialog
          user={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            setMessage('บันทึกสิทธิ์ผู้ใช้แล้ว');
            reload();
          }}
        />
      )}
    </>
  );
}
export default function UsersPage() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  return (
    <main className="page-content admin-content auth-workspace">
      <header className="s-ph">
        <div>
          <p className="s-crumb">WORKSPACE / IDENTITY</p>
          <h1>จัดการผู้ใช้</h1>
          <p>ดูแลบัญชี บทบาท และสิทธิ์การใช้งานของทีม</p>
        </div>
        <Link className="s-btn out" to="/customer/profile">
          บัญชีของฉัน ↗
        </Link>
      </header>
      <ModeNotice />
      {session?.role === 'admin' ? (
        <UsersTable session={session} />
      ) : (
        <section className="s-card auth-empty">
          <h2>{session ? 'สำหรับผู้ดูแลระบบ' : 'กรุณาเข้าสู่ระบบ'}</h2>
          <p>ใช้บัญชีผู้ดูแลระบบเพื่อดูและจัดการผู้ใช้</p>
          <Link className="s-btn pri" to="/login">
            เข้าสู่ระบบ
          </Link>
        </section>
      )}
    </main>
  );
}
