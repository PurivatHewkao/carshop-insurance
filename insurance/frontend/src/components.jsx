import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Check,
  LoaderCircle,
  AlertCircle,
  CarFront,
} from 'lucide-react';
import { money } from './api.js';
import journeyPhoto from './assets/camry-journey.jpg';
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
    <div className="car-visual car-visual-photo">
      <img
        className="nova-car-photo"
        src={journeyPhoto}
        alt="Toyota Camry สีขาวขับบนถนนภูเขาท่ามกลางแสงอาทิตย์"
        width="1920"
        height="1280"
        fetchPriority="high"
      />
      <div className="nova-photo-badge">
        <ShieldCheck size={23} aria-hidden="true" />
        <span>NOVA INSURE <small>CONFIDENCE IN EVERY MILE</small></span>
      </div>
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
