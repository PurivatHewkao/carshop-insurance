import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Brand } from '../components/common/Showroom.jsx';
import LogoutButton from '../features/identity/components/LogoutButton.jsx';

export default function WorkspaceLayout({ role, links, headerLabel }) {
  // Children can portal their own toolbar here without moving page state into the layout.
  const [toolbarTarget, setToolbarTarget] = useState(null);
  return (
    <div className="site admin-site">
      <div className="s-adm">
        <nav
          className="s-side"
          aria-label={
            {
              Admin: 'เมนูผู้ดูแล',
              Manager: 'เมนูผู้จัดการ',
              Seller: 'เมนูพนักงานขาย',
              Finance: 'เมนูฝ่ายการเงิน',
            }[role]
          }
        >
          <Brand />
          {links.map(([to, label, end = true]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? 'on' : '')}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <header className="s-adm-top">
          <span className="workspace-header-label">{headerLabel || role}</span>
          <div className="admin-toolbar-slot" ref={setToolbarTarget} />
          <LogoutButton />
        </header>
        <div className="s-adm-main">
          <Outlet context={toolbarTarget} />
        </div>
      </div>
    </div>
  );
}
