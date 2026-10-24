import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CarPhoto from '../components/CarPhoto.jsx';
import {
  CATEGORY_LABELS,
  formatBaht,
  getCars,
  saveCars,
  stockStatus,
} from '../data/catalogData.js';
import './catalog.css';

export default function StockPage() {
  const [cars, setCars] = useState(() => getCars());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('all');
  const [notice, setNotice] = useState('');
  const [stockDrafts, setStockDrafts] = useState({});
  const categories = [...new Set(cars.map((car) => car.type))];

  const filteredCars = useMemo(() => cars.filter((car) => {
    const matchesText = `${car.brand} ${car.name}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = !category || car.type === category;
    const stock = Number(car.stock) || 0;
    const matchesAvailability = availability === 'all'
      || (availability === 'available' && stock > 2)
      || (availability === 'low' && stock > 0 && stock <= 2)
      || (availability === 'out' && stock <= 0);
    return matchesText && matchesCategory && matchesAvailability;
  }), [cars, query, category, availability]);

  const totalUnits = cars.reduce((sum, car) => sum + Math.max(0, Number(car.stock) || 0), 0);
  const lowStockCount = cars.filter((car) => Number(car.stock) > 0 && Number(car.stock) <= 2).length;
  const outOfStockCount = cars.filter((car) => Number(car.stock) <= 0).length;

  function updateStock(carId, amount) {
    const next = cars.map((car) => car.id === carId ? { ...car, stock: Math.max(0, Number(amount) || 0) } : car);
    saveCars(next);
    setCars(next);
    const changed = next.find((car) => car.id === carId);
    setNotice(`ปรับสต็อก ${changed.brand} ${changed.name} เป็น ${changed.stock} คันแล้ว (บันทึกในเบราว์เซอร์นี้)`);
  }

  return (
    <div className="page-content catalog-admin-page catalog-stock-page">
      <header className="catalog-admin-heading">
        <div><p className="catalog-eyebrow">INVENTORY CONTROL</p><h1>สต็อกรถยนต์</h1><p>ตรวจจำนวนรถ ปรับยอดตัวอย่าง และดูรุ่นที่ใกล้หมดสต็อก</p></div>
        <div className="catalog-admin-nav"><Link to="/admin/cars">จัดการรถ</Link><Link className="is-active" to="/admin/stock">สต็อกสินค้า</Link><Link to="/admin/promotions">โปรโมชัน</Link><Link to="/catalog">ดูหน้าร้าน ↗</Link></div>
      </header>
      <div className="catalog-admin-notice"><span>i</span><p>ยอดสต็อกนี้เป็นข้อมูลจำลองใน Frontend และบันทึกเฉพาะเบราว์เซอร์ที่กำลังใช้งาน การจองจริงยังไม่ตัดสต็อกจากระบบกลาง</p></div>
      {notice && <div className="catalog-form-feedback" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความ">×</button></div>}

      <div className="catalog-stock-metrics">
        <article><span className="catalog-metric-icon">▦</span><small>รุ่นรถทั้งหมด</small><strong>{cars.length}</strong><span>รุ่นในแคตตาล็อก</span></article>
        <article><span className="catalog-metric-icon">▤</span><small>จำนวนรถรวม</small><strong>{totalUnits.toLocaleString('th-TH')}</strong><span>คันในสต็อกตัวอย่าง</span></article>
        <article className={lowStockCount ? 'is-warning' : ''}><span className="catalog-metric-icon">!</span><small>สต็อกใกล้หมด</small><strong>{lowStockCount}</strong><span>รุ่นที่เหลือไม่เกิน 2 คัน</span></article>
        <article className={outOfStockCount ? 'is-danger' : ''}><span className="catalog-metric-icon">×</span><small>หมดสต็อก</small><strong>{outOfStockCount}</strong><span>รุ่นที่ต้องสั่งเพิ่มหรือสอบถาม</span></article>
      </div>

      <section className="catalog-admin-panel catalog-stock-panel">
        <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">INVENTORY OVERVIEW</p><h2>รายการจำนวนรถ</h2></div><span className="catalog-number-tag">{filteredCars.length} รุ่นที่แสดง</span></div>
        <div className="catalog-stock-filters">
          <label className="catalog-search-field"><span aria-hidden="true">⌕</span><span className="sr-only">ค้นหารุ่นรถ</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหายี่ห้อหรือรุ่นรถ..." /></label>
          <label><span className="sr-only">ประเภท</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">ทุกประเภทรถ</option>{categories.map((type) => <option key={type} value={type}>{CATEGORY_LABELS[type] || type}</option>)}</select></label>
          <label><span className="sr-only">สถานะสต็อก</span><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">ทุกสถานะ</option><option value="available">พร้อมจำหน่าย (&gt; 2)</option><option value="low">เหลือน้อย (1–2)</option><option value="out">หมดสต็อก</option></select></label>
        </div>
        <div className="catalog-stock-table-wrap"><table className="catalog-stock-table"><thead><tr><th>รถยนต์</th><th>ราคาเริ่มต้น</th><th>สถานะ</th><th>จำนวนคงเหลือ</th><th>ปรับยอด</th></tr></thead><tbody>
          {filteredCars.map((car) => {
            const status = stockStatus(car.stock);
            return <tr key={car.id}><td><div className="catalog-stock-car"><CarPhoto car={car} className="catalog-stock-thumb" /><div><strong>{car.brand} {car.name}</strong><small>{CATEGORY_LABELS[car.type] || car.type} · {car.year}</small></div></div></td><td>{formatBaht(car.price)}</td><td><span className={`catalog-status-chip ${status.tone}`}><i />{status.label}</span></td><td><strong className="catalog-stock-count">{Number(car.stock) || 0}</strong><span className="catalog-stock-unit">คัน</span></td><td><div className="catalog-stock-stepper"><button type="button" onClick={() => updateStock(car.id, Number(car.stock) - 1)} disabled={Number(car.stock) <= 0} aria-label={`ลดสต็อก ${car.name}`}>−</button><input aria-label={`จำนวนสต็อก ${car.name}`} type="number" min="0" max="9999" value={stockDrafts[car.id] ?? (Number(car.stock) || 0)} onChange={(event) => setStockDrafts((current) => ({ ...current, [car.id]: event.target.value }))} onBlur={(event) => { if (Object.prototype.hasOwnProperty.call(stockDrafts, car.id)) { updateStock(car.id, event.target.value); setStockDrafts((current) => { const next = { ...current }; delete next[car.id]; return next; }); } }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><button type="button" onClick={() => updateStock(car.id, Number(car.stock) + 1)} aria-label={`เพิ่มสต็อก ${car.name}`}>＋</button></div></td></tr>;
          })}
        </tbody></table>{!filteredCars.length && <div className="catalog-empty-inline">ไม่พบรถที่ตรงกับตัวกรองนี้</div>}</div>
      </section>
      <p className="catalog-demo-note">แนวทางพัฒนาต่อเมื่อต่อ Backend: แยกสถานที่เก็บรถ/รหัสรถ, กำหนดสิทธิ์การปรับยอด, เก็บประวัติการเคลื่อนไหวสต็อก และล็อกยอดเมื่อมีคำสั่งซื้อเพื่อป้องกัน overselling</p>
    </div>
  );
}
