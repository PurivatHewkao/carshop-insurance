import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CarPhoto from '../components/CarPhoto.jsx';
import {
  apiErrorMessage,
  fetchInventory,
  fetchUnits,
  releaseUnit,
  saveQueueCapacity,
  saveUnitProduction,
} from '../api/catalogApi.js';
import {
  PRODUCTION_STEPS,
  TRIM_LABELS,
  formatBaht,
  formatDateRange,
  formatThaiDate,
  productionLabel,
} from '../data/catalogData.js';
import './catalog.css';
import './toyoty-stock.css';

const PAGE_SIZE = 10;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const STATES = [
  { value: 'open', label: 'กำลังดำเนินการ' },
  { value: 'delayed', label: 'ล่าช้า' },
  { value: 'cancelled', label: 'ยกเลิกแล้ว' },
  { value: 'all', label: 'ทั้งหมด' },
];

function nextStep(code) {
  const index = PRODUCTION_STEPS.findIndex((step) => step.code === code);
  return PRODUCTION_STEPS[index + 1] ?? null;
}

function addDays(day, days) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The next `count` Mondays from the week of `from`, for the reschedule list. */
function mondaysFrom(from, count) {
  const weekday = new Date(from + 'T00:00:00Z').getUTCDay();
  const first = addDays(from, -((weekday + 6) % 7));
  return Array.from({ length: count }, (_, index) => addDays(first, index * 7));
}

function StepDots({ code, cancelled }) {
  const current = PRODUCTION_STEPS.findIndex((step) => step.code === code);
  return (
    <span className={`tys-steps${cancelled ? ' is-cancelled' : ''}`} aria-hidden="true">
      {PRODUCTION_STEPS.map((step, index) => <i key={step.code} className={index <= current ? 'is-done' : ''} />)}
    </span>
  );
}

/** One made-to-order car with its next production action. */
function UnitRow({ unit, asOf, busy, onAdvance, onReschedule, onRelease }) {
  const [vin, setVin] = useState('');
  const [confirmRelease, setConfirmRelease] = useState(false);
  const cancelled = unit.status === 'INACTIVE';
  const next = cancelled ? null : nextStep(unit.productionStatus);
  const needsVin = next?.code === 'IN_PRODUCTION';
  const vinOk = !vin || VIN_PATTERN.test(vin.toUpperCase());
  const canMoveWeek = !cancelled && ['SCHEDULED', 'IN_PRODUCTION'].includes(unit.productionStatus);
  const canRelease = !cancelled && ['QUOTED', 'SCHEDULED'].includes(unit.productionStatus);
  const weeks = canMoveWeek ? mondaysFrom(asOf, 16) : [];
  if (canMoveWeek && unit.buildWeek && !weeks.includes(unit.buildWeek)) weeks.unshift(unit.buildWeek);

  return (
    <tr className={cancelled ? 'is-cancelled' : ''}>
      <td>
        <div className="tys-unit-car">
          <i className="tys-swatch" style={{ '--swatch': unit.colorHex || '#ccc' }} aria-hidden="true" />
          <div><strong>{unit.model} {unit.trimName}</strong><small>{unit.color} · ล้อ {unit.wheelSizeInch}"</small></div>
        </div>
      </td>
      <td><code className="tys-vin">{unit.vin}</code></td>
      <td className="tys-num">{formatBaht(unit.price)}</td>
      <td>
        <div className="tys-status">
          <span className={`tys-chip step-${(cancelled ? 'cancelled' : unit.productionStatus).toLowerCase()}`}>{cancelled ? 'ยกเลิก' : productionLabel(unit.productionStatus)}</span>
          <StepDots code={unit.productionStatus} cancelled={cancelled} />
        </div>
      </td>
      <td>
        <div className="tys-eta">
          <span>{unit.productionStatus === 'DELIVERED' ? 'ส่งมอบแล้ว' : unit.readyDate ? `ถึงศูนย์ ${formatThaiDate(unit.readyDate)}` : formatDateRange(unit.estimatedReady)}</span>
          {unit.buildWeek && <small>สัปดาห์ผลิต {formatThaiDate(unit.buildWeek, { year: false })}</small>}
          {unit.delayed && <b className="tys-late">{unit.delayDays > 0 ? `เลื่อน ${unit.delayDays} วัน` : 'เลยกำหนด'}{unit.canCancelForDelay ? ' · ลูกค้ายกเลิกได้' : ''}</b>}
        </div>
      </td>
      <td>{unit.orderId ? <span className="tys-order" title={unit.orderId}>{unit.orderStatus}</span> : <span className="tys-muted" title="ยังไม่มีคำสั่งซื้อที่ใช้รถคันนี้">—</span>}</td>
      <td>
        <div className="tys-actions">
          {next && (
            <>
              {needsVin && <input aria-label={`VIN จริงของ ${unit.model}`} className={`tys-vin-input${vinOk ? '' : ' is-invalid'}`} value={vin} onChange={(event) => setVin(event.target.value.toUpperCase())} placeholder="VIN จริง 17 หลัก (ไม่บังคับ)" maxLength={17} />}
              <button type="button" className="tys-btn primary" disabled={busy || !vinOk} onClick={() => onAdvance(unit, next.code, needsVin && vin ? vin : undefined)} title={next.hint}>→ {next.label}</button>
            </>
          )}
          {canMoveWeek && (
            <label className="tys-week">
              <span className="sr-only">เลื่อนสัปดาห์ผลิต</span>
              <select value={unit.buildWeek || ''} disabled={busy} onChange={(event) => onReschedule(unit, event.target.value)}>
                {weeks.map((week) => <option key={week} value={week}>ผลิต {formatThaiDate(week, { year: false })}</option>)}
              </select>
            </label>
          )}
          {canRelease && (confirmRelease
            ? <><button type="button" className="tys-btn danger" disabled={busy} onClick={() => onRelease(unit)}>ยืนยันยกเลิก</button><button type="button" className="tys-btn" onClick={() => setConfirmRelease(false)}>ไม่</button></>
            : <button type="button" className="tys-btn" disabled={busy} onClick={() => setConfirmRelease(true)}>ยกเลิก</button>)}
          {!next && !canRelease && <span className="tys-muted">—</span>}
        </div>
      </td>
    </tr>
  );
}

