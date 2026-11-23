import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CarPhoto from '../components/CarPhoto.jsx';
import {
  CAR_TYPES,
  CATEGORY_LABELS,
  formatBaht,
  stockStatus,
} from '../data/catalogData.js';
import { apiErrorMessage, createCarRecord, removeCarRecord, saveCarPhotos, saveCover, updateCarRecord, useCars, useCovers } from '../api/catalogApi.js';
import './catalog.css';

const MAX_PHOTOS_PER_CAR = 6;
// The car's own value (e.g. "ไฮบริด / เบนซิน") is added to the list when editing so saving does not change it.
const FUELS = ['เบนซิน', 'ดีเซล', 'ไฮบริด', 'Plug-in Hybrid', 'ไฟฟ้า 100%'];

// รายชื่อยี่ห้อที่อนุญาตให้เพิ่มรถได้ (ต้องตรงกับ ALLOWED_BRANDS ใน services/catalog/src/modules/cars/routes.js)
// TOYOTY อยู่บนสุดเพราะเป็นรถที่ขายจริงตอนนี้; ยี่ห้อเดิมเก็บไว้ให้แก้รุ่นที่ถูกซ่อนได้
const ALLOWED_BRANDS = ['TOYOTY', 'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Isuzu', 'Suzuki', 'Subaru', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Ferrari', 'Lamborghini', 'McLaren', 'BYD', 'Tesla', 'MG', 'GWM', 'Hyundai', 'Kia', 'Volvo', 'Lexus'];

const emptyForm = {
  brand: '', name: '', type: 'sedan', price: '', year: '2025', stock: '1',
  fuel: 'เบนซิน', engine: '', horsepower: '', seats: '5', imageUrl: '', variant: 'รุ่นมาตรฐาน',
  // Shown to customers on the car list and car detail / configurator pages.
  tag: '', featured: false, transmission: '', drive: '', location: '', warranty: '', description: '', features: '',
};

// catalogApi fills empty values with these texts for display; treat them as empty in the form.
const DISPLAY_DEFAULTS = ['รุ่นมาตรฐาน', 'ระบุสเปกภายหลัง', 'ตรวจสอบตามรุ่นย่อย', 'ยังไม่ระบุสถานที่เก็บรถ', 'ตรวจสอบเงื่อนไขกับผู้จำหน่าย'];
const formText = (value) => (!value || DISPLAY_DEFAULTS.includes(value) ? '' : String(value));

/** Customer-facing details sent with both create and edit. */
function detailFields(form) {
  return {
    tag: form.tag.trim() || 'เพิ่มใหม่',
    featured: form.featured,
    transmission: form.transmission.trim(),
    drive: form.drive.trim(),
    location: form.location.trim(),
    warranty: form.warranty.trim(),
    description: form.description.trim(),
    features: form.features.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 30),
  };
}

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
  const { covers, reload: reloadCovers } = useCovers();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadingCarId, setUploadingCarId] = useState('');
  const [editingId, setEditingId] = useState('');
  // Photos the car had when editing started, to know whether they need saving.
  const [originalPhotos, setOriginalPhotos] = useState([]);

  const visibleCars = useMemo(() => cars.filter((car) => `${car.brand} ${car.name}`.toLowerCase().includes(query.trim().toLowerCase())), [cars, query]);
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  function startEdit(car) {
    setEditingId(car.id);
    const photos = getCarPhotos(car);
    setOriginalPhotos(photos);
    setSelectedPhotos(photos.map((url, index) => ({ name: index === 0 ? 'ภาพหลักเดิม' : `รูปเดิม ${index + 1}`, dataUrl: url })));
    setForm({
      brand: car.brand, name: car.name, type: car.type, price: String(car.price), year: String(car.year || 2025),
      stock: String(car.stock), fuel: car.fuel || 'เบนซิน', horsepower: String(car.horsepower || ''),
      seats: String(car.seats || 5), imageUrl: '', variant: car.variant || 'รุ่นมาตรฐาน',
      engine: formText(car.engine), tag: car.tag || '', featured: Boolean(car.featured),
      transmission: formText(car.transmission), drive: formText(car.drive), location: formText(car.location),
      warranty: formText(car.warranty), description: car.description || '', features: (car.features || []).join('\n'),
    });
    setNotice(`กำลังแก้ไข ${car.brand} ${car.name} — เพิ่ม ลบ หรือเปลี่ยนภาพหลักได้ในกล่องรูปภาพ แล้วกดบันทึก (แก้สต็อกที่หน้าสต็อกสินค้า)`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId('');
    setForm(emptyForm);
    setSelectedPhotos([]);
    setOriginalPhotos([]);
    setNotice('');
  }

  function makeMainPhoto(index) {
    setSelectedPhotos((current) => [current[index], ...current.filter((_, photoIndex) => photoIndex !== index)]);
  }

  // Uploaded files first in the order shown, then the optional URL; no duplicates, at most 6.
  function photosToSave() {
    const externalImage = form.imageUrl.trim();
    return [...selectedPhotos.map((photo) => photo.dataUrl), ...(externalImage ? [externalImage] : [])]
      .filter((url, index, all) => Boolean(url) && all.indexOf(url) === index)
      .slice(0, MAX_PHOTOS_PER_CAR);
  }

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
    if (cars.some((car) => car.id !== editingId && `${car.brand} ${car.name}`.toLowerCase() === `${brand} ${name}`.toLowerCase())) {
      setNotice('มีรุ่นรถนี้อยู่ในรายการแล้ว');
      return;
    }

    if (editingId) {
      const photos = photosToSave();
      const photosChanged = JSON.stringify(photos) !== JSON.stringify(originalPhotos);
      setBusy(true);
      try {
        await updateCarRecord(editingId, {
          brand, name, type: form.type, price, year: Number(form.year) || 2025, fuel: form.fuel,
          variant: form.variant.trim() || 'รุ่นมาตรฐาน', engine: form.engine.trim(), horsepower: Number(form.horsepower) || 0, seats: Number(form.seats) || 5,
          ...detailFields(form),
        });
        if (photosChanged) await saveCarPhotos(editingId, photos);
        reload();
        setEditingId('');
        setForm(emptyForm);
        setSelectedPhotos([]);
        setOriginalPhotos([]);
        setNotice(`บันทึกการแก้ไข ${brand} ${name} แล้ว${photosChanged ? ` — รูปภาพตอนนี้ ${photos.length} รูป` : ''}`);
      } catch (error) {
        setNotice(apiErrorMessage(error));
      } finally {
        setBusy(false);
      }
      return;
    }

    const allPhotos = photosToSave();
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
        ...detailFields(form),
        description: form.description.trim() || `${brand} ${name} เพิ่มจากหน้าจัดการรถ สามารถกลับมาใส่รายละเอียดเพิ่มเติมในภายหลังได้`,
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

  async function uploadCoverImage(slot, event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const { dataUrl } = await compressImageFile(file);
      await saveCover(slot, { imageUrl: dataUrl });
      reloadCovers();
      setNotice('เปลี่ยนรูปปกแล้ว');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function changeCover(slot, patch) {
    setBusy(true);
    try {
      await saveCover(slot, patch);
      reloadCovers();
      setNotice('บันทึกปกแล้ว');
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeCar(car) {
    if (!window.confirm(`ลบ ${car.brand} ${car.name} ออกจากฐานข้อมูลหรือไม่? (รถที่มีออเดอร์หรือนัดหมายอ้างอิงอยู่จะลบไม่ได้)`)) return;
    setBusy(true);
    try {
      await removeCarRecord(car.id);
      if (car.id === editingId) cancelEdit();
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
        <div className="catalog-admin-nav"><Link className="is-active" to="/admin/cars">จัดการรถ</Link><Link to="/admin/cars/options">รุ่นย่อย / สี / ล้อ</Link><Link to="/admin/stock">สต็อกสินค้า</Link><Link to="/admin/promotions">โปรโมชัน</Link><Link to="/catalog">ดูหน้าร้าน ↗</Link></div>
      </header>

      {loadError && <div className="catalog-form-feedback" role="alert">{loadError}<button type="button" onClick={reload} aria-label="ลองโหลดใหม่">↻</button></div>}
      {notice && <div className="catalog-form-feedback" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความ">×</button></div>}

      <section className="catalog-admin-panel catalog-cover-panel">
        <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">COVER</p><h2>ปกหน้าเว็บ</h2></div></div>
        <div className="catalog-cover-grid">
          {[['home', 'ปกหน้าแรก (Home)'], ['catalog', 'ปกหน้ารายการรถ (/catalog)']].map(([slot, label]) => {
            const cover = covers[slot];
            const coverCar = cars.find((car) => car.id === cover.carId);
            const preview = cover.imageUrl || coverCar?.imageUrl || '';
            return (
              <div className="catalog-cover-card" key={slot}>
                <strong>{label}</strong>
                <div className="catalog-cover-preview">{preview ? <img src={preview} alt="" /> : <span>อัตโนมัติ</span>}</div>
                <label>รถที่แสดงข้อความบนปก
                  <select value={cover.carId || ''} disabled={busy} onChange={(event) => changeCover(slot, { carId: event.target.value || null })}>
                    <option value="">อัตโนมัติ (ระบบเลือกให้)</option>
                    {cars.map((car) => <option key={car.id} value={car.id}>{car.brand} {car.name}</option>)}
                  </select>
                </label>
                <div className="catalog-cover-actions">
                  <label className="catalog-admin-photo-add">เลือกรูปปกจากเครื่อง
                    <input type="file" accept="image/*" disabled={busy} onChange={(event) => uploadCoverImage(slot, event)} />
                  </label>
                  {cover.imageUrl && <button type="button" disabled={busy} onClick={() => changeCover(slot, { imageUrl: null })}>ใช้รูปของรถแทน</button>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="catalog-admin-layout">
        <section className="catalog-admin-panel">
          <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">NEW VEHICLE</p><h2>{editingId ? 'แก้ไขข้อมูลรถยนต์' : 'เพิ่มรถยนต์รุ่นใหม่'}</h2></div><span className="catalog-number-tag">{editingId ? '✎ แก้ไข' : '+ เพิ่มรุ่น'}</span></div>
          <form className="catalog-admin-form" onSubmit={handleSubmit}>
            <label>ยี่ห้อ<select name="brand" value={form.brand} onChange={updateField} required><option value="">เลือกยี่ห้อรถ</option>{form.brand && !ALLOWED_BRANDS.includes(form.brand) && <option value={form.brand}>{form.brand}</option>}{ALLOWED_BRANDS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>
            <label>ชื่อรุ่น<input name="name" value={form.name} onChange={updateField} placeholder="เช่น Khon, Civic, Artura" required /></label>
            <label>ประเภทรถ<select name="type" value={form.type} onChange={updateField}>{!CAR_TYPES.includes(form.type) && <option value={form.type}>{CATEGORY_LABELS[form.type] || form.type} (ประเภทเดิม)</option>}{CAR_TYPES.map((key) => <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>)}</select></label>
            <label>ราคา (บาท)<input name="price" type="number" min="1" value={form.price} onChange={updateField} placeholder="เช่น 18000000" required /></label>
            <label>ปีรุ่น<input name="year" type="number" min="1990" max="2035" value={form.year} onChange={updateField} /></label>
            <label>{editingId ? 'สต็อก (แก้ที่หน้าสต็อก)' : 'สต็อกเริ่มต้น'}<input name="stock" type="number" min="0" value={form.stock} onChange={updateField} disabled={Boolean(editingId)} /></label>
            <label>พลังงาน<select name="fuel" value={form.fuel} onChange={updateField}>{!FUELS.includes(form.fuel) && <option>{form.fuel}</option>}{FUELS.map((fuel) => <option key={fuel}>{fuel}</option>)}</select></label>
            <label>รุ่นย่อย<input name="variant" value={form.variant} onChange={updateField} placeholder="เช่น Performance" /></label>
            <label className="catalog-form-wide">เครื่องยนต์ / มอเตอร์<input name="engine" value={form.engine} onChange={updateField} placeholder="เช่น 3.0L V6 Twin-Turbo" /></label>
            <label>กำลัง (แรงม้า)<input name="horsepower" type="number" min="0" value={form.horsepower} onChange={updateField} placeholder="เช่น 600" /></label>
            <label>จำนวนที่นั่ง<input name="seats" type="number" min="1" max="12" value={form.seats} onChange={updateField} /></label>

            <div className="catalog-form-section catalog-form-wide"><strong>ข้อมูลที่ลูกค้าเห็น</strong><span>แสดงในหน้ารายการรถและหน้ารายละเอียด / หน้าแต่งรถ (สเปกรายรุ่นย่อยแก้ที่เมนู "รุ่นย่อย / สี / ล้อ")</span></div>
            <label>ป้ายบนการ์ด<input name="tag" value={form.tag} onChange={updateField} maxLength={50} placeholder="เช่น SUV 7 ที่นั่ง, ยอดนิยม" /></label>
            <label className="catalog-form-check"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} /><span>รุ่นแนะนำ (ขึ้นหน้าแรก / ปกก่อน)</span></label>
            <label>ระบบส่งกำลัง<input name="transmission" value={form.transmission} onChange={updateField} maxLength={100} placeholder="เช่น อัตโนมัติ 6 สปีด" /></label>
            <label>ระบบขับเคลื่อน<input name="drive" value={form.drive} onChange={updateField} maxLength={100} placeholder="เช่น ขับเคลื่อน 4 ล้อ" /></label>
            <label>สถานที่รถ / โชว์รูม<input name="location" value={form.location} onChange={updateField} maxLength={150} placeholder="เช่น โชว์รูม TOYOTY กรุงเทพฯ" /></label>
            <label>การรับประกัน<input name="warranty" value={form.warranty} onChange={updateField} maxLength={255} placeholder="เช่น 5 ปี หรือ 150,000 กม." /></label>
            <label className="catalog-form-wide">คำอธิบายรุ่น<textarea name="description" rows="3" value={form.description} onChange={updateField} maxLength={5000} placeholder="ย่อหน้าสั้น ๆ ที่ลูกค้าเห็นใต้รูปรถ" /></label>
            <label className="catalog-form-wide">จุดเด่น / อุปกรณ์ (บรรทัดละ 1 ข้อ)<textarea name="features" rows="4" value={form.features} onChange={updateField} placeholder={'ห้องโดยสาร 3 แถว 7 ที่นั่ง\nขับเคลื่อน 4 ล้อ'} /></label>

            <div className="catalog-photo-upload-box catalog-form-wide">
              <div className="catalog-photo-upload-heading"><strong>{editingId ? 'รูปภาพของรถคันนี้' : 'รูปภาพรถจากเครื่อง'}</strong><span>{selectedPhotos.length}/{MAX_PHOTOS_PER_CAR} รูป</span></div>
              <label className="catalog-upload-button">
                <input type="file" accept="image/*" multiple onChange={handlePhotoFiles} disabled={busy || selectedPhotos.length >= MAX_PHOTOS_PER_CAR} />
                <span>{selectedPhotos.length >= MAX_PHOTOS_PER_CAR ? `ครบ ${MAX_PHOTOS_PER_CAR} รูปแล้ว ลบบางรูปก่อนเพิ่ม` : '＋ เพิ่มรูปจากเครื่อง (เลือกได้หลายรูป)'}</span>
              </label>
              <p className="catalog-form-help">{editingId ? 'กด × เพื่อลบรูป กด "ตั้งเป็นภาพหลัก" เพื่อใช้รูปนั้นเป็นรูปแรก รูปจะเปลี่ยนจริงเมื่อกดบันทึกการแก้ไข' : `เลือกรูปด้านหน้า ด้านข้าง ด้านหลัง หรือภายในรถได้สูงสุด ${MAX_PHOTOS_PER_CAR} รูป`} รูปจากเครื่องจะถูกลดขนาดก่อนบันทึก</p>
              {selectedPhotos.length > 0 ? <div className="catalog-upload-preview-grid">{selectedPhotos.map((photo, index) => <div className="catalog-upload-preview" key={`${photo.dataUrl.slice(-40)}-${index}`}><img src={photo.dataUrl} alt={photo.name} /><span title={photo.name}>{photo.name}</span><button type="button" onClick={() => setSelectedPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} aria-label={`ลบรูป ${photo.name}`} disabled={busy}>×</button><small>{index === 0 ? 'ภาพหลัก' : <button type="button" className="catalog-upload-make-main" onClick={() => makeMainPhoto(index)} disabled={busy}>ตั้งเป็นภาพหลัก</button>}</small></div>)}</div>
                : editingId && <p className="catalog-form-help">ยังไม่มีรูป ถ้าบันทึกแบบนี้หน้าร้านจะใช้รูปสำรองตามประเภทรถ</p>}
            </div>

            <label className="catalog-form-wide">{editingId ? 'เพิ่มรูปจาก URL (ไม่บังคับ)' : 'URL รูปรถสำรอง (ไม่บังคับ)'}<input name="imageUrl" type="url" value={form.imageUrl} onChange={updateField} placeholder="https://example.com/car.jpg" /></label>
            <p className="catalog-form-help">URL จะถูกเพิ่มเป็นภาพต่อท้ายรูปด้านบนตอนบันทึก (รวมแล้วไม่เกิน {MAX_PHOTOS_PER_CAR} รูป)</p>
            <button className="catalog-primary-button catalog-form-wide" type="submit" disabled={busy}>{editingId ? '✓ บันทึกการแก้ไข' : '＋ เพิ่มรถเข้ารายการ'}</button>
            {editingId && <button className="catalog-form-wide" type="button" onClick={cancelEdit} disabled={busy}>ยกเลิกการแก้ไข</button>}
          </form>
        </section>

        <section className="catalog-admin-panel catalog-admin-list-panel">
          <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">VEHICLE LIBRARY</p><h2>รายการรถทั้งหมด</h2></div><span className="catalog-number-tag">{cars.length} รุ่น</span></div>
          <label className="catalog-search-field"><span aria-hidden="true">⌕</span><span className="sr-only">ค้นหารุ่นรถ</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหายี่ห้อหรือรุ่น..." /></label>
          <div className="catalog-admin-car-list">
            {visibleCars.map((car) => {
              const status = stockStatus(car.stock);
              const photoCount = getCarPhotos(car).length;
              return <article key={car.id} className="catalog-admin-car-row"><div className="catalog-admin-car-thumb"><CarPhoto car={car} className="catalog-admin-thumb-photo" /></div><div className="catalog-admin-car-main"><strong>{car.brand} {car.name}</strong><span>{CATEGORY_LABELS[car.type] || car.type} · {formatBaht(car.price)}</span><small className={`catalog-inline-status ${status.tone}`}>{status.label} · {car.stock} คัน</small><small className="catalog-admin-photo-count">{photoCount} รูปในแกลเลอรี</small></div><div className="catalog-admin-car-actions"><button type="button" title="แก้ไขข้อมูลรถ" aria-label={`แก้ไข ${car.name}`} onClick={() => startEdit(car)} disabled={busy}>แก้ไข</button><Link to={`/catalog/${encodeURIComponent(car.id)}`} title="ดูรายละเอียด" aria-label={`ดูรายละเอียด ${car.name}`}>↗</Link><label className={`catalog-admin-photo-add ${uploadingCarId === car.id ? 'is-uploading' : ''}`} title="เพิ่มรูปภาพรถ">{uploadingCarId === car.id ? '...' : '+ รูป'}<input type="file" accept="image/*" multiple disabled={uploadingCarId === car.id} onChange={(event) => addPhotosToExistingCar(car, event)} aria-label={`เพิ่มรูปให้ ${car.name}`} /></label><button type="button" title="นำออกจากรายการ" aria-label={`ลบ ${car.name}`} onClick={() => removeCar(car)} disabled={busy}>ลบ</button></div></article>;
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
