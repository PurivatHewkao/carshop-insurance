import { NavLink, Outlet } from 'react-router-dom';
const links = [
  ['/', 'Home'],
  ['/identity', 'บัญชีผู้ใช้'],
  ['/catalog', 'รถยนต์'],
  ['/sales', 'งานขาย'],
  ['/payment', 'การเงิน'],
  ['/reporting', 'รายงาน'],
  ['/system-status', 'System Status'],
];
export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="eyebrow">CARSHOP / DEVELOPMENT</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <span className="text-2xl font-bold tracking-tight">Carshop</span>
            <span className="text-sm text-slate-500">
              โครงโปรเจกต์ · ทีม 5 คน
            </span>
          </div>
          <nav aria-label="เมนูหลัก" className="mt-6 flex flex-wrap gap-2">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  'nav-link ' + (isActive ? 'active' : '')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 text-sm text-slate-500">
        Scaffold เท่านั้น · ยังไม่มีระบบบัญชี การขาย หรือชำระเงิน
      </footer>
    </div>
  );
}
