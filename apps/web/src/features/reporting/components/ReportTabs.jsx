import { NavLink } from 'react-router-dom';
import { reportLinks } from './reportLinks.js';

export default function ReportTabs({ base }) {
  return (
    <nav aria-label="หมวดรายงาน" className="mb-5 flex flex-wrap gap-2">
      {reportLinks(base).map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => 's-btn' + (isActive ? ' pri' : '')}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
