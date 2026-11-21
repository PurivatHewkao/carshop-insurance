import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { StackingNavbar } from '@/components/ui/stacking-navbar';
import {
  authError,
  getSession,
  logout,
  subscribeSession,
} from '../api/auth.js';

const roleHomes = {
  customer: '/customer/requests',
  seller: '/seller/tasks',
  manager: '/manager',
  admin: '/admin',
};

export default function AccountNavbar() {
  const session = useSyncExternalStore(subscribeSession, getSession);
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

  if (!session) return null;
  return (
    <StackingNavbar
      error={error}
      items={[
        {
          label: 'พื้นที่ของฉัน',
          href: roleHomes[session.role] || '/account',
          icon: <LayoutDashboard size={18} aria-hidden="true" />,
        },
        {
          label: 'บัญชีของฉัน',
          href: '/account',
          icon: <UserRound size={18} aria-hidden="true" />,
        },
        {
          label: busy ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ',
          onClick: signOut,
          disabled: busy,
          icon: <LogOut size={18} aria-hidden="true" />,
        },
      ]}
    />
  );
}
