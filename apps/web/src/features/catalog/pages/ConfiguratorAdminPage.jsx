import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  apiErrorMessage,
  createColorOption,
  createTrimRecord,
  createWheelOption,
  fetchCars,
  fetchOptions,
  fetchTrims,
  saveTrimColors,
  saveTrimWheels,
  updateColorOption,
  updateTrimRecord,
  updateWheelOption,
} from '../api/catalogApi.js';
import { FINISH_LABELS, TRIM_LABELS, formatBaht } from '../data/catalogData.js';
import { compressImageFile } from '../utils/compressImage.js';
import './catalog.css';
import './configurator-admin.css';

const TRIM_CODES = Object.keys(TRIM_LABELS);
const FINISHES = Object.keys(FINISH_LABELS);
const NEW_COLOR = { code: '', name: '', hex: '#888888', finish: 'METALLIC', priceExtra: '0' };
const NEW_WHEEL = { code: '', name: '', sizeInch: '18' };

function trimDraft(trim) {
  return {
    name: trim.name || '',
    tagline: trim.tagline || '',
    price: String(Number(trim.price)),
    engine: trim.engine || '',
    horsepower: trim.horsepower === null ? '' : String(trim.horsepower),
    fuelEconomyKml: trim.fuelEconomyKml === null ? '' : String(trim.fuelEconomyKml),
    transmission: trim.transmission || '',
    fuel: trim.fuel || '',
    partsLeadDays: String(trim.partsLeadDays ?? 14),
    features: (trim.features || []).join('\n'),
    active: trim.active,
  };
}

function trimBody(draft) {
  const number = (value) => (value === '' ? null : Number(value));
  return {
    name: draft.name.trim(),
    tagline: draft.tagline.trim(),
    price: Number(draft.price),
    engine: draft.engine.trim(),
    horsepower: number(draft.horsepower),
    fuelEconomyKml: number(draft.fuelEconomyKml),
    transmission: draft.transmission.trim(),
    fuel: draft.fuel.trim(),
    partsLeadDays: Number(draft.partsLeadDays),
    features: draft.features.split('\n').map((line) => line.trim()).filter(Boolean),
    active: draft.active,
  };
}

/** Which trims may use each colour / wheel, built from the trims as loaded. */
function buildMatrices(trims) {
  const colors = {};
  const wheels = {};
  const defaults = {};
  for (const trim of trims) {
    for (const color of trim.colors) {
      colors[color.id] ??= { trims: {}, imageUrl: '' };
      colors[color.id].trims[trim.id] = true;
      if (color.imageUrl && !colors[color.id].imageUrl) colors[color.id].imageUrl = color.imageUrl;
    }
    for (const wheel of trim.wheels) {
      wheels[wheel.id] ??= {};
      wheels[wheel.id][trim.id] = { on: true, price: String(Number(wheel.priceExtra)) };
    }
    defaults[trim.id] = trim.defaultWheelId || '';
  }
  return { colors, wheels, defaults };
}

