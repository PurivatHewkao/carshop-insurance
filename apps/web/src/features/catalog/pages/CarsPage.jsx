import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CarImage } from '../../../components/common/Showroom.jsx';
import CarPhoto from '../components/CarPhoto.jsx';
import {
  CATEGORY_LABELS,
  formatBaht,
  getCars,
  getPromotions,
  stockStatus,
} from '../data/catalogData.js';
import './catalog.css';

export default function CarsPage() {
  const [cars] = useState(() => getCars());
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [budget, setBudget] = useState('');
  const [sort, setSort] = useState('recommended');
  const promotions = useMemo(() => getPromotions().filter((item) => item.active).slice(0, 3), []);
  const categories = [...new Set(cars.map((car) => car.type))];
  const heroCar = cars.find((car) => car.id === 'lamborghini-huracan') || cars.find((car) => car.type === 'supercar') || cars[0];

  const filteredCars = cars
    .filter((car) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || `${car.brand} ${car.name} ${car.engine} ${car.fuel}`.toLowerCase().includes(q);
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
      <header className="catalog-hero">
        <div className="catalog-hero-copy">
          <p className="catalog-eyebrow">TOYOTY · CAR COLLECTION</p>
          <h1>ค้นหารถที่ใช่สำหรับคุณ</h1>
          <p>ตั้งแต่รถใช้งานประจำวัน รถครอบครัว รถยนต์ไฟฟ้า ไปจนถึงสปอร์ตและซูเปอร์คาร์</p>
          <div className="catalog-hero-stats">
            <span><strong>{cars.length}</strong> รุ่นในแคตตาล็อก</span>
            <span><strong>{cars.filter((car) => Number(car.stock) > 0).length}</strong> รุ่นมีสต็อก</span>
            <Link to="/promotions">ดูโปรโมชันทั้งหมด ↗</Link>
          </div>
        </div>
        {/* <div className="catalog-hero-art" aria-hidden="true">
          <span className="catalog-orbit" />
          {heroCar && <CarPhoto car={heroCar} className="catalog-hero-photo" />}
          <span className="catalog-hero-label">DRIVE YOUR NEXT</span>
        </div> */}
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

        <div className="catalog-categories" aria-label="กรองตามประเภทรถ">
          <button type="button" className={!category ? 'is-active' : ''} onClick={() => setCategory('')} aria-pressed={!category}>
            <span className="catalog-category-symbol">▦</span> ทุกรุ่น
          </button>
          {categories.map((type) => (
            <button key={type} type="button" className={category === type ? 'is-active' : ''} onClick={() => setCategory(type)} aria-pressed={category === type}>
              <CarImage type={type} outline />
              {CATEGORY_LABELS[type] || type}
            </button>
          ))}
        </div>

        <div className="catalog-toolbar">
          <label className="catalog-search-field">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">ค้นหารุ่นรถ ยี่ห้อ หรือเครื่องยนต์</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหายี่ห้อ รุ่น หรือเครื่องยนต์..." type="search" />
          </label>
          <label className="catalog-select-label">
            <span className="sr-only">ช่วงราคา</span>
            <select value={budget} onChange={(event) => setBudget(event.target.value)}>
              <option value="">ทุกช่วงราคา</option>
              <option value="800000">ไม่เกิน ฿800,000</option>
              <option value="1500000">ไม่เกิน ฿1,500,000</option>
              <option value="5000000">ไม่เกิน ฿5,000,000</option>
              <option value="15000000">ไม่เกิน ฿15,000,000</option>
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

        {filteredCars.length ? (
          <div className="catalog-car-grid">
            {filteredCars.map((car) => {
              const status = stockStatus(car.stock);
              return (
                <article className="catalog-car-card" key={car.id}>
                  <Link to={`/catalog/${encodeURIComponent(car.id)}`} className="catalog-car-photo-wrap" aria-label={`ดูรายละเอียด ${car.brand} ${car.name}`}>
                    <span className="catalog-car-badge">{car.tag}</span>
                    <CarPhoto car={car} className="catalog-car-photo" />
                    <span className={`catalog-stock-dot ${status.tone}`}><i />{status.label}</span>
                  </Link>
                  <div className="catalog-car-card-body">
                    <p className="catalog-car-brand">{car.brand} · {CATEGORY_LABELS[car.type] || car.type}</p>
                    <Link to={`/catalog/${encodeURIComponent(car.id)}`} className="catalog-car-title">{car.name}</Link>
                    <div className="catalog-car-spec-line"><span>{car.year}</span><span>{car.fuel}</span><span>{car.seats} ที่นั่ง</span></div>
                    <div className="catalog-car-card-footer">
                      <div><small>ราคาเริ่มต้น</small><strong>{formatBaht(car.price)}</strong></div>
                      <Link className="catalog-detail-arrow" to={`/catalog/${encodeURIComponent(car.id)}`} aria-label={`รายละเอียด ${car.name}`}>↗</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="catalog-empty-state"><span>⌕</span><h3>ไม่พบรถที่ตรงกับการค้นหา</h3><p>ลองเปลี่ยนคำค้นหา ประเภทรถ หรือช่วงราคา</p><button type="button" onClick={() => { setCategory(''); setSearch(''); setBudget(''); }}>ล้างตัวกรอง</button></div>
        )}
      </section>
      <p className="catalog-demo-note">หมายเหตุ: ราคา สเปก สต็อก และโปรโมชันเป็นข้อมูลสาธิตสำหรับ Frontend Prototype โปรดตรวจสอบข้อมูลจริงกับผู้จำหน่ายก่อนตัดสินใจ</p>
    </div>
  );
}
