// Insurance: NOVA administration is independent of carshop accounts.
import { useEffect, useState } from 'react';
import { request } from './api.js';
import AdminWorkspace from './AdminWorkspace.jsx';
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
  const [loading, setLoading] = useState(Boolean(token));
  const [revision, setRevision] = useState(0);
  const [offset, setOffset] = useState(0);
  const [connection, setConnection] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    request('/connection', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setConnection(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
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
    <AdminWorkspace
      key={token ? 'workspace' : 'login'}
      token={token}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      rows={rows}
      error={error}
      setError={setError}
      busy={busy}
      loading={loading}
      offset={offset}
      connection={connection}
      login={login}
      logout={logout}
      approve={approve}
      demoAccount={demoAdminAccount}
      refresh={() => {
        setLoading(true);
        setRevision((value) => value + 1);
      }}
      changePage={(next) => {
        setLoading(true);
        setRows([]);
        setOffset(next);
      }}
    />
  );
}
