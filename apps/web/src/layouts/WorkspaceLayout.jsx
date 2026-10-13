import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Brand } from '../components/common/Showroom.jsx';

export default function WorkspaceLayout({ role, links, headerLabel }) {
  // Children can portal their own toolbar here without moving page state into the layout.
  const [toolbarTarget, setToolbarTarget] = useState(null);
  return (
    <div className="site admin-site">
      <div className="s-adm">
        <aside
          className="s-side"
          aria-label={
            {
              Admin: 'เมนูผู้ดูแล',
              Manager: 'เมนูผู้จัดการ',
              Seller: 'เมนูพนักงานขาย',
            }[role]
          }
        >
          <Brand />
          <p className="grp">WORKSPACE</p>
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
          <div className="who">
            <span className="av">{role.charAt(0)}</span>
            <div>
              {role}
              <small>บัญชีสาธิต</small>
            </div>
          </div>
        </aside>
        <div className="s-adm-main">
          <header className="s-adm-top">
            {headerLabel && (
              <span className="workspace-header-label">{headerLabel}</span>
            )}
            <div className="admin-toolbar-slot" ref={setToolbarTarget} />
            <span className="sp" />
            <span className="av">{role.charAt(0)}</span>
            <span>{role}</span>
          </header>
          <Outlet context={toolbarTarget} />
        </div>
      </div>
    </div>
  );
}