export default function ToyotyStockPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [inventory, setInventory] = useState({ key: -1, data: null, error: '' });
  const [filters, setFilters] = useState({ model: '', trim: '', productionStatus: '', state: 'open', q: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [units, setUnits] = useState({ key: '', items: [], total: 0, totalPages: 1, error: '' });
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [capacityDrafts, setCapacityDrafts] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.q === search.trim() ? current : { ...current, q: search.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    fetchInventory(controller.signal).then(
      (data) => setInventory({ key: reloadKey, data, error: '' }),
      (error) => { if (!controller.signal.aborted) setInventory({ key: reloadKey, data: null, error: apiErrorMessage(error) }); },
    );
    return () => controller.abort();
  }, [reloadKey]);

  const unitsKey = JSON.stringify([filters, page, reloadKey]);
  useEffect(() => {
    const controller = new AbortController();
    const params = { page, pageSize: PAGE_SIZE, state: filters.state };
    for (const key of ['model', 'trim', 'productionStatus', 'q']) if (filters[key]) params[key] = filters[key];
    fetchUnits(params, controller.signal).then(
      (body) => setUnits({ key: unitsKey, items: body.data, total: body.meta.total, totalPages: body.meta.totalPages, error: '' }),
      (error) => { if (!controller.signal.aborted) setUnits({ key: unitsKey, items: [], total: 0, totalPages: 1, error: apiErrorMessage(error) }); },
    );
    return () => controller.abort();
  }, [unitsKey, filters, page]);

  const reload = () => setReloadKey((key) => key + 1);
  const data = inventory.data;
  const totals = data?.totals;
  const asOf = data?.asOf || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  const trimCodes = Object.keys(TRIM_LABELS);
  const unitsLoading = units.key !== unitsKey;

  function setFilter(patch) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  async function run(unit, action, success) {
    setBusyId(unit.id);
    try {
      await action();
      setNotice(success);
      reload();
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setBusyId('');
    }
  }

  const advance = (unit, status, vin) => run(unit, () => saveUnitProduction(unit.id, vin ? { status, vin } : { status }), `${unit.model} ${unit.trimName} (${unit.vin.slice(-6)}) → ${productionLabel(status)}`);
  const reschedule = (unit, buildWeek) => run(unit, () => saveUnitProduction(unit.id, { buildWeek }), `เลื่อนคิวผลิต ${unit.model} ${unit.trimName} ไปสัปดาห์ ${formatThaiDate(buildWeek)}`);
  const release = (unit) => run(unit, () => releaseUnit(unit.id), `ยกเลิกรถสั่งผลิต ${unit.model} ${unit.trimName} แล้ว (ไม่กลับเข้าสต็อก)`);

  async function saveCapacity(model) {
    const capacity = Math.trunc(Number(capacityDrafts[model.id]));
    if (!Number.isInteger(capacity) || capacity < 0 || capacity > 500) {
      setNotice('กำลังผลิตต่อสัปดาห์ต้องเป็นจำนวนเต็ม 0–500');
      return;
    }
    setBusyId(model.id);
    try {
      await saveQueueCapacity(model.id, { capacity });
      setCapacityDrafts((current) => { const next = { ...current }; delete next[model.id]; return next; });
      setNotice(`ตั้งกำลังผลิต ${model.name} เป็น ${capacity} คัน/สัปดาห์ (ใช้กับสัปดาห์ที่ยังไม่ได้ตั้งแยก)`);
      reload();
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="page-content catalog-admin-page catalog-stock-page tys-page">
      <header className="catalog-admin-heading">
        <div><p className="catalog-eyebrow">MADE-TO-ORDER INVENTORY</p><h1>สต็อกรถ TOYOTY</h1><p>รถรุ่นใหม่แยกตามรุ่นและรุ่นย่อย: รถโชว์ คันที่สั่งผลิต คิวผลิตรายสัปดาห์ และเลื่อนขั้นการผลิต</p></div>
        <div className="catalog-admin-nav"><Link to="/admin/cars">จัดการรถ</Link><Link to="/admin/cars/options">รุ่นย่อย / สี / ล้อ</Link><Link to="/admin/stock">สต็อกสินค้า</Link><Link className="is-active" to="/admin/stock/toyoty">สต็อก TOYOTY</Link><Link to="/admin/promotions">โปรโมชัน</Link><Link to="/catalog">ดูหน้าร้าน ↗</Link></div>
      </header>
      {notice && <div className="catalog-form-feedback" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความ">×</button></div>}
      {inventory.error && <div className="catalog-form-feedback" role="alert">{inventory.error}<button type="button" onClick={reload} aria-label="ลองโหลดใหม่">↻</button></div>}

      <div className="catalog-stock-metrics tys-metrics">
        <article><span className="catalog-metric-icon">▦</span><small>รุ่น × รุ่นย่อย</small><strong>{totals ? `${totals.models} × ${totals.models ? Math.round(totals.trims / totals.models) : 0}` : '–'}</strong><span>{totals ? `${totals.trims} รุ่นย่อยที่ขายอยู่` : 'กำลังโหลด'}</span></article>
        <article><span className="catalog-metric-icon">◎</span><small>รถโชว์ / ทดลองขับ</small><strong>{totals ? totals.showroom : '–'}</strong><span>คันที่พร้อมให้ลูกค้าดู</span></article>
        <article><span className="catalog-metric-icon">⚙</span><small>กำลังสั่งผลิต</small><strong>{totals ? totals.open : '–'}</strong><span>{totals ? `ถึงศูนย์แล้ว ${totals.production.READY} คัน` : 'คันที่ยังไม่ส่งมอบ'}</span></article>
        <article className={totals?.delayed ? 'is-warning' : ''}><span className="catalog-metric-icon">!</span><small>ล่าช้า</small><strong>{totals ? totals.delayed : '–'}</strong><span>{totals ? `ส่งมอบแล้ว ${totals.production.DELIVERED} · ยกเลิก ${totals.cancelled}` : 'เลื่อนหรือเลยวันคาดการณ์'}</span></article>
      </div>

      <section className="catalog-admin-panel">
        <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">MODEL × TRIM</p><h2>สต็อกตามรุ่นย่อย</h2></div><span className="catalog-number-tag">ณ {formatThaiDate(asOf)}</span></div>
        <div className="tys-table-wrap">
          <table className="tys-matrix">
            <thead><tr><th>รุ่น</th>{trimCodes.map((code) => <th key={code}>{TRIM_LABELS[code]}</th>)}<th>รวม</th></tr></thead>
            <tbody>
              {(data?.models ?? []).map((model) => (
                <tr key={model.id}>
                  <th scope="row"><div className="catalog-stock-car"><CarPhoto car={model} className="catalog-stock-thumb" /><div><strong>{model.brand} {model.name}</strong><small>{model.configurable ? 'สั่งผลิต' : `สต็อก ${model.inStock} คัน`}</small></div></div></th>
                  {trimCodes.map((code) => {
                    const trim = model.trims.find((item) => item.code === code);
                    if (!trim) return <td key={code} className="tys-muted">—</td>;
                    const active = filters.model === model.id && filters.trim === code;
                    return (
                      <td key={code}>
                        <button type="button" className={`tys-cell${active ? ' is-active' : ''}`} onClick={() => setFilter(active ? { model: '', trim: '' } : { model: model.id, trim: code, state: 'open' })} aria-pressed={active} title="ดูรายการรถคันที่สั่งผลิตในรุ่นย่อยนี้">
                          <b>{trim.open}</b><span>สั่งผลิต</span>
                          <small>โชว์ {trim.showroom} · ถึงศูนย์ {trim.production.READY} · ส่งมอบ {trim.production.DELIVERED}{trim.delayed ? ` · ล่าช้า ${trim.delayed}` : ''}</small>
                          <em>{formatBaht(trim.price)}</em>
                        </button>
                      </td>
                    );
                  })}
                  <td><div className="tys-total"><b>{model.open}</b><small>โชว์ {model.showroom} · ส่งมอบ {model.production.DELIVERED}</small></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data && !inventory.error && <div className="catalog-empty-inline">กำลังโหลดสต็อก...</div>}
          {data && !data.models.length && <div className="catalog-empty-inline">ยังไม่มีรุ่นที่เปิดขาย รัน 07_toyoty_configurator.sql และ 08_seed_toyoty.sql ก่อน</div>}
        </div>
        {data && <p className="tys-legend">{PRODUCTION_STEPS.map((step) => <span key={step.code}><b>{step.label}</b> {totals.production[step.code]}</span>)}</p>}
      </section>

      <section className="catalog-admin-panel">
        <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">PRODUCTION QUEUE</p><h2>คิวผลิต 8 สัปดาห์</h2></div><span className="catalog-number-tag">จองแล้ว / กำลังผลิตต่อสัปดาห์</span></div>
        <div className="tys-queue">
          {(data?.models ?? []).filter((model) => model.configurable).map((model) => (
            <div className="tys-queue-row" key={model.id}>
              <div className="tys-queue-name">
                <strong>{model.name}</strong>
                <label><span>คัน/สัปดาห์</span><input type="number" min="0" max="500" value={capacityDrafts[model.id] ?? model.weeklyCapacity} onChange={(event) => setCapacityDrafts((current) => ({ ...current, [model.id]: event.target.value }))} aria-label={`กำลังผลิตต่อสัปดาห์ของ ${model.name}`} /></label>
                {capacityDrafts[model.id] !== undefined && Number(capacityDrafts[model.id]) !== model.weeklyCapacity && <button type="button" className="tys-btn primary" disabled={busyId === model.id} onClick={() => saveCapacity(model)}>บันทึก</button>}
              </div>
              <ol className="tys-weeks">
                {model.queue.map((week) => {
                  const ratio = week.capacity ? Math.min(1, week.booked / week.capacity) : 1;
                  const full = week.booked >= week.capacity;
                  return (
                    <li key={week.weekStart} className={full ? 'is-full' : ''} title={`สัปดาห์ ${formatThaiDate(week.weekStart)}: จอง ${week.booked} จาก ${week.capacity} คัน`}>
                      <span className="tys-bar"><i style={{ '--fill': `${Math.round(ratio * 100)}%` }} /></span>
                      <b>{week.booked}/{week.capacity}</b>
                      <small>{formatThaiDate(week.weekStart, { year: false })}</small>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="catalog-admin-panel catalog-stock-panel">
        <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">ORDERED CARS</p><h2>รถสั่งผลิตรายคัน</h2></div><span className="catalog-number-tag">{units.total} คัน</span></div>
        <div className="catalog-stock-filters">
          <label className="catalog-search-field"><span aria-hidden="true">⌕</span><span className="sr-only">ค้นหา VIN หรือเลขคำสั่งซื้อ</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหา VIN หรือเลขคำสั่งซื้อ..." /></label>
          <label><span className="sr-only">รุ่น</span><select value={filters.model} onChange={(event) => setFilter({ model: event.target.value })}><option value="">ทุกรุ่น</option>{(data?.models ?? []).map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
          <label><span className="sr-only">รุ่นย่อย</span><select value={filters.trim} onChange={(event) => setFilter({ trim: event.target.value })}><option value="">ทุกรุ่นย่อย</option>{trimCodes.map((code) => <option key={code} value={code}>{TRIM_LABELS[code]}</option>)}</select></label>
          <label><span className="sr-only">ขั้นการผลิต</span><select value={filters.productionStatus} onChange={(event) => setFilter({ productionStatus: event.target.value })}><option value="">ทุกขั้นการผลิต</option>{PRODUCTION_STEPS.map((step) => <option key={step.code} value={step.code}>{step.label}</option>)}</select></label>
          <label><span className="sr-only">สถานะ</span><select value={filters.state} onChange={(event) => setFilter({ state: event.target.value })}>{STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select></label>
        </div>
        {units.error && <div className="catalog-form-feedback" role="alert">{units.error}<button type="button" onClick={reload} aria-label="ลองโหลดใหม่">↻</button></div>}
        <div className="tys-table-wrap">
          <table className="catalog-stock-table tys-units">
            <thead><tr><th>รถ</th><th>VIN</th><th>ราคา</th><th>ขั้นการผลิต</th><th>วันรับรถ</th><th>คำสั่งซื้อ</th><th>จัดการ</th></tr></thead>
            <tbody>
              {units.items.map((unit) => <UnitRow key={`${unit.id}-${unit.updatedAt}`} unit={unit} asOf={asOf} busy={busyId === unit.id} onAdvance={advance} onReschedule={reschedule} onRelease={release} />)}
            </tbody>
          </table>
          {unitsLoading && !units.error && <div className="catalog-empty-inline">กำลังโหลดรายการรถ...</div>}
          {!unitsLoading && !units.error && !units.items.length && <div className="catalog-empty-inline">ยังไม่มีรถสั่งผลิตที่ตรงกับตัวกรองนี้ — รถจะเข้ามาเมื่อ Sales สร้างคำสั่งซื้อจากหน้าแต่งรถ</div>}
        </div>
        {units.totalPages > 1 && (
          <nav className="catalog-pagination" aria-label="เลือกหน้ารายการรถสั่งผลิต">
            <p className="catalog-pagination-info">หน้า {page} จาก {units.totalPages}</p>
            <div className="catalog-pagination-controls">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>‹ ก่อนหน้า</button>
              <button type="button" onClick={() => setPage((current) => Math.min(units.totalPages, current + 1))} disabled={page >= units.totalPages}>ถัดไป ›</button>
            </div>
          </nav>
        )}
      </section>
      <p className="catalog-demo-note">ลำดับขั้น: รอยืนยัน → จองคิวผลิต (ระบบหาสัปดาห์ว่างหลังชิ้นส่วนครบ) → กำลังผลิต (ใส่ VIN จริง) → กำลังขนส่ง → ถึงศูนย์ → ส่งมอบ ถ้าเลื่อนคิวเกิน 30 วันจากวันที่แจ้งลูกค้าครั้งแรก ลูกค้ายกเลิกและรับเงินจองคืนได้</p>
    </div>
  );
}
