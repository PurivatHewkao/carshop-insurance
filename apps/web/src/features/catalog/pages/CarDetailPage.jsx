import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Action } from '../../../components/common/Showroom.jsx';
import CarPhoto from '../components/CarPhoto.jsx';
import {
  CATEGORY_LABELS,
  formatBaht,
  getCars,
  getCarColorOptions,
  getPromotions,
  stockStatus,
} from '../data/catalogData.js';
import './catalog.css';

export default function CarDetailPage() {
  const { name = '' } = useParams();
  const [cars] = useState(() => getCars());
  const [photoIndex, setPhotoIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const car = cars.find((item) => item.id === name || item.name === name)
    || (name === 'Corolla Cross' ? cars.find((item) => item.id === 'corolla-cross') : null)
    || cars.find((item) => `${item.brand} ${item.name}`.toLowerCase() === decodeURIComponent(name).toLowerCase());
  const promotions = useMemo(() => getPromotions().filter((promo) => promo.active), []);

  if (!car) {
    return <div className="page-content"><div className="catalog-empty-state"><h1>ไม่พบรุ่นรถที่เลือก</h1><p>รุ่นรถอาจถูกนำออกจากรายการหรือไม่มีอยู่ในข้อมูลตัวอย่าง</p><Link className="s-btn pri" to="/catalog">กลับไปดูรถทั้งหมด</Link></div></div>;
  }

  const status = stockStatus(car.stock);
  const colorOptions = getCarColorOptions(car);
  const activeColor = colorOptions.find((option) => option.name === selectedColor)
    || colorOptions.find((option) => option.value === car.color)
    || colorOptions[0];
  const colorPhotos = Array.isArray(activeColor?.images) && activeColor.images.length
    ? [...activeColor.images, car.imageUrl, ...(car.gallery || [])]
    : [car.imageUrl, ...(car.gallery || [])];
  const photos = colorPhotos.filter((url, index, all) => Boolean(url) && all.indexOf(url) === index).slice(0, 6);
  const activePhotoIndex = Math.min(photoIndex, Math.max(photos.length - 1, 0));
  const selectedImageCar = { ...car, imageUrl: photos[activePhotoIndex] || '' };
  const requestParams = new URLSearchParams({ car: car.name, variant: car.variant || 'รุ่นมาตรฐาน', color: activeColor?.name || car.color || 'สีมาตรฐาน' });
  const requestUrl = `/requests?${requestParams.toString()}`;
  const matchingPromotions = promotions.filter((promo) => {
    const target = `${promo.appliesTo} ${promo.title} ${promo.subtitle}`.toLowerCase();
    return target.includes('ทุกรุ่น')
      || (car.type === 'supercar' && (target.includes('ซูเปอร์คาร์') || target.includes('สปอร์ต')))
      || (car.type === 'sport' && target.includes('สปอร์ต'))
      || (car.fuel === 'ไฮบริด' && target.includes('ไฮบริด'));
  }).slice(0, 2);

  return (
    <div className="page-content catalog-page catalog-detail-page">
      <p className="catalog-breadcrumb"><Link to="/catalog">รถทั้งหมด</Link><span>/</span>{car.brand}<span>/</span><strong>{car.name}</strong></p>
      <section className="catalog-detail-top">
        <div className="catalog-detail-gallery">
          <div className="catalog-detail-main-photo"><CarPhoto key={`${car.id}-${photoIndex}`} car={selectedImageCar} className="catalog-detail-photo" /></div>
          {photos.length > 1 && <div className="catalog-detail-thumbnails" aria-label="เลือกรูปรถ">{photos.map((photo, index) => <button className={activePhotoIndex === index ? 'is-active' : ''} key={`${photo}-${index}`} type="button" onClick={() => setPhotoIndex(index)} aria-label={`ดูรูปที่ ${index + 1}`}><img src={photo} alt={`${car.name} มุมที่ ${index + 1}`} loading="lazy" /></button>)}</div>}
          <div className="catalog-color-options"><span>เลือกสีตัวถัง</span><div>{colorOptions.map((color) => <button key={color.name} type="button" title={color.name} aria-label={`เลือกสี${color.name}`} aria-pressed={activeColor?.name === color.name} className={activeColor?.name === color.name ? 'is-active' : ''} style={{ '--swatch': color.value }} onClick={() => { setSelectedColor(color.name); setPhotoIndex(0); }} />)}</div><strong>{activeColor?.name || 'สีมาตรฐาน'}</strong></div>
          {activeColor?.images?.length > 0 && <p className="catalog-color-note">ภาพรถเปลี่ยนตามสีที่เลือกเมื่อมีรูปภาพสีดังกล่าว</p>}
        </div>

        <div className="catalog-detail-summary">
          <p className="catalog-eyebrow">{car.brand.toUpperCase()} · {CATEGORY_LABELS[car.type] || car.type}</p>
          <div className="catalog-detail-title-line"><h1>{car.name}</h1><span className={`catalog-status-chip ${status.tone}`}><i />{status.label}</span></div>
          <p className="catalog-detail-variant">{car.year} · {car.variant || 'รุ่นมาตรฐาน'} · {car.fuel}</p>
          <p className="catalog-detail-description">{car.description}</p>
          <div className="catalog-detail-price"><div><small>ราคาเริ่มต้น (ข้อมูลตัวอย่าง)</small><strong>{formatBaht(car.price)}</strong></div><span>{car.stock > 0 ? `มี ${car.stock} คันในสต็อกตัวอย่าง` : 'สามารถส่งคำขอสอบถามรถได้'}</span></div>
          <div className="catalog-detail-actions"><Action to={`${requestUrl}&type=จอง`}>ส่งคำขอจองรถ</Action><Action to={`${requestUrl}&type=นัดดูรถ`} variant="out">นัดทดลองขับ</Action></div>
          <div className="catalog-trust-notes"><span>✓ ข้อมูลรถและออปชันตามรุ่น</span><span>✓ สอบถามเงื่อนไขกับที่ปรึกษาการขาย</span><span>✓ ราคาและสต็อกเป็นข้อมูลจำลอง</span></div>
        </div>
      </section>

      <section className="catalog-detail-spec-section">
        <div className="catalog-section-heading"><div><p className="catalog-eyebrow">KEY SPECIFICATIONS</p><h2>ข้อมูลทางเทคนิค</h2></div><span className="catalog-results-count">ข้อมูลเบื้องต้น</span></div>
        <div className="catalog-spec-grid">
          <div><span>เครื่องยนต์ / ระบบขับเคลื่อน</span><strong>{car.engine || 'ตรวจสอบตามรุ่นย่อย'}</strong></div>
          <div><span>กำลังสูงสุดโดยประมาณ</span><strong>{car.horsepower ? `${car.horsepower.toLocaleString('th-TH')} แรงม้า` : 'ตรวจสอบตามรุ่นย่อย'}</strong></div>
          <div><span>ระบบส่งกำลัง</span><strong>{car.transmission || 'ตรวจสอบตามรุ่นย่อย'}</strong></div>
          <div><span>ระบบขับเคลื่อน</span><strong>{car.drive || 'ตรวจสอบตามรุ่นย่อย'}</strong></div>
          <div><span>พลังงาน</span><strong>{car.fuel || 'ตรวจสอบตามรุ่นย่อย'}</strong></div>
          <div><span>จำนวนที่นั่ง</span><strong>{car.seats || '-'} ที่นั่ง</strong></div>
          <div><span>สต็อกตัวอย่าง</span><strong>{car.stock} คัน</strong></div>
          <div><span>สถานที่รถ</span><strong>{car.location || 'สอบถามผู้จำหน่าย'}</strong></div>
        </div>
      </section>

      <section className="catalog-detail-lower-grid">
        <div className="catalog-detail-panel"><p className="catalog-eyebrow">HIGHLIGHTS</p><h2>จุดเด่นของรุ่นนี้</h2><ul>{(car.features || []).map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul><div className="catalog-warranty"><span>การรับประกัน</span><strong>{car.warranty || 'โปรดสอบถามเงื่อนไขผู้จำหน่าย'}</strong></div></div>
        <div className="catalog-detail-panel"><p className="catalog-eyebrow">RECOMMENDED OFFERS</p><h2>โปรโมชันที่แนะนำ</h2>{matchingPromotions.length ? <div className="catalog-detail-promos">{matchingPromotions.map((promo) => <Link to="/promotions" key={promo.id} className="catalog-detail-promo"><span className="catalog-promo-mini-badge">{promo.badge}</span><strong>{promo.title}</strong><b>{promo.value}</b><small>{promo.description}</small></Link>)}</div> : <p className="catalog-muted">ขณะนี้ยังไม่มีโปรโมชันที่ตรงกับรุ่นนี้ โปรดสอบถามข้อเสนอจากทีมขาย</p>}<Link className="catalog-text-link" to="/promotions">สำรวจโปรโมชันทั้งหมด →</Link></div>
      </section>
      <p className="catalog-demo-note">ข้อมูลรถ รายละเอียดทางเทคนิค สต็อก และราคาเป็นข้อมูลตัวอย่างเพื่อพัฒนาหน้า Frontend เท่านั้น ไม่ใช่ใบเสนอราคาหรือคำยืนยันจากผู้ผลิต</p>
    </div>
  );
}
