import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CarPhoto from '../components/CarPhoto.jsx';
import {
  CATEGORY_LABELS,
  formatBaht,
  stockStatus,
} from '../data/catalogData.js';
import { apiErrorMessage, createCarRecord, removeCarRecord, saveCarPhotos, useCars } from '../api/catalogApi.js';
import './catalog.css';

const MAX_PHOTOS_PER_CAR = 6;

const emptyForm = {
  brand: '', name: '', type: 'sedan', price: '', year: '2025', stock: '1',
  fuel: 'เบนซิน', engine: '', horsepower: '', seats: '5', imageUrl: '', variant: 'รุ่นมาตรฐาน',
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`อ่านไฟล์ ${file.name} ไม่สำเร็จ`));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ'));
    image.src = source;
  });
}

// Convert uploaded photos to smaller JPEGs before storing them in LocalStorage.
// This avoids storing huge, full-resolution camera photos in the frontend demo.
async function compressImageFile(file) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxWidth = 1280;
  const maxHeight = 1000;
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('เบราว์เซอร์ไม่สามารถจัดการรูปภาพนี้ได้');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.76;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 280_000 && quality > 0.5) {
    quality -= 0.06;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return { name: file.name, dataUrl };
}

function getCarPhotos(car) {
  return [car?.imageUrl, ...(car?.gallery || [])].filter(Boolean);
}

