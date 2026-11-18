import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authError, logout } from '../api/auth.js';

export default function LogoutButton() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setError(authError(error));
      setBusy(false);
    }
  }

  return (
    <div className="header-logout">
      <button
        type="button"
        className="s-btn out"
        onClick={signOut}
        disabled={busy}
      >
        {busy ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
