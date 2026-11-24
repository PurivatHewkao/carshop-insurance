import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CarPhoto from '../components/CarPhoto.jsx';
import {
  CATEGORY_LABELS,
  formatBaht,
  stockStatus,
} from '../data/catalogData.js';
import { useCars, usePromotions } from '../api/catalogApi.js';
import './catalog.css';

export default function CarsPage() {
  const { cars, loading, error: loadError } = useCars();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [budget, setBudget] = useState('');
  const [sort, setSort] = useState('recommended');
  const { promotions: allPromotions } = usePromotions();
  const promotions = useMemo(() => allPromotions.filter((item) => item.active).slice(0, 3), [allPromotions]);
  const categories = [...new Set(cars.map((car) => car.type))];
  const showcaseCar = useMemo(() => cars.find((car) => car.featured && car.configurable) || cars.find((car) => car.configurable) || cars[0], [cars]);
  const trimCount = cars.reduce((sum, car) => sum + (Number(car.trimCount) || 0), 0);

  const filteredCars = cars
    .filter((car) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || `${car.name} ${car.tag} ${CATEGORY_LABELS[car.type] || car.type} ${car.fuel}`.toLowerCase().includes(q);
      return (!category || car.type === category)
        && matchesSearch
        && (!budget || Number(car.price) <= Number(budget));
    })
    .sort((a, b) => {
      if (sort === 'price-low') return Number(a.price) - Number(b.price);
      if (sort === 'price-high') return Number(b.price) - Number(a.price);
      if (sort === 'name') return a.name.localeCompare(b.name, 'th');
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(a.price) - Number(b.price);
    });

  return (
    <div className="page-content catalog-page">
      <header className="catalog-showcase">
        {showcaseCar && <CarPhoto car={showcaseCar} className="catalog-showcase-photo" imageOnly />}
        <div className="catalog-showcase-shade" aria-hidden="true" />
        <div className="catalog-showcase-copy">
          <p className="catalog-eyebrow">TOYOTY · CAR COLLECTION</p>
          <h1>{showcaseCar ? `${showcaseCar.brand} ${showcaseCar.name}` : 'ค้นหารถที่ใช่สำหรับคุณ'}</h1>
          <p>{showcaseCar ? `เริ่มต้น ${formatBaht(showcaseCar.price)} · เลือกรุ่นย่อย สี และล้อได้เอง` : 'ซีดาน SUV และกระบะ สั่งผลิตตามสเปกที่คุณเลือก'}</p>
        </div>
        <div className="catalog-showcase-bottom">
          {showcaseCar && (
            <div className="catalog-showcase-actions">
              <Link className="catalog-cta solid" to={`/catalog/${encodeURIComponent(showcaseCar.id)}`}>{showcaseCar.configurable ? 'แต่งรถคันนี้' : 'ดูรายละเอียด'}</Link>
              {Number(showcaseCar.stock) > 0 ? (
                <Link className="catalog-cta ghost" to={`/requests?brand=${encodeURIComponent(showcaseCar.brand)}&car=${encodeURIComponent(showcaseCar.name)}&type=${encodeURIComponent('ทดลองขับ')}`}>นัดทดลองขับ</Link>
              ) : (
                <span className="catalog-cta ghost is-disabled" aria-disabled="true">หมดสต็อก</span>
              )}
            </div>
          )}
          <div className="catalog-showcase-stats">
            <span><strong>{cars.length}</strong> รุ่นในแคตตาล็อก</span>
            {trimCount > 0 && <span><strong>{trimCount}</strong> รุ่นย่อยให้เลือก</span>}
            <Link to="/promotions">ดูโปรโมชันทั้งหมด ↗</Link>
          </div>
        </div>
      </header>

      {promotions.length > 0 && (
        <section className="catalog-promo-strip" aria-label="โปรโมชันแนะนำ">
          <div className="catalog-section-heading">
            <div><p className="catalog-eyebrow">SPECIAL OFFERS</p><h2>โปรโมชันแนะนำ</h2></div>
            <Link className="catalog-text-link" to="/promotions">ดูทั้งหมด <span aria-hidden="true">→</span></Link>
          </div>
          <div className="catalog-promo-mini-grid">
            {promotions.map((promo) => (
              <Link key={promo.id} to="/promotions" className="catalog-promo-mini">
                <span className="catalog-promo-mini-badge">{promo.badge}</span>
                <strong>{promo.title}</strong>
                <span>{promo.value}</span>
                <small>{promo.subtitle}</small>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="catalog-inventory-section">
        <div className="catalog-section-heading">
          <div><p className="catalog-eyebrow">FIND YOUR MATCH</p><h2>รถยนต์ทั้งหมด</h2></div>
          <span className="catalog-results-count">พบ {filteredCars.length} รุ่น</span>
        </div>

        <div className="catalog-tabs" aria-label="กรองตามประเภทรถ">
          <button type="button" className={!category ? 'is-active' : ''} onClick={() => setCategory('')} aria-pressed={!category}>ทุกรุ่น</button>
          {categories.map((type) => (
            <button key={type} type="button" className={category === type ? 'is-active' : ''} onClick={() => setCategory(type)} aria-pressed={category === type}>
              {CATEGORY_LABELS[type] || type}
            </button>
          ))}
        </div>

        <div className="catalog-toolbar">
          <label className="catalog-search-field">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">ค้นหารุ่นหรือประเภทรถ</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารุ่นหรือประเภทรถ เช่น Khon, กระบะ..." type="search" />
          </label>
          <label className="catalog-select-label">
            <span className="sr-only">ช่วงราคา</span>
            <select value={budget} onChange={(event) => setBudget(event.target.value)}>
              <option value="">ทุกช่วงราคา</option>
              <option value="1800000">เริ่มต้นไม่เกิน ฿1,800,000</option>
              <option value="2100000">เริ่มต้นไม่เกิน ฿2,100,000</option>
              <option value="2300000">เริ่มต้นไม่เกิน ฿2,300,000</option>
            </select>
          </label>
          <label className="catalog-select-label">
            <span className="sr-only">เรียงรายการ</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="recommended">เรียงตามแนะนำ</option>
              <option value="price-low">ราคาต่ำไปสูง</option>
              <option value="price-high">ราคาสูงไปต่ำ</option>
              <option value="name">ชื่อรุ่น A–Z</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="catalog-empty-state"><h3>กำลังโหลดรายการรถ...</h3></div>
        ) : loadError ? (
          <div className="catalog-empty-state" role="alert"><h3>โหลดรายการรถไม่สำเร็จ</h3><p>{loadError}</p></div>
        ) : filteredCars.length ? (
          <div className="catalog-tile-grid">
            {filteredCars.map((car) => {
              const status = car.configurable ? { label: 'สั่งผลิต · 3 รุ่นย่อย', tone: 'in' } : stockStatus(car.stock);
              const detailUrl = `/catalog/${encodeURIComponent(car.id)}`;
              const requestUrl = `/requests?brand=${encodeURIComponent(car.brand)}&car=${encodeURIComponent(car.name)}&type=${encodeURIComponent('ทดลองขับ')}`;
              return (
                <article className="catalog-tile" key={car.id}>
                  <Link to={detailUrl} className="catalog-tile-link" aria-label={`ดูรายละเอียด ${car.brand} ${car.name}`}>
                    <CarPhoto car={car} className="catalog-tile-photo" />
                    <span className="catalog-tile-shade" aria-hidden="true" />
                  </Link>
                  <div className="catalog-tile-copy">
                    <p className="catalog-tile-brand">{car.brand} · {car.tag || CATEGORY_LABELS[car.type] || car.type}{car.seats ? ` · ${car.seats} ที่นั่ง` : ''}</p>
                    <h3><Link to={detailUrl}>{car.name}</Link></h3>
                    <p className="catalog-tile-price">เริ่มต้น <strong>{formatBaht(car.price)}</strong></p>
                  </div>
                  <span className={`catalog-tile-status ${status.tone}`}><i />{status.label}</span>
                  <div className="catalog-tile-actions">
                    <Link className="catalog-cta solid" to={detailUrl}>{car.configurable ? 'แต่งรถ & สั่งจอง' : 'ดูรายละเอียด'}</Link>
                    {Number(car.stock) > 0 ? (
                      <Link className="catalog-cta ghost" to={requestUrl}>นัดทดลองขับ</Link>
                    ) : car.configurable ? (
                      <Link className="catalog-cta ghost" to={detailUrl}>เทียบรุ่นย่อย</Link>
                    ) : (
                      <span className="catalog-cta ghost is-disabled" aria-disabled="true">หมดสต็อก</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="catalog-empty-state"><span>⌕</span><h3>ไม่พบรถที่ตรงกับการค้นหา</h3><p>ลองเปลี่ยนคำค้นหา ประเภทรถ หรือช่วงราคาเริ่มต้น</p><button type="button" onClick={() => { setCategory(''); setSearch(''); setBudget(''); }}>ล้างตัวกรอง</button></div>
        )}
      </section>
      <p className="catalog-demo-note">หมายเหตุ: รถทุกรุ่นสั่งผลิตตามสเปกที่เลือก ราคาเริ่มต้นคือรุ่นย่อย Eco ราคา สเปก และโปรโมชันเป็นข้อมูลสาธิต อ่านจากฐานข้อมูลผ่าน catalog API</p>
    </div>
  );
}