export default function CatalogAdminPage() {
  const { cars, loading, error: loadError, reload } = useCars({ gallery: true });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadingCarId, setUploadingCarId] = useState('');

  const visibleCars = useMemo(() => cars.filter((car) => `${car.brand} ${car.name}`.toLowerCase().includes(query.trim().toLowerCase())), [cars, query]);
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function handlePhotoFiles(event) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []).filter((file) => file.type.startsWith('image/'));
    input.value = '';
    if (!files.length) return;

    const slots = MAX_PHOTOS_PER_CAR - selectedPhotos.length;
    if (slots <= 0) {
      setNotice(`เลือกรูปได้ไม่เกิน ${MAX_PHOTOS_PER_CAR} รูปต่อรถหนึ่งคัน`);
      return;
    }
    const chosenFiles = files.slice(0, slots);
    setNotice('กำลังเตรียมรูปภาพและลดขนาดไฟล์...');
    try {
      const processed = await Promise.all(chosenFiles.map(compressImageFile));
      setSelectedPhotos((current) => [...current, ...processed].slice(0, MAX_PHOTOS_PER_CAR));
      setNotice(`เตรียมรูปภาพ ${processed.length} รูปแล้ว สามารถลบรูปที่ไม่ต้องการก่อนบันทึกได้`);
      if (files.length > slots) setNotice(`เพิ่มได้ ${slots} รูปตามขีดจำกัดต่อรถหนึ่งคัน รูปที่เลือกเกินมาถูกข้ามแล้ว`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'อ่านรูปภาพไม่สำเร็จ กรุณาลองใหม่');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const brand = form.brand.trim();
    const name = form.name.trim();
    const price = Number(form.price);
    if (!brand || !name || !Number.isFinite(price) || price <= 0) {
      setNotice('กรุณากรอกยี่ห้อ รุ่น และราคาที่มากกว่า 0 ให้ครบถ้วน');
      return;
    }
    if (cars.some((car) => `${car.brand} ${car.name}`.toLowerCase() === `${brand} ${name}`.toLowerCase())) {
      setNotice('มีรุ่นรถนี้อยู่ในรายการแล้ว');
      return;
    }

    const externalImage = form.imageUrl.trim();
    const allPhotos = [...selectedPhotos.map((photo) => photo.dataUrl), ...(externalImage ? [externalImage] : [])]
      .filter((url, index, all) => Boolean(url) && all.indexOf(url) === index)
      .slice(0, MAX_PHOTOS_PER_CAR);
    setBusy(true);
    try {
      await createCarRecord({
        brand,
        name,
        type: form.type,
        price,
        year: Number(form.year) || 2025,
        stock: Math.max(0, Number(form.stock) || 0),
        fuel: form.fuel,
        variant: form.variant.trim() || 'รุ่นมาตรฐาน',
        engine: form.engine.trim(),
        horsepower: Number(form.horsepower) || 0,
        seats: Number(form.seats) || 5,
        description: `${brand} ${name} เพิ่มจากหน้าจัดการรถ สามารถกลับมาใส่รายละเอียดเพิ่มเติมในภายหลังได้`,
        features: ['เพิ่มข้อมูลสเปกและอุปกรณ์เด่นเพิ่มเติมได้'],
        photos: allPhotos,
      });
      reload();
      setForm(emptyForm);
      setSelectedPhotos([]);
      setNotice(`เพิ่ม ${brand} ${name} แล้ว พร้อมรูปภาพ ${allPhotos.length} รูป — บันทึกในฐานข้อมูล`);
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function addPhotosToExistingCar(car, event) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []).filter((file) => file.type.startsWith('image/'));
    input.value = '';
    if (!files.length) return;

    const currentPhotos = getCarPhotos(car);
    const slots = MAX_PHOTOS_PER_CAR - currentPhotos.length;
    if (slots <= 0) {
      setNotice(`${car.brand} ${car.name} มีรูปครบ ${MAX_PHOTOS_PER_CAR} รูปแล้ว`);
      return;
    }
    const chosenFiles = files.slice(0, slots);
    setUploadingCarId(car.id);
    setNotice(`กำลังเพิ่มรูปให้ ${car.brand} ${car.name}...`);
    try {
      const processed = await Promise.all(chosenFiles.map(compressImageFile));
      const allPhotos = [...currentPhotos, ...processed.map((photo) => photo.dataUrl)].slice(0, MAX_PHOTOS_PER_CAR);
      await saveCarPhotos(car.id, allPhotos);
      reload();
      setNotice(`เพิ่มรูป ${processed.length} รูปให้ ${car.brand} ${car.name} แล้ว`);
      if (files.length > slots) setNotice(`เพิ่มให้ ${car.brand} ${car.name} ได้ ${slots} รูปตามขีดจำกัด รูปที่เลือกเกินมาถูกข้ามแล้ว`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'เพิ่มรูปภาพไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUploadingCarId('');
    }
  }

  async function removeCar(car) {
    if (!window.confirm(`ลบ ${car.brand} ${car.name} ออกจากฐานข้อมูลหรือไม่? (รถที่มีออเดอร์หรือนัดหมายอ้างอิงอยู่จะลบไม่ได้)`)) return;
    setBusy(true);
    try {
      await removeCarRecord(car.id);
      reload();
      setNotice(`ลบ ${car.brand} ${car.name} ออกจากรายการแล้ว`);
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content catalog-admin-page">
      <header className="catalog-admin-heading">
        <div><p className="catalog-eyebrow">CATALOG MANAGEMENT</p><h1>จัดการรถยนต์</h1><p>เพิ่มรุ่นรถ เลือกรูปจากเครื่องได้หลายภาพ และตรวจภาพก่อนนำไปแสดงหน้าร้าน</p></div>
        <div className="catalog-admin-nav"><Link className="is-active" to="/admin/cars">จัดการรถ</Link><Link to="/admin/stock">สต็อกสินค้า</Link><Link to="/admin/promotions">โปรโมชัน</Link><Link to="/catalog">ดูหน้าร้าน ↗</Link></div>
      </header>

      <div className="catalog-admin-notice"><span>i</span><p>รายการรถ ราคา สต็อก และรูปภาพบันทึกในฐานข้อมูลผ่าน catalog API รูปที่เลือกจากเครื่องจะถูกลดขนาดก่อนบันทึก (สูงสุด 6 รูปต่อรุ่น) การลบรุ่นรถทำไม่ได้ถ้ามีออเดอร์หรือนัดหมายอ้างอิงอยู่</p></div>
      {loadError && <div className="catalog-form-feedback" role="alert">{loadError}<button type="button" onClick={reload} aria-label="ลองโหลดใหม่">↻</button></div>}
      {notice && <div className="catalog-form-feedback" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความ">×</button></div>}

      <div className="catalog-admin-layout">
        <section className="catalog-admin-panel">
          <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">NEW VEHICLE</p><h2>เพิ่มรถยนต์รุ่นใหม่</h2></div><span className="catalog-number-tag">+ เพิ่มรุ่น</span></div>
          <form className="catalog-admin-form" onSubmit={handleSubmit}>
            <label>ยี่ห้อ<input name="brand" value={form.brand} onChange={updateField} placeholder="เช่น McLaren" required /></label>
            <label>ชื่อรุ่น<input name="name" value={form.name} onChange={updateField} placeholder="เช่น Artura" required /></label>
            <label>ประเภทรถ<select name="type" value={form.type} onChange={updateField}>{Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>ราคา (บาท)<input name="price" type="number" min="1" value={form.price} onChange={updateField} placeholder="เช่น 18000000" required /></label>
            <label>ปีรุ่น<input name="year" type="number" min="1990" max="2035" value={form.year} onChange={updateField} /></label>
            <label>สต็อกเริ่มต้น<input name="stock" type="number" min="0" value={form.stock} onChange={updateField} /></label>
            <label>พลังงาน<select name="fuel" value={form.fuel} onChange={updateField}><option>เบนซิน</option><option>ดีเซล</option><option>ไฮบริด</option><option>Plug-in Hybrid</option><option>ไฟฟ้า 100%</option></select></label>
            <label>รุ่นย่อย<input name="variant" value={form.variant} onChange={updateField} placeholder="เช่น Performance" /></label>
            <label className="catalog-form-wide">เครื่องยนต์ / มอเตอร์<input name="engine" value={form.engine} onChange={updateField} placeholder="เช่น 3.0L V6 Twin-Turbo" /></label>
            <label>กำลัง (แรงม้า)<input name="horsepower" type="number" min="0" value={form.horsepower} onChange={updateField} placeholder="เช่น 600" /></label>
            <label>จำนวนที่นั่ง<input name="seats" type="number" min="1" max="12" value={form.seats} onChange={updateField} /></label>

            <div className="catalog-photo-upload-box catalog-form-wide">
              <div className="catalog-photo-upload-heading"><strong>รูปภาพรถจากเครื่อง</strong><span>{selectedPhotos.length}/{MAX_PHOTOS_PER_CAR} รูป</span></div>
              <label className="catalog-upload-button">
                <input type="file" accept="image/*" multiple onChange={handlePhotoFiles} />
                <span>＋ เลือกไฟล์รูปภาพ (เลือกได้หลายรูป)</span>
              </label>
              <p className="catalog-form-help">เลือกรูปด้านหน้า ด้านข้าง ด้านหลัง หรือภายในรถได้สูงสุด {MAX_PHOTOS_PER_CAR} รูป รูปจะถูกลดขนาดก่อนบันทึก</p>
              {selectedPhotos.length > 0 && <div className="catalog-upload-preview-grid">{selectedPhotos.map((photo, index) => <div className="catalog-upload-preview" key={`${photo.name}-${index}`}><img src={photo.dataUrl} alt={photo.name} /><span title={photo.name}>{photo.name}</span><button type="button" onClick={() => setSelectedPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} aria-label={`ลบรูป ${photo.name}`}>×</button><small>{index === 0 ? 'ภาพหลัก' : `ภาพ ${index + 1}`}</small></div>)}</div>}
            </div>

            <label className="catalog-form-wide">URL รูปรถสำรอง (ไม่บังคับ)<input name="imageUrl" type="url" value={form.imageUrl} onChange={updateField} placeholder="https://example.com/car.jpg" /></label>
            <p className="catalog-form-help">ถ้าเลือกไฟล์จากเครื่อง รูปที่เลือกจะเป็นภาพหลักและแกลเลอรีก่อน ส่วน URL ด้านบนจะถูกเพิ่มเป็นภาพต่อท้าย</p>
            <button className="catalog-primary-button catalog-form-wide" type="submit" disabled={busy}>＋ เพิ่มรถเข้ารายการ</button>
          </form>
        </section>

        <section className="catalog-admin-panel catalog-admin-list-panel">
          <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">VEHICLE LIBRARY</p><h2>รายการรถทั้งหมด</h2></div><span className="catalog-number-tag">{cars.length} รุ่น</span></div>
          <label className="catalog-search-field"><span aria-hidden="true">⌕</span><span className="sr-only">ค้นหารุ่นรถ</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหายี่ห้อหรือรุ่น..." /></label>
          <div className="catalog-admin-car-list">
            {visibleCars.map((car) => {
              const status = stockStatus(car.stock);
              const photoCount = getCarPhotos(car).length;
              return <article key={car.id} className="catalog-admin-car-row"><div className="catalog-admin-car-thumb"><CarPhoto car={car} className="catalog-admin-thumb-photo" /></div><div className="catalog-admin-car-main"><strong>{car.brand} {car.name}</strong><span>{CATEGORY_LABELS[car.type] || car.type} · {formatBaht(car.price)}</span><small className={`catalog-inline-status ${status.tone}`}>{status.label} · {car.stock} คัน</small><small className="catalog-admin-photo-count">{photoCount} รูปในแกลเลอรี</small></div><div className="catalog-admin-car-actions"><Link to={`/catalog/${encodeURIComponent(car.id)}`} title="ดูรายละเอียด" aria-label={`ดูรายละเอียด ${car.name}`}>↗</Link><label className={`catalog-admin-photo-add ${uploadingCarId === car.id ? 'is-uploading' : ''}`} title="เพิ่มรูปภาพรถ">{uploadingCarId === car.id ? '...' : '+ รูป'}<input type="file" accept="image/*" multiple disabled={uploadingCarId === car.id} onChange={(event) => addPhotosToExistingCar(car, event)} aria-label={`เพิ่มรูปให้ ${car.name}`} /></label><button type="button" title="นำออกจากรายการ" aria-label={`ลบ ${car.name}`} onClick={() => removeCar(car)} disabled={busy}>ลบ</button></div></article>;
            })}
            {loading && !loadError && <p className="catalog-muted">กำลังโหลดรายการรถ...</p>}
            {!loading && !loadError && !visibleCars.length && <p className="catalog-muted">ไม่พบรุ่นรถจากคำค้นหานี้</p>}
          </div>
          <Link className="catalog-admin-secondary-link" to="/admin/stock">ไปจัดการจำนวนสต็อก →</Link>
        </section>
      </div>
    </div>
  );
}
