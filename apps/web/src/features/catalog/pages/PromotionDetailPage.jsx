import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePromotions } from '../api/catalogApi.js';
import './catalog.css';

// Used only when a promotion has no steps of its own.
const DEFAULT_STEPS = [
  ['เลือกรถที่ร่วมรายการ', 'ดูรุ่นและราคาในแคตตาล็อก แล้วเลือกรุ่นที่ตรงกับเงื่อนไขของโปรโมชัน'],
  ['ส่งคำขอให้ทีมขาย', 'กรอกคำขอใบเสนอราคาหรือนัดทดลองขับ ทีมขายจะแจ้งสิทธิ์ที่ใช้ได้กับรุ่นนั้น'],
  ['รับข้อเสนอและยืนยัน', 'ตรวจเงื่อนไขกับทีมขายก่อนทำสัญญา แล้วใช้สิทธิ์ตามโปรโมชันได้ทันที'],
];

function formatDate(date) {
  if (!date) return 'ไม่ระบุวันสิ้นสุด';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
}

function parseSteps(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split('|');
      return [title.trim(), rest.join('|').trim()];
    });
}

function splitConditions(text) {
  return String(text || '')
    .split(/\r?\n|;|•/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PromotionDetailPage() {
  const { id } = useParams();
  const { promotions, loading, error } = usePromotions();
  const [imageFailed, setImageFailed] = useState(false);
  const promotion = promotions.find((item) => String(item.id) === id);
  const others = promotions.filter((item) => item.active && String(item.id) !== id).slice(0, 3);

  if (!promotion || !promotion.active) {
    return (
      <div className="page-content catalog-page catalog-promo-detail-page">
        <div className="catalog-empty-state">
          {loading && !error ? <p>กำลังโหลดโปรโมชัน...</p> : (
            <>
              <h3>{error ? 'โหลดโปรโมชันไม่สำเร็จ' : 'ไม่พบโปรโมชันนี้'}</h3>
              <p>{error || 'โปรโมชันอาจสิ้นสุดแล้ว หรือถูกปิดการแสดงผล'}</p>
              <Link className="s-btn pri" to="/promotions">ดูโปรโมชันทั้งหมด</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const conditions = splitConditions(promotion.conditions);
  const ownSteps = parseSteps(promotion.steps);
  const steps = ownSteps.length ? ownSteps : DEFAULT_STEPS;
  const showImage = promotion.imageUrl && !imageFailed;

  return (
    <div className="page-content catalog-page catalog-promo-detail-page">
      <nav className="catalog-promo-detail-back" aria-label="เส้นทางหน้า">
        <Link to="/promotions">← โปรโมชันทั้งหมด</Link>
      </nav>

      <header className="catalog-promo-detail-hero">
        {showImage && (
          <img className="catalog-promo-detail-cover" src={promotion.imageUrl} alt={`ภาพประกอบโปรโมชัน ${promotion.title}`} onError={() => setImageFailed(true)} />
        )}
        <div className="catalog-promo-detail-shade" aria-hidden="true" />
        <div className="catalog-promo-detail-copy">
          <span className="catalog-promo-detail-badge">{promotion.badge || 'โปรโมชัน'}</span>
          <h1>{promotion.title}</h1>
          {promotion.subtitle && <p className="catalog-promo-detail-sub">{promotion.subtitle}</p>}
          <strong className="catalog-promo-detail-value">{promotion.value}</strong>
          <div className="catalog-promo-detail-actions">
            <Link className="catalog-cta solid" to="/catalog">เลือกรถที่ร่วมรายการ</Link>
            <Link className="catalog-cta ghost" to="/requests?type=สนใจ">ขอใบเสนอราคา</Link>
          </div>
        </div>
      </header>

      <div className="catalog-promo-detail-layout">
        <main className="catalog-promo-detail-main">
          <section>
            <p className="catalog-eyebrow">DETAILS</p>
            <h2>รายละเอียดโปรโมชัน</h2>
            <p className="catalog-promo-detail-text">{promotion.description}</p>
          </section>
          <section>
            <p className="catalog-eyebrow">CONDITIONS</p>
            <h2>เงื่อนไขการรับสิทธิ์</h2>
            {conditions.length > 1 ? (
              <ul className="catalog-promo-detail-list">{conditions.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : (
              <p className="catalog-promo-detail-text">{conditions[0] || 'โปรดสอบถามเงื่อนไขเพิ่มเติมกับทีมขาย'}</p>
            )}
          </section>
          <section>
            <p className="catalog-eyebrow">HOW TO REDEEM</p>
            <h2>ขั้นตอนการรับสิทธิ์</h2>
            <ol className="catalog-promo-detail-steps">
              {steps.map(([title, text]) => <li key={title}><strong>{title}</strong>{text && <span>{text}</span>}</li>)}
            </ol>
          </section>
        </main>

        <aside className="catalog-promo-detail-side" aria-label="สรุปโปรโมชัน">
          <h3>สรุปข้อเสนอ</h3>
          <dl>
            <div><dt>ข้อเสนอ</dt><dd>{promotion.value}</dd></div>
            <div><dt>เหมาะสำหรับ</dt><dd>{promotion.appliesTo || 'รถทุกรุ่น'}</dd></div>
            {promotion.startDate && <div><dt>เริ่มต้น</dt><dd>{formatDate(promotion.startDate)}</dd></div>}
            <div><dt>สิ้นสุด</dt><dd>{formatDate(promotion.endDate)}</dd></div>
          </dl>
          <Link className="catalog-cta solid" to="/requests?type=นัดดูรถ">นัดทดลองขับ</Link>
          <Link className="catalog-cta outline" to="/requests?type=สนใจ">ขอใบเสนอราคา</Link>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="catalog-promo-detail-more">
          <div className="catalog-section-heading"><div><p className="catalog-eyebrow">MORE OFFERS</p><h2>โปรโมชันอื่น ๆ</h2></div><Link className="catalog-text-link" to="/promotions">ดูทั้งหมด <span aria-hidden="true">→</span></Link></div>
          <div className="catalog-promo-mini-grid">
            {others.map((item) => (
              <Link key={item.id} to={`/promotions/${encodeURIComponent(item.id)}`} className="catalog-promo-mini">
                <span className="catalog-promo-mini-badge">{item.badge}</span>
                <strong>{item.title}</strong>
                <span>{item.value}</span>
                <small>{item.subtitle}</small>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
