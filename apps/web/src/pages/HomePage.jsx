import { useState } from 'react';
import './HomePage.css';
import { Link } from 'react-router-dom';
import design from '../design/toyoty.json';
import { Action, Pill, Specs } from '../components/common/Showroom.jsx';
import CarPhoto from '../features/catalog/components/CarPhoto.jsx';
import {
  formatBaht,
  getCars,
  getPromotions,
} from '../features/catalog/data/catalogData.js';

const blocks = design.roles[0].pages[0].blocks;

function HomeCarGrid({ block, cars }) {
  const featuredCars = [
    ...cars.filter((car) => car.featured),
    ...cars.filter((car) => !car.featured),
  ].filter((car, index, list) => list.findIndex((item) => item.id === car.id) === index).slice(0, 4);

  return (
    <section>
      <div className="s-sec-h">
        <h2>{block.title}</h2>
        <span className="cnt">{featuredCars.length} รุ่น</span>
        <Link className="lnk" to="/catalog">{block.link || 'ดูรถทั้งหมด →'}</Link>
      </div>
      <div className="s-cars" style={{ '--cols': 4 }}>
        {featuredCars.map((car) => (
          <Link className="s-car home-real-car-card" key={car.id} to={`/catalog/${encodeURIComponent(car.id)}`}>
            <h3>{car.brand} {car.name}</h3>
            <div className="pr">เริ่มต้น {formatBaht(car.price)}</div>
            <span className="tag"><Pill>{car.tag || 'แนะนำ'}</Pill></span>
            <div className="im home-real-car-image"><CarPhoto car={car} className="home-card-car-photo" /></div>
            <span className="go">ดูรายละเอียดรุ่นนี้ →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const PROMO_ICONS = [
  // gift
  <svg key="gift" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12" /><path d="M12 8c-1.5-3.5-5-3.5-5-1.5S10 8 12 8zm0 0c1.5-3.5 5-3.5 5-1.5S14 8 12 8z" /></svg>,
  // shield
  <svg key="shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>,
  // percent tag
  <svg key="tag" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="8.5" r="1.2" /><path d="M10 16l5-5" /></svg>,
];

function HomePromotionCard({ promotion, index }) {
  return (
    <article className={`s-promo k${index % 3} home-real-promo`} key={promotion.id}>
      <div className="home-promo-art">{PROMO_ICONS[index % PROMO_ICONS.length]}</div>
      <span className="tag">{promotion.badge || 'โปรโมชัน'}</span>
      <div className="big">{promotion.value || promotion.title}</div>
      <h3>{promotion.title}</h3>
      <p>{promotion.description || promotion.subtitle}</p>
      <Action variant={index < 2 ? 'glass' : 'out'} to="/promotions">ดูรายละเอียดโปรโมชัน →</Action>
    </article>
  );
}

export default function HomePage() {
  const [hero, specs, carsBlock, _promoBlock, features, cta] = blocks;
  const [catalogCars] = useState(() => getCars());
  const [activePromotions] = useState(() => getPromotions().filter((promotion) => promotion.active));
  const heroCar = catalogCars.find((car) => car.id === 'ferrari-296-gtb')
    || catalogCars.find((car) => car.type === 'supercar')
    || catalogCars[0];

  return (
    <>
      <section className="s-hero home-photo-hero">
        <div className="s-hero-bg" />
        <div className="home-hero-copy">
          <p className="s-eyebrow on-dark">{heroCar ? 'ซูเปอร์คาร์ · รุ่นเด่น' : hero.eyebrow}</p>
          <h1>{heroCar ? `${heroCar.brand} ${heroCar.name}` : hero.title}</h1>
          <p className="s-hero-sub">{heroCar ? 'สัมผัสสมรรถนะระดับซูเปอร์คาร์ พร้อมประกันภัยชั้น 1 และทีมงานดูแลตลอดการเป็นเจ้าของ' : hero.sub}</p>
          <p className="s-hero-price">เริ่มต้น {heroCar ? formatBaht(heroCar.price) : hero.price}</p>
          <div className="s-actions">
            <Action to="/requests?type=จอง">{hero.btn1}</Action>
            <Action variant="glass" to="/requests?type=นัดดูรถ">{hero.btn2}</Action>
          </div>
        </div>
        <div className="s-hero-car home-real-hero-car">
          {heroCar && <CarPhoto car={heroCar} className="home-hero-car-photo" imageOnly />}
        </div>
      </section>
      <div className="spec-strip">
        <Specs items={specs.items} />
      </div>
      <div className="page-content home-content">
        <HomeCarGrid block={carsBlock} cars={catalogCars} />
        <section id="promotions">
          <div className="s-sec-h">
            <h2>โปรโมชันที่เปิดใช้งาน</h2>
            <Link className="lnk" to="/promotions">ดูโปรโมชันทั้งหมด →</Link>
          </div>
          {activePromotions.length ? (
            <div className="s-promos home-real-promos-grid">
              {activePromotions.slice(0, 3).map((promotion, index) => {
                return <HomePromotionCard key={promotion.id} promotion={promotion} index={index} />;
              })}
            </div>
          ) : (
            <div className="home-no-promotions"><strong>ขณะนี้ยังไม่มีโปรโมชันที่เปิดแสดง</strong><p>สามารถกลับมาดูข้อเสนอใหม่ได้ภายหลัง</p><Link to="/promotions">ดูหน้าโปรโมชัน →</Link></div>
          )}
        </section>
        <section className="s-feats" id="services">
          {features.items.map((item, i) => (
            <article className="s-feat" key={item.a}>
              <span className="ic-b" aria-hidden="true">{['◇', '◷', '✓'][i]}</span>
              <h3>{item.a}</h3>
              <p>{item.b}</p>
            </article>
          ))}
        </section>
        <section className="s-cta" id="insurance">
          <div>
            <h2>{cta.title}</h2>
            <p>{cta.body}</p>
          </div>
          <Action variant="light" to="/requests?type=จอง">{cta.btn}</Action>
        </section>
      </div>
    </>
  );
}