export default function ConfiguratorAdminPage() {
  const [models, setModels] = useState({ list: [], error: '' });
  const [modelId, setModelId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState({ key: '', trims: [], options: { colors: [], wheels: [] }, error: '' });
  const [trimDrafts, setTrimDrafts] = useState({});
  const [matrix, setMatrix] = useState({ colors: {}, wheels: {}, defaults: {} });
  const [colorDrafts, setColorDrafts] = useState({});
  const [wheelDrafts, setWheelDrafts] = useState({});
  const [newColor, setNewColor] = useState(NEW_COLOR);
  const [newWheel, setNewWheel] = useState(NEW_WHEEL);
  const [newTrimCode, setNewTrimCode] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchCars(controller.signal).then(
      (cars) => setModels({ list: cars.filter((car) => car.configurable || car.brand === 'TOYOTY'), error: '' }),
      (error) => { if (!controller.signal.aborted) setModels({ list: [], error: apiErrorMessage(error) }); },
    );
    return () => controller.abort();
  }, []);

  const model = models.list.find((item) => item.id === modelId) || models.list[0];
  const loadKey = model ? `${model.id}:${reloadKey}` : '';

  useEffect(() => {
    if (!model) return undefined;
    const controller = new AbortController();
    Promise.all([fetchTrims(model.id, controller.signal), fetchOptions(controller.signal)]).then(
      ([trims, options]) => {
        setLoaded({ key: loadKey, trims, options, error: '' });
        setTrimDrafts(Object.fromEntries(trims.map((trim) => [trim.id, trimDraft(trim)])));
        setMatrix(buildMatrices(trims));
        setColorDrafts({});
        setWheelDrafts({});
      },
      (error) => { if (!controller.signal.aborted) setLoaded({ key: loadKey, trims: [], options: { colors: [], wheels: [] }, error: apiErrorMessage(error) }); },
    );
    return () => controller.abort();
  }, [model, loadKey]);

  const loading = Boolean(model) && loaded.key !== loadKey;
  const { trims, options } = loaded;
  const reload = () => setReloadKey((key) => key + 1);
  const missingCodes = TRIM_CODES.filter((code) => !trims.some((trim) => trim.code === code));

  async function run(action, success) {
    setBusy(true);
    try {
      await action();
      setNotice(success);
      reload();
    } catch (error) {
      setNotice(error instanceof Error && !error.isAxiosError ? error.message : apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const setTrimField = (id, field, value) => setTrimDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));

  function saveTrim(trim) {
    const body = trimBody(trimDrafts[trim.id]);
    if (!body.name || !Number.isFinite(body.price) || body.price <= 0) {
      setNotice('รุ่นย่อยต้องมีชื่อและราคามากกว่า 0');
      return;
    }
    run(() => updateTrimRecord(trim.id, body), `บันทึกรุ่นย่อย ${model.name} ${body.name} แล้ว`);
  }

  function addTrim() {
    const code = newTrimCode || missingCodes[0];
    const base = trims[trims.length - 1];
    run(() => createTrimRecord(model.id, {
      code,
      name: TRIM_LABELS[code],
      price: Number(base?.price) || Number(model.price) || 1,
      engine: base?.engine || '',
      partsLeadDays: base?.partsLeadDays ?? 14,
      active: false,
    }), `เพิ่มรุ่นย่อย ${TRIM_LABELS[code]} แล้ว (ปิดขายไว้ก่อน ตั้งราคา สี และล้อ แล้วค่อยเปิดขาย)`);
  }

  const toggleColor = (colorId, trimId) => setMatrix((current) => {
    const row = current.colors[colorId] || { trims: {}, imageUrl: '' };
    return { ...current, colors: { ...current.colors, [colorId]: { ...row, trims: { ...row.trims, [trimId]: !row.trims[trimId] } } } };
  });
  const setColorImage = (colorId, imageUrl) => setMatrix((current) => {
    const row = current.colors[colorId] || { trims: {}, imageUrl: '' };
    return { ...current, colors: { ...current.colors, [colorId]: { ...row, imageUrl } } };
  });
  const setWheelCell = (wheelId, trimId, patch) => setMatrix((current) => {
    const row = current.wheels[wheelId] || {};
    const cell = row[trimId] || { on: false, price: '0' };
    return { ...current, wheels: { ...current.wheels, [wheelId]: { ...row, [trimId]: { ...cell, ...patch } } } };
  });
  const setDefaultWheel = (trimId, wheelId) => setMatrix((current) => ({ ...current, defaults: { ...current.defaults, [trimId]: wheelId } }));

  async function uploadColorImage(colorId, event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setColorImage(colorId, await compressImageFile(file));
      setNotice('เตรียมรูปแล้ว กด "บันทึกสีและล้อ" เพื่อใช้จริง');
    } catch (error) {
      setNotice(error.message);
    }
  }

  function saveMatrix() {
    const plan = trims.map((trim) => {
      const colors = options.colors
        .filter((color) => matrix.colors[color.id]?.trims[trim.id])
        .map((color) => ({ colorId: color.id, imageUrl: matrix.colors[color.id].imageUrl || null }));
      const wheels = options.wheels
        .filter((wheel) => matrix.wheels[wheel.id]?.[trim.id]?.on)
        .map((wheel) => ({ wheelId: wheel.id, priceExtra: Number(matrix.wheels[wheel.id][trim.id].price) || 0 }));
      const chosenDefault = wheels.some((item) => item.wheelId === matrix.defaults[trim.id]) ? matrix.defaults[trim.id] : wheels[0]?.wheelId;
      return { trim, colors, wheels, defaultWheelId: chosenDefault };
    });
    const empty = plan.find((item) => item.trim.active && (!item.colors.length || !item.wheels.length));
    if (empty) {
      setNotice(`รุ่นย่อย ${empty.trim.name} ที่เปิดขายต้องมีอย่างน้อย 1 สีและ 1 ล้อ ไม่อย่างนั้นลูกค้าจะสั่งไม่ได้`);
      return;
    }
    run(async () => {
      for (const item of plan) {
        await saveTrimColors(item.trim.id, item.colors);
        await saveTrimWheels(item.trim.id, item.wheels, item.defaultWheelId);
      }
    }, `บันทึกสีและล้อของ ${model.name} แล้ว หน้าแต่งรถของลูกค้าเปลี่ยนตามทันที`);
  }

  const colorValue = (color, field) => colorDrafts[color.id]?.[field] ?? (field === 'priceExtra' ? String(Number(color.priceExtra)) : color[field]);
  const wheelValue = (wheel, field) => wheelDrafts[wheel.id]?.[field] ?? (field === 'sizeInch' ? String(wheel.sizeInch) : wheel[field]);
  const editColor = (id, patch) => setColorDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const editWheel = (id, patch) => setWheelDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  function saveColor(color) {
    const draft = colorDrafts[color.id] || {};
    const body = { ...draft };
    if (body.priceExtra !== undefined) body.priceExtra = Number(body.priceExtra) || 0;
    run(() => updateColorOption(color.id, body), `บันทึกสี ${body.name || color.name} แล้ว`);
  }

  function saveWheel(wheel) {
    const body = { ...(wheelDrafts[wheel.id] || {}) };
    if (body.sizeInch !== undefined) body.sizeInch = Number(body.sizeInch);
    run(() => updateWheelOption(wheel.id, body), `บันทึกล้อ ${body.name || wheel.name} แล้ว`);
  }

  function addColor(event) {
    event.preventDefault();
    run(async () => {
      await createColorOption({ ...newColor, code: newColor.code.trim(), name: newColor.name.trim(), priceExtra: Number(newColor.priceExtra) || 0 });
      setNewColor(NEW_COLOR);
    }, `เพิ่มสี ${newColor.name} แล้ว ติ๊กในตารางด้านบนเพื่อให้รุ่นย่อยเลือกได้`);
  }

  function addWheel(event) {
    event.preventDefault();
    run(async () => {
      await createWheelOption({ ...newWheel, code: newWheel.code.trim(), name: newWheel.name.trim(), sizeInch: Number(newWheel.sizeInch) });
      setNewWheel(NEW_WHEEL);
    }, `เพิ่มล้อ ${newWheel.name} แล้ว ติ๊กในตารางด้านบนเพื่อให้รุ่นย่อยเลือกได้`);
  }

  return (
    <div className="page-content catalog-admin-page cfa-page">
      <header className="catalog-admin-heading">
        <div><p className="catalog-eyebrow">CONFIGURATOR SETTINGS</p><h1>รุ่นย่อย สี และล้อ</h1><p>ตั้งราคาและสเปกของแต่ละรุ่นย่อย เลือกว่ารุ่นย่อยไหนมีสีและล้ออะไร — หน้าแต่งรถของลูกค้าเปลี่ยนตามทันทีหลังบันทึก</p></div>
        <div className="catalog-admin-nav"><Link to="/admin/cars">จัดการรถ</Link><Link className="is-active" to="/admin/cars/options">รุ่นย่อย / สี / ล้อ</Link><Link to="/admin/stock">สต็อกสินค้า</Link><Link to="/admin/stock/toyoty">สต็อก TOYOTY</Link><Link to="/admin/promotions">โปรโมชัน</Link><Link to="/catalog">ดูหน้าร้าน ↗</Link></div>
      </header>
      {notice && <div className="catalog-form-feedback" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความ">×</button></div>}
      {(models.error || loaded.error) && <div className="catalog-form-feedback" role="alert">{models.error || loaded.error}<button type="button" onClick={reload} aria-label="ลองโหลดใหม่">↻</button></div>}

      <nav className="cfa-models" aria-label="เลือกรุ่นรถ">
        {models.list.map((item) => (
          <button key={item.id} type="button" className={`cfa-model${item.id === model?.id ? ' is-active' : ''}`} aria-pressed={item.id === model?.id} onClick={() => setModelId(item.id)}>
            <strong>{item.name}</strong><small>เริ่มต้น {formatBaht(item.price)}</small>
          </button>
        ))}
        {model && <Link className="cfa-preview-link" to={`/catalog/${encodeURIComponent(model.id)}`}>ดูหน้าแต่งรถของลูกค้า ↗</Link>}
      </nav>
      {!models.list.length && !models.error && <p className="catalog-muted">กำลังโหลดรุ่นรถ...</p>}

      {model && (
        <section className="catalog-admin-panel">
          <div className="catalog-admin-panel-head">
            <div><p className="catalog-eyebrow">TRIMS</p><h2>รุ่นย่อยของ {model.brand} {model.name}</h2></div>
            {missingCodes.length > 0 && !loading && (
              <div className="cfa-inline">
                <select value={newTrimCode || missingCodes[0]} onChange={(event) => setNewTrimCode(event.target.value)} aria-label="รุ่นย่อยที่จะเพิ่ม">{missingCodes.map((code) => <option key={code} value={code}>{TRIM_LABELS[code]}</option>)}</select>
                <button type="button" className="cfa-btn" disabled={busy} onClick={addTrim}>＋ เพิ่มรุ่นย่อย</button>
              </div>
            )}
          </div>
          {loading && <p className="catalog-muted">กำลังโหลดรุ่นย่อย...</p>}
          {!loading && !trims.length && <p className="catalog-muted">รุ่นนี้ยังไม่มีรุ่นย่อย เพิ่มรุ่นย่อยแรกด้วยปุ่มด้านบน</p>}
          <div className="cfa-trims">
            {trims.map((trim) => {
              const draft = trimDrafts[trim.id];
              if (!draft) return null;
              const field = (name) => ({ value: draft[name], onChange: (event) => setTrimField(trim.id, name, event.target.value) });
              return (
                <form key={trim.id} className={`cfa-trim${draft.active ? '' : ' is-off'}`} onSubmit={(event) => { event.preventDefault(); saveTrim(trim); }}>
                  <div className="cfa-trim-head">
                    <span className="cfa-code">{trim.code}</span>
                    <label className="cfa-switch"><input type="checkbox" checked={draft.active} onChange={(event) => setTrimField(trim.id, 'active', event.target.checked)} /><span>{draft.active ? 'เปิดขาย' : 'ปิดขาย'}</span></label>
                  </div>
                  <div className="catalog-admin-form">
                    <label>ชื่อรุ่นย่อย<input {...field('name')} required /></label>
                    <label>ราคา (บาท)<input type="number" min="1" {...field('price')} required /></label>
                    <label className="catalog-form-wide">จุดขายสั้น ๆ<input {...field('tagline')} placeholder="เช่น ประหยัด ราคาเริ่มต้น" /></label>
                    <label className="catalog-form-wide">เครื่องยนต์<input {...field('engine')} /></label>
                    <label>กำลัง (แรงม้า)<input type="number" min="0" {...field('horsepower')} /></label>
                    <label>อัตราสิ้นเปลือง (กม./ลิตร)<input type="number" min="0" step="0.1" {...field('fuelEconomyKml')} /></label>
                    <label>ระบบส่งกำลัง<input {...field('transmission')} /></label>
                    <label>พลังงาน<input {...field('fuel')} /></label>
                    <label>รอชิ้นส่วน (วัน)<input type="number" min="0" max="365" {...field('partsLeadDays')} /></label>
                    <label className="catalog-form-wide">อุปกรณ์เด่น (บรรทัดละ 1 รายการ)<textarea rows="4" {...field('features')} /></label>
                    <button className="catalog-primary-button catalog-form-wide" type="submit" disabled={busy}>บันทึก {draft.name || trim.code}</button>
                  </div>
                </form>
              );
            })}
          </div>
        </section>
      )}

      {model && trims.length > 0 && (
        <section className="catalog-admin-panel">
          <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">PAINT & WHEELS</p><h2>สีและล้อที่ {model.name} แต่ละรุ่นย่อยเลือกได้</h2></div><button type="button" className="catalog-primary-button" disabled={busy || loading} onClick={saveMatrix}>บันทึกสีและล้อ</button></div>

          <div className="cfa-table-wrap">
            <table className="cfa-matrix">
              <thead><tr><th>สี</th>{trims.map((trim) => <th key={trim.id}>{trim.name}{trim.active ? '' : ' (ปิดขาย)'}</th>)}<th>รูปรถสีนี้ (ใช้กับทุกรุ่นย่อยที่ติ๊ก)</th></tr></thead>
              <tbody>
                {options.colors.map((color) => {
                  const row = matrix.colors[color.id] || { trims: {}, imageUrl: '' };
                  return (
                    <tr key={color.id} className={color.active ? '' : 'is-off'}>
                      <th scope="row"><span className="cfa-swatch" style={{ '--swatch': color.hex }} />{color.name}<small>{FINISH_LABELS[color.finish]} · {Number(color.priceExtra) > 0 ? `+${formatBaht(color.priceExtra)}` : 'ฟรี'}{color.active ? '' : ' · ปิดใช้'}</small></th>
                      {trims.map((trim) => <td key={trim.id}><input type="checkbox" checked={Boolean(row.trims[trim.id])} onChange={() => toggleColor(color.id, trim.id)} aria-label={`${trim.name} เลือกสี${color.name}ได้`} /></td>)}
                      <td>
                        <div className="cfa-image">
                          {row.imageUrl ? <img src={row.imageUrl} alt={`${model.name} สี${color.name}`} /> : <span className="catalog-muted">ใช้รูปหลักของรุ่น</span>}
                          <label className="cfa-btn">อัปโหลด<input type="file" accept="image/*" onChange={(event) => uploadColorImage(color.id, event)} /></label>
                          <input type="url" placeholder="หรือวาง URL" value={row.imageUrl.startsWith('data:') ? '' : row.imageUrl} onChange={(event) => setColorImage(color.id, event.target.value)} aria-label={`URL รูปสี${color.name}`} />
                          {row.imageUrl && <button type="button" className="cfa-btn" onClick={() => setColorImage(color.id, '')}>ลบรูป</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="cfa-table-wrap">
            <table className="cfa-matrix">
              <thead><tr><th>ล้อ</th>{trims.map((trim) => <th key={trim.id}>{trim.name}<small>ติ๊ก = เลือกได้ · ราคาเพิ่ม · ● = มาตรฐาน</small></th>)}</tr></thead>
              <tbody>
                {options.wheels.map((wheel) => (
                  <tr key={wheel.id} className={wheel.active ? '' : 'is-off'}>
                    <th scope="row"><b className="cfa-size">{wheel.sizeInch}"</b>{wheel.name.replace(/^\d+"\s*/, '')}{!wheel.active && <small>ปิดใช้</small>}</th>
                    {trims.map((trim) => {
                      const cell = matrix.wheels[wheel.id]?.[trim.id] || { on: false, price: '0' };
                      return (
                        <td key={trim.id}>
                          <div className="cfa-wheel-cell">
                            <input type="checkbox" checked={cell.on} onChange={(event) => setWheelCell(wheel.id, trim.id, { on: event.target.checked })} aria-label={`${trim.name} เลือกล้อ ${wheel.name} ได้`} />
                            <input type="number" min="0" step="1000" value={cell.price} disabled={!cell.on} onChange={(event) => setWheelCell(wheel.id, trim.id, { price: event.target.value })} aria-label={`ราคาเพิ่มล้อ ${wheel.name} ใน ${trim.name}`} />
                            <input type="radio" name={`default-${trim.id}`} checked={matrix.defaults[trim.id] === wheel.id} disabled={!cell.on} onChange={() => setDefaultWheel(trim.id, wheel.id)} aria-label={`ล้อมาตรฐานของ ${trim.name}`} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="catalog-form-help">ล้อเดียวกันตั้งราคาต่างกันได้ตามรุ่นย่อย เช่น 18" ฟรีใน High Performance แต่ +฿25,000 ใน Balanced ถ้าไม่ได้เลือกล้อมาตรฐาน ระบบใช้ล้อแรกที่ติ๊ก</p>
        </section>
      )}

      <div className="cfa-options">
        <section className="catalog-admin-panel">
          <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">PAINT LIST</p><h2>สีทั้งหมด</h2></div><span className="catalog-number-tag">{options.colors.length} สี</span></div>
          <div className="cfa-table-wrap">
            <table className="cfa-list">
              <thead><tr><th>สี</th><th>ชื่อ</th><th>ประเภท</th><th>บวกเพิ่ม (บาท)</th><th>ใช้</th><th /></tr></thead>
              <tbody>
                {options.colors.map((color) => (
                  <tr key={color.id}>
                    <td><input type="color" value={colorValue(color, 'hex')} onChange={(event) => editColor(color.id, { hex: event.target.value })} aria-label={`สีของ ${color.name}`} /><code>{color.code}</code></td>
                    <td><input value={colorValue(color, 'name')} onChange={(event) => editColor(color.id, { name: event.target.value })} aria-label="ชื่อสี" /></td>
                    <td><select value={colorValue(color, 'finish')} onChange={(event) => editColor(color.id, { finish: event.target.value })} aria-label="ประเภทสี">{FINISHES.map((finish) => <option key={finish} value={finish}>{FINISH_LABELS[finish]}</option>)}</select></td>
                    <td><input type="number" min="0" step="1000" value={colorValue(color, 'priceExtra')} onChange={(event) => editColor(color.id, { priceExtra: event.target.value })} aria-label="ราคาบวกเพิ่ม" /></td>
                    <td><input type="checkbox" checked={colorValue(color, 'active')} onChange={(event) => editColor(color.id, { active: event.target.checked })} aria-label={`เปิดใช้สี ${color.name}`} /></td>
                    <td><button type="button" className="cfa-btn" disabled={busy || !colorDrafts[color.id]} onClick={() => saveColor(color)}>บันทึก</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="cfa-add" onSubmit={addColor}>
            <input type="color" value={newColor.hex} onChange={(event) => setNewColor({ ...newColor, hex: event.target.value })} aria-label="สีใหม่" />
            <input required pattern="[a-z0-9][a-z0-9\-]*" maxLength={40} placeholder="รหัส เช่น matte-gray" value={newColor.code} onChange={(event) => setNewColor({ ...newColor, code: event.target.value.toLowerCase() })} aria-label="รหัสสีใหม่" />
            <input required maxLength={50} placeholder="ชื่อสี เช่น เทาด้าน" value={newColor.name} onChange={(event) => setNewColor({ ...newColor, name: event.target.value })} aria-label="ชื่อสีใหม่" />
            <select value={newColor.finish} onChange={(event) => setNewColor({ ...newColor, finish: event.target.value })} aria-label="ประเภทสีใหม่">{FINISHES.map((finish) => <option key={finish} value={finish}>{FINISH_LABELS[finish]}</option>)}</select>
            <input type="number" min="0" step="1000" value={newColor.priceExtra} onChange={(event) => setNewColor({ ...newColor, priceExtra: event.target.value })} aria-label="ราคาบวกเพิ่มของสีใหม่" />
            <button type="submit" className="cfa-btn" disabled={busy}>＋ เพิ่มสี</button>
          </form>
        </section>

        <section className="catalog-admin-panel">
          <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">WHEEL LIST</p><h2>ล้อทั้งหมด</h2></div><span className="catalog-number-tag">{options.wheels.length} แบบ</span></div>
          <div className="cfa-table-wrap">
            <table className="cfa-list">
              <thead><tr><th>รหัส</th><th>ชื่อ</th><th>นิ้ว</th><th>ใช้</th><th /></tr></thead>
              <tbody>
                {options.wheels.map((wheel) => (
                  <tr key={wheel.id}>
                    <td><code>{wheel.code}</code></td>
                    <td><input value={wheelValue(wheel, 'name')} onChange={(event) => editWheel(wheel.id, { name: event.target.value })} aria-label="ชื่อล้อ" /></td>
                    <td><input type="number" min="12" max="24" value={wheelValue(wheel, 'sizeInch')} onChange={(event) => editWheel(wheel.id, { sizeInch: event.target.value })} aria-label="ขนาดล้อ" /></td>
                    <td><input type="checkbox" checked={wheelValue(wheel, 'active')} onChange={(event) => editWheel(wheel.id, { active: event.target.checked })} aria-label={`เปิดใช้ล้อ ${wheel.name}`} /></td>
                    <td><button type="button" className="cfa-btn" disabled={busy || !wheelDrafts[wheel.id]} onClick={() => saveWheel(wheel)}>บันทึก</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="cfa-add" onSubmit={addWheel}>
            <input required pattern="[a-z0-9][a-z0-9\-]*" maxLength={40} placeholder="รหัส เช่น w20-carbon" value={newWheel.code} onChange={(event) => setNewWheel({ ...newWheel, code: event.target.value.toLowerCase() })} aria-label="รหัสล้อใหม่" />
            <input required maxLength={80} placeholder={'ชื่อ เช่น 20" คาร์บอน'} value={newWheel.name} onChange={(event) => setNewWheel({ ...newWheel, name: event.target.value })} aria-label="ชื่อล้อใหม่" />
            <input type="number" min="12" max="24" value={newWheel.sizeInch} onChange={(event) => setNewWheel({ ...newWheel, sizeInch: event.target.value })} aria-label="ขนาดล้อใหม่ (นิ้ว)" />
            <button type="submit" className="cfa-btn" disabled={busy}>＋ เพิ่มล้อ</button>
          </form>
          <p className="catalog-form-help">ราคาล้อตั้งต่อรุ่นย่อยในตารางด้านบน ปิดใช้ (เอาติ๊ก "ใช้" ออก) แล้วลูกค้าจะไม่เห็นตัวเลือกนั้น รถที่สั่งไปแล้วไม่เปลี่ยน</p>
        </section>
      </div>
    </div>
  );
}
