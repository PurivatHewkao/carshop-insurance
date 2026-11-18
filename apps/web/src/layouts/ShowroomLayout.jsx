import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Action, Brand } from '../components/common/Showroom.jsx';
import design from '../design/toyoty.json';
import { pageMenu } from '../routes/pageList.js';
import LogoutButton from '../features/identity/components/LogoutButton.jsx';
import {
  getProfile,
  getSession,
  subscribeSession,
} from '../features/identity/api/auth.js';

const roleHomes = {
  customer: ['/customer/requests', 'พื้นที่ลูกค้า'],
  seller: ['/seller', 'พื้นที่พนักงานขาย'],
  manager: ['/manager', 'พื้นที่ผู้จัดการ'],
  admin: ['/admin', 'พื้นที่ผู้ดูแลระบบ'],
};

export default function ShowroomLayout({ customer = false }) {
  const [open, setOpen] = useState(false);
  const session = useSyncExternalStore(subscribeSession, getSession);
  const roleHome = session && roleHomes[session.role];
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (session !== undefined) return;
    const controller = new AbortController();
    getProfile(controller.signal).catch(() => {
      if (!controller.signal.aborted) setSessionCheckFailed(true);
    });
    return () => controller.abort();
  }, [session]);
  useEffect(() => {
    if (hash)
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="site showroom">
      <a className="skip-link" href="#main-content">
        ข้ามไปเนื้อหาหลัก
      </a>
      <header className="s-nav">
        <Brand />
        <nav
          className={'s-links' + (open ? ' mobile-open' : '')}
          aria-label={customer ? 'เมนูลูกค้า' : 'เมนูหลัก'}
          onClick={() => setOpen(false)}
        >
          {pageMenu(customer ? 'customer' : 'public').map(
            ([to, label, end]) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => (isActive ? 'on' : '')}
              >
                {label}
              </NavLink>
            ),
          )}
          {customer ? (
            <>
              <Link to="/catalog">รถทั้งหมด</Link>
              <Link to="/">กลับหน้าเว็บไซต์</Link>
            </>
          ) : (
            session && (
              <>
                {roleHome && <Link to={roleHome[0]}>{roleHome[1]}</Link>}
                <NavLink to="/account">บัญชีของฉัน</NavLink>
              </>
            )
          )}
        </nav>
        <div className="s-util">
          {!session && (session === null || sessionCheckFailed) && (
            <Link className="s-btn out login-link" to="/login">
              เข้าสู่ระบบ
            </Link>
          )}
          {!customer && (!session || session.role === 'customer') && (
            <Action to="/requests?type=นัดดูรถ">นัดทดลองขับ</Action>
          )}
          <button
            className="s-burger"
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? '×' : '☰'}
          </button>
          {session && <LogoutButton />}
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <aside className="s-rail" aria-label="บริการด่วน">
        <Link to="/requests?type=นัดดูรถ">
          <span aria-hidden="true">◉</span>ทดลองขับ
        </Link>
        <Link to="/requests?type=สนใจ">
          <span aria-hidden="true">▤</span>ใบเสนอราคา
        </Link>
        <Link to="/#insurance">
          <span aria-hidden="true">◇</span>ประกันรถ
        </Link>
      </aside>
      <footer className="s-foot" id="contact">
        <div className="s-foot-grid">
          <div>
            <Brand />
            <p className="tagl">{design.site.tagline}</p>
          </div>
          <div>
            <h4>รถยนต์</h4>
            <Link to="/catalog">รุ่นรถทั้งหมด</Link>
            <Link to="/promotions">โปรโมชัน</Link>
            <Link to="/requests">ขอใบเสนอราคา</Link>
          </div>
          <div>
            <h4>บริการ</h4>
            <Link to="/requests?type=นัดดูรถ">นัดทดลองขับ</Link>
            <Link to="/#insurance">ประกันรถยนต์</Link>
            <Link to="/requests">สถานะคำขอ</Link>
          </div>
          <div>
            <h4>ติดต่อ</h4>
            <p>02-xxx-xxxx</p>
            <p>จ–ส 09:00–18:00</p>
          </div>
        </div>
        <div className="copy">{design.site.copy}</div>
      </footer>
    </div>
  );
}
