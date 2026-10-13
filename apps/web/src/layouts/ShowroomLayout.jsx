import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Action, Brand } from '../components/common/Showroom.jsx';
import design from '../design/toyoty.json';
import { pageMenu } from '../routes/pageList.js';
export default function ShowroomLayout({ customer = false }) {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
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
          {customer && (
            <>
              <Link to="/catalog">รถทั้งหมด</Link>
              <Link to="/">กลับหน้าเว็บไซต์</Link>
            </>
          )}
        </nav>
        <div className="s-util">
          {customer ? (
            <span className="customer-demo-badge">Customer · สาธิต</span>
          ) : (
            <Link className="s-btn out login-link" to="/login">
              เข้าสู่ระบบ
            </Link>
          )}
          <NavLink
            className="s-user"
            to="/customer/requests"
            aria-label="คำขอของฉัน"
          >
            <span className="av">ค</span>
            <span className="nm">คำขอของฉัน</span>
          </NavLink>
          <Action to="/requests?type=นัดดูรถ">นัดทดลองขับ</Action>
          <button
            className="s-burger"
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? '×' : '☰'}
          </button>
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
            <Link to="/admin">Dashboard ผู้ดูแล (ตัวอย่าง)</Link>
            <Link to="/manager">พื้นที่ผู้จัดการ (ตัวอย่าง)</Link>
            <Link to="/seller">พื้นที่พนักงานขาย (ตัวอย่าง)</Link>
            <Link to="/system-status">System Status</Link>
          </div>
        </div>
        <div className="copy">{design.site.copy}</div>
      </footer>
    </div>
  );
}
