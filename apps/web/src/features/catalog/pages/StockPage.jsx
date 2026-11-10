import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CarPhoto from '../components/CarPhoto.jsx';
import {
  apiErrorMessage,
  fetchCarPage,
  fetchStockSummary,
  saveCarStock,
} from '../api/catalogApi.js';
import { CATEGORY_LABELS, formatBaht, stockStatus } from '../data/catalogData.js';
import './catalog.css';

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const MAX_STOCK = 500;

// Page numbers to show: always first/last, current ±1, "…" for gaps.
function pageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('gap-start');
  for (let number = start; number <= end; number += 1) items.push(number);
  if (end < total - 1) items.push('gap-end');
  items.push(total);
  return items;
}

export default function StockPage() {
  const [query, setQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: '', items: [], total: 0, totalPages: 1, error: '' });
  const [summary, setSummary] = useState(null);
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');
  const [stockDrafts, setStockDrafts] = useState({});

  // Wait 300 ms after typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const requestKey = JSON.stringify([searchText, category, availability, page, pageSize, reloadKey]);
  const loading = result.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    const params = { page, pageSize, availability };
    if (searchText) params.q = searchText;
    if (category) params.type = category;
    fetchCarPage(params, controller.signal).then(
      (body) => {
        // The last page can disappear after a stock change: step back one page.
        if (!body.data.length && page > 1 && body.meta.total > 0) setPage(body.meta.totalPages);
        else setResult({ key: requestKey, items: body.data, total: body.meta.total, totalPages: body.meta.totalPages, error: '' });
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, items: [], total: 0, totalPages: 1, error: apiErrorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [requestKey, searchText, category, availability, page, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStockSummary(controller.signal).then(setSummary, () => {});
    return () => controller.abort();
  }, [reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);
  const currentPage = Math.min(page, result.totalPages);
  const pageStart = (currentPage - 1) * pageSize;

  function goToPage(next) {
    setPage(Math.min(Math.max(1, next), result.totalPages));
  }

  async function updateStock(car, amount) {
    const stock = Math.min(MAX_STOCK, Math.max(0, Math.trunc(Number(amount)) || 0));
    setSavingId(car.id);
    try {
      const saved = await saveCarStock(car.id, stock);
      setNotice(`ปรับสต็อก ${saved.brand} ${saved.name} เป็น ${saved.stock} คันแล้ว (บันทึกในฐานข้อมูล)`);
      reload();
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="page-content catalog-admin-page catalog-stock-page">
      <header className="catalog-admin-heading">
        <div><p className="catalog-eyebrow">INVENTORY CONTROL</p><h1>สต็อกรถยนต์</h1><p>ตรวจจำนวนรถ ปรับยอดสต็อก และดูรุ่นที่ใกล้หมดสต็อก</p></div>
        <div className="catalog-admin-nav"><Link to="/admin/cars">จัดการรถ</Link><Link className="is-active" to="/admin/stock">สต็อกสินค้า</Link><Link to="/admin/promotions">โปรโมชัน</Link><Link to="/catalog">ดูหน้าร้าน ↗</Link></div>
      </header>
      <div className="catalog-admin-notice"><span>i</span><p>ยอดสต็อกอ่านและบันทึกจากฐานข้อมูลผ่าน catalog API สต็อกของแต่ละรุ่นคือจำนวนรถสถานะ “พร้อมขาย” การเพิ่มหรือลดจะเพิ่มหรือปิดรายการรถรายคัน โดยไม่ลบข้อมูลเดิม</p></div>
      {notice && <div className="catalog-form-feedback" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความ">×</button></div>}
      {result.error && <div className="catalog-form-feedback" role="alert">{result.error}<button type="button" onClick={reload} aria-label="ลองโหลดใหม่">↻</button></div>}

      <div className="catalog-stock-metrics">
        <article><span className="catalog-metric-icon">▦</span><small>รุ่นรถทั้งหมด</small><strong>{summary ? summary.models : '–'}</strong><span>รุ่นในแคตตาล็อก</span></article>
        <article><span className="catalog-metric-icon">▤</span><small>จำนวนรถรวม</small><strong>{summary ? summary.units.toLocaleString('th-TH') : '–'}</strong><span>คันที่พร้อมขาย</span></article>
        <article className={summary?.lowStock ? 'is-warning' : ''}><span className="catalog-metric-icon">!</span><small>สต็อกใกล้หมด</small><strong>{summary ? summary.lowStock : '–'}</strong><span>รุ่นที่เหลือไม่เกิน 2 คัน</span></article>
        <article className={summary?.outOfStock ? 'is-danger' : ''}><span className="catalog-metric-icon">×</span><small>หมดสต็อก</small><strong>{summary ? summary.outOfStock : '–'}</strong><span>รุ่นที่ต้องสั่งเพิ่มหรือสอบถาม</span></article>
      </div>

      <section className="catalog-admin-panel catalog-stock-panel">
        <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">INVENTORY OVERVIEW</p><h2>รายการจำนวนรถ</h2></div><span className="catalog-number-tag">{result.total} รุ่นที่แสดง</span></div>
        <div className="catalog-stock-filters">
          <label className="catalog-search-field"><span aria-hidden="true">⌕</span><span className="sr-only">ค้นหารุ่นรถ</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหายี่ห้อหรือรุ่นรถ..." /></label>
          <label><span className="sr-only">ประเภท</span><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">ทุกประเภทรถ</option>{Object.entries(CATEGORY_LABELS).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
          <label><span className="sr-only">สถานะสต็อก</span><select value={availability} onChange={(event) => { setAvailability(event.target.value); setPage(1); }}><option value="all">ทุกสถานะ</option><option value="available">พร้อมจำหน่าย (&gt; 2)</option><option value="low">เหลือน้อย (1–2)</option><option value="out">หมดสต็อก</option></select></label>
        </div>
        <div className="catalog-stock-table-wrap"><table className="catalog-stock-table"><thead><tr><th>รถยนต์</th><th>ราคาเริ่มต้น</th><th>สถานะ</th><th>จำนวนคงเหลือ</th><th>ปรับยอด</th></tr></thead><tbody>
          {result.items.map((car) => {
            const status = stockStatus(car.stock);
            const saving = savingId === car.id;
            return <tr key={car.id}><td><div className="catalog-stock-car"><CarPhoto car={car} className="catalog-stock-thumb" /><div><strong>{car.brand} {car.name}</strong><small>{CATEGORY_LABELS[car.type] || car.type} · {car.year}</small></div></div></td><td>{formatBaht(car.price)}</td><td><span className={`catalog-status-chip ${status.tone}`}><i />{status.label}</span></td><td><strong className="catalog-stock-count">{car.stock}</strong><span className="catalog-stock-unit">คัน</span></td><td><div className="catalog-stock-stepper"><button type="button" onClick={() => updateStock(car, car.stock - 1)} disabled={saving || car.stock <= 0} aria-label={`ลดสต็อก ${car.name}`}>−</button><input aria-label={`จำนวนสต็อก ${car.name}`} type="number" min="0" max={MAX_STOCK} disabled={saving} value={stockDrafts[car.id] ?? car.stock} onChange={(event) => setStockDrafts((current) => ({ ...current, [car.id]: event.target.value }))} onBlur={() => { if (Object.prototype.hasOwnProperty.call(stockDrafts, car.id)) { const draft = stockDrafts[car.id]; setStockDrafts((current) => { const next = { ...current }; delete next[car.id]; return next; }); if (Number(draft) !== car.stock) updateStock(car, draft); } }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><button type="button" onClick={() => updateStock(car, car.stock + 1)} disabled={saving || car.stock >= MAX_STOCK} aria-label={`เพิ่มสต็อก ${car.name}`}>＋</button></div></td></tr>;
          })}
        </tbody></table>
          {loading && !result.error && <div className="catalog-empty-inline">กำลังโหลดข้อมูลสต็อก...</div>}
          {!loading && !result.error && !result.items.length && <div className="catalog-empty-inline">ไม่พบรถที่ตรงกับตัวกรองนี้</div>}
        </div>
        {result.total > 0 && (
          <nav className="catalog-pagination" aria-label="เลือกหน้ารายการสต็อก">
            <p className="catalog-pagination-info">แสดง {pageStart + 1}–{pageStart + result.items.length} จาก {result.total} รุ่น</p>
            <div className="catalog-pagination-controls">
              <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>‹ ก่อนหน้า</button>
              {pageItems(currentPage, result.totalPages).map((item) => (typeof item === 'number'
                ? <button type="button" key={item} className={item === currentPage ? 'is-current' : ''} aria-current={item === currentPage ? 'page' : undefined} aria-label={`หน้า ${item}`} onClick={() => goToPage(item)}>{item}</button>
                : <span key={item} className="catalog-pagination-gap" aria-hidden="true">…</span>))}
              <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= result.totalPages}>ถัดไป ›</button>
            </div>
            <label className="catalog-pagination-size"><span>ต่อหน้า</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} รุ่น</option>)}</select></label>
          </nav>
        )}
      </section>
      <p className="catalog-demo-note">แนวทางพัฒนาต่อ: เพิ่มการตรวจสิทธิ์ผู้ปรับยอด เก็บประวัติการเคลื่อนไหวสต็อก และกรอกเลขตัวถัง (VIN) จริงแทนค่าชั่วคราวที่ระบบสร้างให้</p>
    </div>
  );
}
