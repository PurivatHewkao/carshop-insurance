import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Check,
  LoaderCircle,
  AlertCircle,
  CarFront,
} from 'lucide-react';
import { money } from './api.js';
export function Logo({ to = '/' }) {
  return (
    <Link className="logo" to={to} aria-label="NOVA INSURE หน้าแรก">
      <span className="logo-symbol">
        <ShieldCheck size={27} />
      </span>
      <span>
        NOVA<span className="logo-light"> INSURE</span>
        <small>CONFIDENCE IN EVERY MILE</small>
      </span>
    </Link>
  );
}
export function DemoNotice() {
  return (
    <p className="demo-notice">
      <ShieldCheck size={18} aria-hidden="true" />
      <span>
        โครงการเพื่อการศึกษาเท่านั้น ความคุ้มครอง รายละเอียด และราคาเป็นตัวอย่าง
        ไม่ใช่คำเสนอขายประกันจริง ไม่มีการชำระเงินและไม่มีความคุ้มครองจริง
      </span>
    </p>
  );
}
export function State({ loading, error, retry }) {
  return (
    <div className="state" role={error ? 'alert' : 'status'}>
      {loading ? (
        <LoaderCircle className="spin" size={30} />
      ) : (
        <AlertCircle size={30} />
      )}
      <p>{loading ? 'กำลังโหลดข้อมูล…' : error}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}
export function Steps({ success = false }) {
  return (
    <ol className="steps" aria-label="ขั้นตอนทำรายการ">
      {['เลือกแผน', 'ข้อมูลผู้เอาประกัน', 'รับกรมธรรม์จำลอง'].map(
        (label, i) => (
          <li
            key={label}
            className={success || i < 2 ? 'active' : ''}
            aria-current={i === (success ? 2 : 1) ? 'step' : undefined}
          >
            <span>{success || i === 0 ? <Check size={16} /> : i + 1}</span>
            {label}
          </li>
        ),
      )}
    </ol>
  );
}
export function Summary({ plan, source }) {
  return (
    <aside className="summary panel">
      <span className="eyebrow">YOUR SELECTED PLAN</span>
      <div className="summary-icon">
        <ShieldCheck size={34} />
      </div>
      <h2>{plan.name}</h2>
      <p>{plan.insuranceType}</p>
      <ul className="coverage-list">
        {plan.coverage.highlights.map((item) => (
          <li key={item}>
            <Check size={17} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <dl className="price-lines">
        <div>
          <dt>ราคาปกติ / ปี</dt>
          <dd>฿{money(plan.originalAmount)}</dd>
        </div>
        {source === 'toyoty' && (
          <div className="discount">
            <dt>
              ส่วนลด TOYOTY 5%<small>สูงสุด 1,000 บาท</small>
            </dt>
            <dd>−฿{money(plan.discountAmount)}</dd>
          </div>
        )}
        <div className="total">
          <dt>ยอดสุทธิสาธิต</dt>
          <dd>฿{money(plan.finalAmount)}</dd>
        </div>
      </dl>
      <p className="muted">
        ราคาคงที่สำหรับสาธิต ไม่ใช่การคำนวณเบี้ยประกันจริง
      </p>
    </aside>
  );
}
export function CarVisual() {
  return (
    <div
      className="car-visual"
      aria-label="ภาพประกอบรถยนต์พร้อมโล่ NOVA INSURE"
      role="img"
    >
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="visual-shield">
        <ShieldCheck size={78} strokeWidth={1.3} />
      </div>
      <svg className="car-drawing" viewBox="0 0 640 310" aria-hidden="true">
        <defs>
          <linearGradient id="carBody" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fafcff" />
            <stop offset=".5" stopColor="#c2d6ee" />
            <stop offset="1" stopColor="#7d9ab9" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#2d5380" />
            <stop offset="1" stopColor="#102541" />
          </linearGradient>
        </defs>
        <ellipse
          cx="320"
          cy="263"
          rx="260"
          ry="23"
          fill="#123b71"
          opacity=".16"
        />
        <path
          d="M64 186l47-20 75-77c20-20 50-30 87-30h104c34 0 61 12 90 44l48 49 62 15c21 5 33 17 33 40v31H45v-24c0-16 6-23 19-28z"
          fill="url(#carBody)"
          stroke="#95afcb"
          strokeWidth="2"
        />
        <path
          d="M192 153l54-65h126c26 0 45 10 65 31l32 34z"
          fill="url(#glass)"
        />
        <path
          d="M315 88v65m-135 15h304M340 169v66m-148-65-20 57"
          fill="none"
          stroke="#7b9ab9"
          strokeWidth="3"
        />
        <path
          d="M62 190h66l-10 17H52m478-29 59 14v16h-53"
          fill="#ecf8ff"
          stroke="#87b9ed"
          strokeWidth="3"
        />
        <path d="M54 228h550" stroke="#6986a8" strokeWidth="8" />
        <g fill="#14293e" stroke="#d4e0ec" strokeWidth="6">
          <circle cx="158" cy="233" r="43" />
          <circle cx="490" cy="233" r="43" />
        </g>
        <g fill="#9fb4cb" stroke="#475f7c" strokeWidth="7">
          <circle cx="158" cy="233" r="23" />
          <circle cx="490" cy="233" r="23" />
        </g>
        <path
          d="M357 177h25m-145 0h25"
          stroke="#486888"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      <div className="visual-label">
        <span>
          <CarFront size={22} />
        </span>
        <div>
          <b>พร้อมไปได้ทุกเส้นทาง</b>
          <small>เลือกความอุ่นใจในแบบคุณ</small>
        </div>
        <ShieldCheck size={23} color="#2563eb" />
      </div>
      <span className="visual-caption">DESIGNED FOR YOUR JOURNEY</span>
    </div>
  );
}
