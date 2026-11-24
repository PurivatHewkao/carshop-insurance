import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  CarFront,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  EyeOff,
  FileCheck2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { money } from './api.js';
import { Logo } from './components.jsx';
import './admin-workspace.css';

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf())
    ? '—'
    : parsed.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
      });
};
function Status({ value }) {
  const issued = value === 'ISSUED';
  return (
    <span
      className={`na-status ${issued ? 'issued' : value === 'PENDING_APPROVAL' ? 'pending' : 'other'}`}
    >
      {issued ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
      {issued
        ? 'ออกกรมธรรม์แล้ว'
        : value === 'PENDING_APPROVAL'
          ? 'รออนุมัติ'
          : value}
    </span>
  );
}
function Details({ row, busy, approve }) {
  const sections = [
    {
      title: 'ผู้เอาประกัน',
      icon: UserRound,
      fields: [
        ['ชื่อ–นามสกุล', row.customer.fullName],
        ['อีเมล', row.customer.email],
        ['โทรศัพท์', row.customer.phone || 'ไม่ระบุ'],
      ],
    },
    {
      title: 'ข้อมูลรถ',
      icon: CarFront,
      fields: [
        ['รุ่นรถ', `${row.vehicle.brand} ${row.vehicle.model}`],
        [
          'ปีรถ / ทะเบียน',
          `${row.vehicle.year} · ${row.vehicle.registrationNumber || 'ยังไม่มีทะเบียน'}`,
        ],
        ['เลขตัวถัง', row.vehicle.vin],
      ],
    },
    {
      title: 'แผนและเบี้ยประกัน',
      icon: ShieldCheck,
      fields: [
        ['แผน', `${row.plan.name} · ${row.plan.insuranceType}`],
        ['เบี้ยเต็ม', `${money(row.plan.originalAmount)} บาท`],
        ['ส่วนลด', `−${money(row.plan.discountAmount)} บาท`],
        ['ยอดสุทธิ', `${money(row.plan.finalAmount)} บาท`],
      ],
    },
    {
      title: 'ระยะเวลาคุ้มครอง',
      icon: FileCheck2,
      fields: [
        ['วันเริ่มคุ้มครอง', formatDate(row.startsOn)],
        ['วันสิ้นสุด', `${formatDate(row.endsOn)} (รวมวันนี้)`],
        ['เลขกรมธรรม์', row.policyNumber || 'รอออกกรมธรรม์'],
      ],
    },
  ];
  return (
    <div className="na-details" id={`request-${row.requestId}`}>
      <div className="na-detail-grid">
        {sections.map(({ title, icon: Icon, fields }) => (
          <section key={title}>
            <h3>
              <Icon size={17} />
              {title}
            </h3>
            <dl>
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || 'ไม่ระบุ'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {row.plan.coverage?.highlights?.length > 0 && (
        <div className="na-highlights">
          <h3>ความคุ้มครองตามแผน</h3>
          <ul>
            {row.plan.coverage.highlights.map((text) => (
              <li key={text}>
                <Check size={15} />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="na-detail-bottom">
        <span>
          คำสั่งซื้อ TOYOTY <span className="na-reference">{row.orderId}</span>
        </span>
        {row.status === 'PENDING_APPROVAL' ? (
          <button
            type="button"
            className="button na-approve"
            disabled={busy}
            onClick={() => approve(row.requestId)}
          >
            <FileCheck2 size={17} />
            {busy ? 'กำลังดำเนินการ…' : 'อนุมัติและออกกรมธรรม์'}
          </button>
        ) : (
          <span className="na-complete">
            <CheckCircle2 size={17} /> ออกกรมธรรม์เรียบร้อย
          </span>
        )}
      </div>
    </div>
  );
}
export default function AdminWorkspace({
  token,
  email,
  setEmail,
  password,
  setPassword,
  rows,
  error,
  setError,
  busy,
  loading,
  offset,
  login,
  logout,
  approve,
  refresh,
  changePage,
  demoAccount,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const pending = rows.filter(
    (row) => row.status === 'PENDING_APPROVAL',
  ).length;
  const issued = rows.filter((row) => row.status === 'ISSUED').length;
  const needle = search.trim().toLocaleLowerCase('th-TH');
  const visible = rows.filter(
    (row) =>
      (filter === 'all' || row.status === filter) &&
      (!needle ||
        [
          row.customer.fullName,
          row.customer.email,
          row.vehicle.brand,
          row.vehicle.model,
          row.vehicle.vin,
          row.orderId,
          row.policyNumber,
        ].some((value) =>
          String(value || '')
            .toLocaleLowerCase('th-TH')
            .includes(needle),
        )),
  );
  return (
    <div className="na-shell">
      <header className="na-topbar">
        <div className="container na-topbar-inner">
          <div className="na-brand">
            <Logo to="/" />
            <span className="na-workspace-label">ADMIN WORKSPACE</span>
          </div>
          <div className="na-topbar-actions">
            <Link className="na-site-link" to="/">
              หน้าเว็บไซต์ <ArrowUpRight size={16} />
            </Link>
            {token && (
              <button
                type="button"
                className="na-logout"
                disabled={busy}
                onClick={logout}
              >
                <LogOut size={16} />
                ออกจากระบบ
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="container nova-admin">
        {!token ? (
          <div className="na-login-layout">
            <section className="na-login-intro">
              <span className="na-intro-icon">
                <ShieldCheck size={38} strokeWidth={1.5} />
              </span>
              <span className="na-eyebrow">NOVA INSURE · ADMIN</span>
              <h1>
                ดูแลทุกคำขอ
                <br />
                ให้พร้อมออกเดินทาง
              </h1>
              <p>
                พื้นที่สำหรับผู้ดูแล NOVA ตรวจสอบข้อมูลประกันจาก TOYOTY
                และจัดการการออกกรมธรรม์ในที่เดียว
              </p>
              <ul>
                {[
                  {
                    icon: ClipboardList,
                    title: 'ตรวจสอบคำขอ',
                    text: 'ข้อมูลลูกค้า รถ และแผนประกันครบถ้วน',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'ทบทวนความคุ้มครอง',
                    text: 'ดูเบี้ยและระยะเวลาคุ้มครองก่อนอนุมัติ',
                  },
                  {
                    icon: FileCheck2,
                    title: 'จัดการกรมธรรม์',
                    text: 'ติดตามสถานะของแต่ละคำขอได้ในที่เดียว',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <li key={title}>
                    <Icon size={20} />
                    <div>
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <span className="na-intro-foot">CONFIDENCE IN EVERY MILE</span>
            </section>
            <section className="na-login-card">
              <span className="na-login-label">
                <UserRound size={17} />
                สำหรับผู้ดูแลระบบ
              </span>
              <h2>เข้าสู่ระบบผู้ดูแล</h2>
              <p>ใช้บัญชีแอดมิน NOVA เพื่อเริ่มจัดการคำขอ</p>
              {error && (
                <div className="nova-admin-error" role="alert">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              <form onSubmit={login} className="nova-admin-login">
                <div className="na-field">
                  <label htmlFor="nova-admin-email">อีเมลแอดมิน NOVA</label>
                  <input
                    id="nova-admin-email"
                    type="email"
                    autoComplete="username"
                    required
                    maxLength={254}
                    placeholder="name@nova.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="na-field">
                  <label htmlFor="nova-admin-password">รหัสผ่าน</label>
                  <div className="na-password">
                    <input
                      id="nova-admin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      maxLength={256}
                      placeholder="กรอกรหัสผ่านของคุณ"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'
                      }
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>
                <button className="button na-login-submit" disabled={busy}>
                  {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
                </button>
                <div className="na-login-divider">
                  <span>บัญชีสาธิตสำหรับโปรเจกต์</span>
                </div>
                <button
                  type="button"
                  className="na-demo-fill"
                  disabled={busy}
                  onClick={() => {
                    setEmail(demoAccount.email);
                    setPassword(demoAccount.password);
                    setError('');
                  }}
                >
                  กรอกบัญชี Admin NOVA อัตโนมัติ
                </button>
              </form>
              <p className="na-login-note">
                <ShieldCheck size={15} />
                ใช้บัญชี NOVA แยกจากบัญชี TOYOTY
              </p>
            </section>
          </div>
        ) : (
          <>
            <div className="na-page-heading">
              <div>
                <span className="na-eyebrow">INSURANCE OPERATIONS</span>
                <h1>คำขอประกันภัย</h1>
                <p>ตรวจสอบข้อมูลและจัดการการออกกรมธรรม์จาก TOYOTY</p>
              </div>
              <button
                type="button"
                className="na-refresh"
                disabled={busy || loading}
                onClick={refresh}
                aria-label="อัปเดตรายการ"
              >
                <RefreshCw size={17} className={loading ? 'spin' : ''} />
                <span>{loading ? 'กำลังอัปเดต' : 'อัปเดตรายการ'}</span>
              </button>
            </div>
            <div className="na-stats" aria-label="ภาพรวมรายการในหน้าปัจจุบัน">
              {[
                {
                  label: 'รายการในหน้านี้',
                  value: rows.length,
                  icon: ClipboardList,
                  tone: 'blue',
                },
                {
                  label: 'รออนุมัติในหน้านี้',
                  value: pending,
                  icon: Clock3,
                  tone: 'amber',
                },
                {
                  label: 'ออกกรมธรรม์ในหน้านี้',
                  value: issued,
                  icon: FileCheck2,
                  tone: 'green',
                },
              ].map(({ label, value, icon: Icon, tone }) => (
                <div className="na-stat" key={label}>
                  <span className={`na-stat-icon ${tone}`}>
                    <Icon size={23} />
                  </span>
                  <div>
                    <span>{label}</span>
                    <strong>
                      {loading && !rows.length ? '—' : value}
                      <small>รายการ</small>
                    </strong>
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div className="nova-admin-error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
                <button type="button" disabled={loading} onClick={refresh}>
                  ลองใหม่
                </button>
              </div>
            )}
            <section className="na-list-panel" aria-labelledby="na-list-title">
              <div className="na-list-heading">
                <div>
                  <h2 id="na-list-title">รายการคำขอ</h2>
                  <p>
                    อัปเดตอัตโนมัติทุก 15 วินาที ·
                    ค้นหาและกรองข้อมูลเฉพาะหน้านี้
                  </p>
                </div>
                <span className="na-page-count">หน้า {offset / 50 + 1}</span>
              </div>
              <div className="na-list-tools">
                <div
                  className="na-filters"
                  role="group"
                  aria-label="กรองสถานะในหน้านี้"
                >
                  {[
                    { value: 'all', label: 'ทั้งหมด', count: rows.length },
                    {
                      value: 'PENDING_APPROVAL',
                      label: 'รออนุมัติ',
                      count: pending,
                    },
                    {
                      value: 'ISSUED',
                      label: 'ออกกรมธรรม์แล้ว',
                      count: issued,
                    },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.value}
                      aria-pressed={filter === item.value}
                      onClick={() => setFilter(item.value)}
                    >
                      {item.label}
                      <span>{item.count}</span>
                    </button>
                  ))}
                </div>
                <div className="na-search">
                  <Search size={18} />
                  <label htmlFor="na-search" className="sr-only">
                    ค้นหาในหน้านี้
                  </label>
                  <input
                    type="search"
                    id="na-search"
                    placeholder="ค้นหาลูกค้า รถ หรือเลขอ้างอิงในหน้านี้"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              {loading && (
                <p className="na-loading" role="status">
                  <RefreshCw size={17} className="spin" />
                  กำลังโหลดรายการ…
                </p>
              )}
              <div className="na-table-head" aria-hidden="true">
                <span>ผู้เอาประกัน</span>
                <span>รถยนต์</span>
                <span>แผนประกัน</span>
                <span>เบี้ยสุทธิ</span>
                <span>สถานะ</span>
                <span>รายละเอียด</span>
              </div>
              {visible.map((row) => (
                <article
                  key={row.requestId}
                  className={`na-request ${expanded === row.requestId ? 'expanded' : ''}`}
                >
                  <div className="na-request-row">
                    <div className="na-customer-cell">
                      <span className="na-avatar">
                        <UserRound size={19} />
                      </span>
                      <div>
                        <h3>{row.customer.fullName}</h3>
                        <span className="na-subline">
                          เริ่ม {formatDate(row.startsOn)}
                        </span>
                      </div>
                    </div>
                    <div className="na-vehicle-cell">
                      <span className="na-cell-label">รถยนต์</span>
                      <strong>
                        {row.vehicle.brand} {row.vehicle.model}
                      </strong>
                      <span className="na-subline">
                        {row.vehicle.year} ·{' '}
                        {row.vehicle.registrationNumber || 'ยังไม่มีทะเบียน'}
                      </span>
                    </div>
                    <div className="na-plan-cell">
                      <span className="na-cell-label">แผนประกัน</span>
                      <strong>{row.plan.name}</strong>
                      <span className="na-subline">
                        {row.plan.insuranceType}
                      </span>
                    </div>
                    <div className="na-premium-cell">
                      <span className="na-cell-label">เบี้ยสุทธิ</span>
                      <strong>฿{money(row.plan.finalAmount)}</strong>
                      <span className="na-subline">ต่อปี</span>
                    </div>
                    <div className="na-status-cell">
                      <Status value={row.status} />
                    </div>
                    <button
                      type="button"
                      className="na-detail-toggle"
                      aria-expanded={expanded === row.requestId}
                      aria-controls={`request-${row.requestId}`}
                      aria-label={`${expanded === row.requestId ? 'ซ่อน' : 'ดู'}รายละเอียดคำขอ ${row.customer.fullName} ${row.vehicle.model}`}
                      onClick={() =>
                        setExpanded((value) =>
                          value === row.requestId ? null : row.requestId,
                        )
                      }
                    >
                      {expanded === row.requestId
                        ? 'ย่อข้อมูล'
                        : 'ดูรายละเอียด'}
                      <ChevronDown size={15} />
                    </button>
                  </div>
                  {expanded === row.requestId && (
                    <Details row={row} busy={busy} approve={approve} />
                  )}
                </article>
              ))}
              {!loading && !visible.length && (
                <div className="na-empty">
                  <Search size={30} />
                  <h3>
                    {rows.length
                      ? 'ไม่พบรายการที่ตรงกัน'
                      : 'ยังไม่มีคำขอในหน้านี้'}
                  </h3>
                  <p>
                    {rows.length
                      ? 'ลองเปลี่ยนคำค้นหาหรือเลือกสถานะอื่น'
                      : 'คำขอจาก TOYOTY จะแสดงที่นี่เมื่อส่งเข้าระบบแล้ว'}
                  </p>
                  {rows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setFilter('all');
                      }}
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
              )}
              <div className="na-pagination">
                <span>
                  แสดง {visible.length} จาก {rows.length} รายการในหน้านี้ ·
                  สูงสุด 50 รายการ/หน้า
                </span>
                <div>
                  <button
                    type="button"
                    aria-label="หน้าก่อน"
                    disabled={busy || loading || offset === 0}
                    onClick={() => {
                      setExpanded(null);
                      changePage(Math.max(0, offset - 50));
                    }}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>{offset / 50 + 1}</span>
                  <button
                    type="button"
                    aria-label="หน้าถัดไป"
                    disabled={busy || loading || rows.length < 50}
                    onClick={() => {
                      setExpanded(null);
                      changePage(offset + 50);
                    }}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
        <footer className="na-footer">
          <span>© {new Date().getFullYear()} NOVA INSURE</span>
          <span>ระบบประกันภัยจำลองเพื่อการศึกษา</span>
        </footer>
      </div>
    </div>
  );
}
