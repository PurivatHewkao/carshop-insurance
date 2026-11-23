// Insurance: NOVA administration is independent of carshop accounts.
import { useEffect, useState } from 'react';
import { request, money } from './api.js';
import './admin.css';
const storageKey = 'nova:admin-session';
// Insurance: show the requested demo-account autofill on production as well as locally.
const demoAdminAccount = { email: 'adminNova@nova.com', password: '12345678' };
function initialToken() {
  try {
    return sessionStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}
export default function AdminPage() {
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    request(`/admin/requests?offset=${offset}`, {
      token,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setRows(data);
          setError('');
          setLoading(false);
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(caught.message);
          setLoading(false);
          if (caught.code === 'ADMIN_UNAUTHORIZED') {
            sessionStorage.removeItem(storageKey);
            setToken('');
            setRows([]);
          }
        }
      });
    const timer = setInterval(() => setRevision((value) => value + 1), 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [token, revision, offset]);
  async function login(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await request('/admin/login', {
        method: 'POST',
        body: { email, password },
      });
      sessionStorage.setItem(storageKey, result.token);
      setLoading(true);
      setRows([]);
      setOffset(0);
      setToken(result.token);
      setPassword('');
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }
  async function approve(id) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await request(`/admin/requests/${id}/approve`, {
        method: 'POST',
        token,
      });
      setRows((current) =>
        current.map((row) => (row.requestId === id ? updated : row)),
      );
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await request('/admin/logout', { method: 'POST', token });
      sessionStorage.removeItem(storageKey);
      setToken('');
      setRows([]);
      setError('');
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container nova-admin">
      <h1>ผู้ดูแล NOVA</h1>
      <p>ตรวจข้อมูลการขายจาก TOYOTY และอนุมัติออกกรมธรรม์</p>
      {error && (
        <p role="alert" className="nova-admin-error">
          {error}
        </p>
      )}
      {!token ? (
        <form onSubmit={login} className="nova-admin-login">
          <label htmlFor="nova-admin-email">อีเมลแอดมิน NOVA</label>
          <input
            id="nova-admin-email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="nova-admin-password">รหัสผ่าน</label>
          <input
            id="nova-admin-password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="button" disabled={busy}>
            {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
          {/* Insurance: fill the demo credentials without submitting the form. */}
          {demoAdminAccount && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setEmail(demoAdminAccount.email);
                setPassword(demoAdminAccount.password);
                setError('');
              }}
            >
              กรอกบัญชี Admin NOVA อัตโนมัติ
            </button>
          )}
        </form>
      ) : (
        <>
          <div className="nova-admin-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setLoading(true);
                setRevision((value) => value + 1);
              }}
            >
              อัปเดตรายการ
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={logout}
            >
              ออกจากระบบ
            </button>
          </div>
          {loading && <p role="status">กำลังโหลดรายการ…</p>}
          {!loading && rows.length === 0 && <p>ไม่มีคำขอในหน้านี้</p>}
          {rows.map((row) => (
            <article key={row.requestId} className="nova-admin-card">
              <h2>
                {row.plan.name} · {row.customer.fullName}
              </h2>
              <p>
                <strong>
                  {row.status === 'ISSUED' ? 'ออกกรมธรรม์แล้ว' : 'รออนุมัติ'}
                </strong>
              </p>
              <dl>
                <dt>คำสั่งซื้อ TOYOTY</dt>
                <dd>{row.orderId}</dd>
                <dt>ผู้เอาประกัน</dt>
                <dd>
                  {row.customer.fullName} · {row.customer.email} ·{' '}
                  {row.customer.phone || 'ไม่ระบุโทรศัพท์'}
                </dd>
                <dt>รถ</dt>
                <dd>
                  {row.vehicle.brand} {row.vehicle.model} ({row.vehicle.year}) ·{' '}
                  {row.vehicle.registrationNumber || 'ยังไม่มีทะเบียน'}
                </dd>
                <dt>เลขตัวถัง</dt>
                <dd>{row.vehicle.vin}</dd>
                <dt>แพ็กเกจ</dt>
                <dd>
                  {row.plan.insuranceType} · {row.plan.description}
                </dd>
                <dt>เบี้ยประกัน</dt>
                <dd>
                  เต็ม {money(row.plan.originalAmount)} · ส่วนลด{' '}
                  {money(row.plan.discountAmount)} · สุทธิ{' '}
                  {money(row.plan.finalAmount)} บาท
                </dd>
                <dt>วันส่งมอบ / เริ่มคุ้มครอง</dt>
                <dd>{row.startsOn}</dd>
                <dt>สิ้นสุดคุ้มครอง</dt>
                <dd>{row.endsOn} (รวมวันนี้)</dd>
                {row.policyNumber && (
                  <>
                    <dt>เลขกรมธรรม์</dt>
                    <dd>{row.policyNumber}</dd>
                  </>
                )}
              </dl>
              <ul>
                {row.plan.coverage?.highlights?.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              {row.status === 'PENDING_APPROVAL' && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => approve(row.requestId)}
                >
                  อนุมัติและออกกรมธรรม์
                </button>
              )}
            </article>
          ))}
          <div className="nova-admin-actions">
            <button
              className="button secondary"
              disabled={busy || offset === 0}
              onClick={() => {
                setLoading(true);
                setRows([]);
                setOffset((value) => Math.max(0, value - 50));
              }}
            >
              หน้าก่อน
            </button>
            <span>หน้า {offset / 50 + 1}</span>
            <button
              className="button secondary"
              disabled={busy || rows.length < 50}
              onClick={() => {
                setLoading(true);
                setRows([]);
                setOffset((value) => value + 50);
              }}
            >
              หน้าถัดไป
            </button>
          </div>
        </>
      )}
    </section>
  );
}
