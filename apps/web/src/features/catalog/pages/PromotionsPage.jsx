import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPromotions, savePromotions } from '../data/catalogData.js';
import './catalog.css';

const icons = ['↗', '✦', '◈', '◆', '◉'];

const EMPTY_FORM = {
  title: '', subtitle: '', badge: 'แคมเปญใหม่', value: '', description: '',
  conditions: '', appliesTo: 'รถทุกรุ่น', startDate: '', endDate: '',
  active: true, imageUrl: '',
};

function formatDate(date) {
  if (!date) return 'โปรดสอบถามวันสิ้นสุด';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ'));
    image.src = src;
  });
}

async function compressPromotionImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์ภาพเท่านั้น');
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxWidth = 1100;
  const maxHeight = 760;
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('เบราว์เซอร์ไม่สามารถประมวลผลภาพนี้ได้');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.72;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > 260_000 && quality > 0.42) {
    quality -= 0.07;
    result = canvas.toDataURL('image/jpeg', quality);
  }
  return result;
}

// Promotions without an uploaded image use the coloured gradient panel (no car photo).
function PromotionImage({ promotion, index, className = '' }) {
  const [hidden, setHidden] = useState(false);
  if (!promotion.imageUrl || hidden) return null;
  return (
    <img
      className={className}
      src={promotion.imageUrl}
      alt={`ภาพประกอบโปรโมชัน ${promotion.title || ''}`}
      loading={index < 3 ? 'eager' : 'lazy'}
      onError={() => setHidden(true)}
    />
  );
}

export default function PromotionsPage({ adminMode = false }) {
  const [promotions, setPromotions] = useState(() => getPromotions());
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [notice, setNotice] = useState('');
  const [savingImage, setSavingImage] = useState(false);
  const activeCount = promotions.filter((promotion) => promotion.active).length;
  const visiblePromotions = useMemo(() => adminMode ? promotions : promotions.filter((item) => item.active), [adminMode, promotions]);

  function persist(next, successMessage) {
    if (!savePromotions(next)) {
      setNotice('บันทึกไม่สำเร็จ พื้นที่ LocalStorage อาจเต็ม กรุณาลดขนาดรูปภาพแล้วลองอีกครั้ง');
      return false;
    }
    setPromotions(next);
    setNotice(successMessage);
    return true;
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId('');
    setSavingImage(false);
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleImageSelect(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setSavingImage(true);
    setNotice('กำลังเตรียมรูปภาพ...');
    try {
      const imageUrl = await compressPromotionImage(file);
      setForm((current) => ({ ...current, imageUrl }));
      setNotice(`เตรียมรูป ${file.name} เรียบร้อยแล้ว`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'เพิ่มรูปภาพไม่สำเร็จ');
    } finally {
      setSavingImage(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title || !form.value.trim() || !form.description.trim()) {
      setNotice('กรุณากรอกชื่อโปรโมชัน ข้อเสนอ และรายละเอียดให้ครบ');
      return;
    }
    const record = {
      ...form,
      title,
      subtitle: form.subtitle.trim(),
      badge: form.badge.trim() || 'โปรโมชัน',
      value: form.value.trim(),
      description: form.description.trim(),
      conditions: form.conditions.trim() || 'โปรดสอบถามเงื่อนไขเพิ่มเติม',
      appliesTo: form.appliesTo.trim() || 'รถทุกรุ่น',
    };

    let next;
    if (editingId) {
      next = promotions.map((item) => item.id === editingId ? { ...item, ...record, id: editingId } : item);
    } else {
      const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '') || 'promotion';
      next = [{ ...record, id: `${slug}-${Date.now().toString(36)}` }, ...promotions];
    }
    if (persist(next, editingId ? `แก้ไขโปรโมชัน “${title}” แล้ว` : `เพิ่มโปรโมชัน “${title}” แล้ว`)) resetForm();
  }

  function startEditing(promotion) {
    setEditingId(promotion.id);
    setForm({ ...EMPTY_FORM, ...promotion, startDate: promotion.startDate || '', endDate: promotion.endDate || '' });
    setNotice(`กำลังแก้ไข “${promotion.title}”`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function togglePromotion(id) {
    const next = promotions.map((item) => item.id === id ? { ...item, active: !item.active } : item);
    const changed = next.find((item) => item.id === id);
    persist(next, `เปลี่ยนสถานะโปรโมชัน “${changed.title}” เป็น${changed.active ? 'เปิด' : 'ปิด'}แสดงแล้ว`);
  }

  function deletePromotion(promotion) {
    if (!window.confirm(`ต้องการลบโปรโมชัน “${promotion.title}” หรือไม่?`)) return;
    const next = promotions.filter((item) => item.id !== promotion.id);
    if (persist(next, `ลบโปรโมชัน “${promotion.title}” แล้ว`) && editingId === promotion.id) resetForm();
  }

  return (
    <div className={`page-content catalog-page ${adminMode ? 'catalog-admin-page catalog-promotion-admin' : 'catalog-promotions-page'}`}>
      {adminMode ? (
        <header className="catalog-admin-heading">
          <div><p className="catalog-eyebrow">CAMPAIGN MANAGEMENT</p><h1>จัดการโปรโมชัน</h1><p>เพิ่ม แก้ไข ลบ เลือกรูปจากเครื่อง และเปิดหรือปิดแคมเปญที่แสดงบนหน้าร้าน</p></div>
          <div className="catalog-admin-nav"><Link to="/admin/cars">จัดการรถ</Link><Link to="/admin/stock">สต็อกสินค้า</Link><Link className="is-active" to="/admin/promotions">โปรโมชัน</Link><Link to="/promotions">ดูหน้าลูกค้า ↗</Link></div>
        </header>
      ) : (
        <header className="catalog-promotions-hero">
          <div><p className="catalog-eyebrow">SPECIAL OFFERS · TOYOTY</p><h1>ข้อเสนอที่ทำให้การออกรถง่ายขึ้น</h1><p>รวมแคมเปญแนะนำสำหรับรถใช้งานประจำวัน รถไฮบริด รถสปอร์ต และซูเปอร์คาร์</p><Link to="/catalog" className="catalog-promotions-cta">เลือกรถที่สนใจ <span>→</span></Link></div>
          <div className="catalog-promotions-hero-sticker"><span>สิทธิพิเศษ</span><strong>{activeCount.toString().padStart(2, '0')}</strong><small>แคมเปญที่เปิดอยู่</small></div>
        </header>
      )}

      {notice && <div className="catalog-form-feedback" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความ">×</button></div>}
      <div className="catalog-promotion-notice"><span>i</span><p>โปรโมชันทั้งหมดเป็นข้อมูลตัวอย่างสำหรับ Frontend รูปภาพและรายการจะเก็บใน LocalStorage ของเบราว์เซอร์นี้เท่านั้น ยังไม่ได้เชื่อม Backend หรือฐานข้อมูลกลาง</p></div>

      {adminMode && (
        <section className="catalog-admin-panel catalog-promotion-editor">
          <div className="catalog-admin-panel-head"><div><p className="catalog-eyebrow">{editingId ? 'EDIT CAMPAIGN' : 'NEW CAMPAIGN'}</p><h2>{editingId ? 'แก้ไขโปรโมชัน' : 'เพิ่มโปรโมชันใหม่'}</h2></div><span className="catalog-number-tag">{editingId ? 'กำลังแก้ไข' : '+ เพิ่มรายการ'}</span></div>
          <form className="catalog-promo-form" onSubmit={handleSubmit}>
            <label>ชื่อโปรโมชัน *<input name="title" value={form.title} onChange={updateField} placeholder="เช่น Hybrid Smart Deal" required /></label>
            <label>หัวข้อรอง<input name="subtitle" value={form.subtitle} onChange={updateField} placeholder="คำอธิบายสั้น ๆ" /></label>
            <label>ป้ายแคมเปญ<input name="badge" value={form.badge} onChange={updateField} placeholder="เช่น ยอดนิยม" /></label>
            <label>ข้อเสนอหลัก *<input name="value" value={form.value} onChange={updateField} placeholder="เช่น ส่วนลดสูงสุด ฿30,000" required /></label>
            <label className="catalog-promo-form-wide">รายละเอียดโปรโมชัน *<textarea name="description" value={form.description} onChange={updateField} rows="3" placeholder="อธิบายสิทธิประโยชน์ของโปรโมชัน" required /></label>
            <label>รถที่ร่วมรายการ<input name="appliesTo" value={form.appliesTo} onChange={updateField} placeholder="เช่น รถไฮบริดที่ร่วมรายการ" /></label>
            <label>เงื่อนไข<input name="conditions" value={form.conditions} onChange={updateField} placeholder="เงื่อนไขที่ลูกค้าควรทราบ" /></label>
            <label>วันเริ่มต้น<input name="startDate" type="date" value={form.startDate} onChange={updateField} /></label>
            <label>วันสิ้นสุด<input name="endDate" type="date" value={form.endDate} onChange={updateField} /></label>
            <label className="catalog-promo-form-wide">URL รูปภาพ (ไม่บังคับ)<input name="imageUrl" value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl} onChange={updateField} placeholder="https://... หรือเลือกไฟล์รูปด้านล่าง" /></label>
            <div className="catalog-promo-upload-box catalog-promo-form-wide">
              <div className="catalog-photo-upload-heading"><strong>ภาพประกอบโปรโมชัน</strong><span>เลือกไฟล์จากเครื่องได้ 1 รูป</span></div>
              <label className="catalog-upload-button">{savingImage ? 'กำลังเตรียมรูป...' : '＋ เลือกรูปภาพจากเครื่อง'}<input type="file" accept="image/*" onChange={handleImageSelect} disabled={savingImage} /></label>
              {form.imageUrl && <div className="catalog-promo-preview"><img src={form.imageUrl} alt="ตัวอย่างภาพโปรโมชัน" /><button type="button" onClick={() => setForm((current) => ({ ...current, imageUrl: '' }))}>ลบรูปภาพ</button></div>}
              <p className="catalog-form-help">ภาพจะถูกย่อขนาดก่อนบันทึก เพื่อลดการใช้พื้นที่ในเบราว์เซอร์</p>
            </div>
            <label className="catalog-promo-active-toggle"><input type="checkbox" name="active" checked={Boolean(form.active)} onChange={updateField} /><span>เปิดแสดงโปรโมชันบนหน้าร้าน</span></label>
            <div className="catalog-promo-form-actions catalog-promo-form-wide"><button type="submit" className="catalog-primary-button">{editingId ? 'บันทึกการแก้ไข' : 'เพิ่มโปรโมชัน'}</button>{editingId && <button type="button" className="catalog-promo-cancel-button" onClick={resetForm}>ยกเลิกการแก้ไข</button>}</div>
          </form>
        </section>
      )}

      <section className="catalog-promotion-section">
        <div className="catalog-section-heading"><div><p className="catalog-eyebrow">{adminMode ? 'CAMPAIGN LIBRARY' : 'CURRENT CAMPAIGNS'}</p><h2>{adminMode ? 'รายการแคมเปญทั้งหมด' : 'โปรโมชันที่เปิดให้ดู'}</h2></div><span className="catalog-results-count">{adminMode ? `${promotions.length} แคมเปญ` : `${visiblePromotions.length} รายการ`}</span></div>
        <div className="catalog-promotion-grid">
          {visiblePromotions.map((promotion, index) => (
            <article className={`catalog-promotion-card ${!promotion.active ? 'is-disabled' : ''}`} key={promotion.id}>
              <div className={`catalog-promotion-visual visual-${index % 5}`}>
                <PromotionImage promotion={promotion} index={index} className="catalog-promotion-cover" />
                <span className="catalog-promo-icon" aria-hidden="true">{icons[index % icons.length]}</span>
                <span className="catalog-promo-label">{promotion.badge || 'โปรโมชัน'}</span>
                <span className="catalog-promo-watermark">TOYOTY</span>
              </div>
              <div className="catalog-promotion-body">
                <p className="catalog-promotion-subtitle">{promotion.subtitle || 'ข้อเสนอพิเศษ'}</p>
                <h3>{promotion.title}</h3>
                <strong className="catalog-promotion-value">{promotion.value}</strong>
                <p className="catalog-promotion-description">{promotion.description}</p>
                <div className="catalog-promotion-meta">
                  <div><span>เหมาะสำหรับ</span><strong>{promotion.appliesTo || 'รถทุกรุ่น'}</strong></div>
                  {promotion.startDate && <div><span>เริ่มต้น</span><strong>{formatDate(promotion.startDate)}</strong></div>}
                  <div><span>สิ้นสุดตัวอย่าง</span><strong>{formatDate(promotion.endDate)}</strong></div>
                </div>
                <p className="catalog-promotion-conditions">เงื่อนไข: {promotion.conditions || 'โปรดสอบถามเงื่อนไขเพิ่มเติม'}</p>
                {adminMode ? (
                  <>
                    <div className="catalog-promo-admin-actions"><span className={`catalog-status-chip ${promotion.active ? 'in' : 'out'}`}><i />{promotion.active ? 'เปิดแสดง' : 'ปิดแสดง'}</span><button type="button" className={promotion.active ? 'catalog-disable-button' : 'catalog-enable-button'} onClick={() => togglePromotion(promotion.id)}>{promotion.active ? 'ปิดโปรโมชัน' : 'เปิดโปรโมชัน'}</button></div>
                    <div className="catalog-promo-manage-actions"><button type="button" onClick={() => startEditing(promotion)}>แก้ไข</button><button type="button" onClick={() => deletePromotion(promotion)}>ลบโปรโมชัน</button></div>
                  </>
                ) : (
                  <Link className="catalog-promotion-link" to="/catalog">เลือกรถที่ร่วมรายการ <span>↗</span></Link>
                )}
              </div>
            </article>
          ))}
        </div>
        {!visiblePromotions.length && <div className="catalog-empty-state"><h3>ยังไม่มีโปรโมชันที่เปิดแสดง</h3><p>ผู้ดูแลสามารถเพิ่มหรือเปิดแคมเปญได้จากหน้าจัดการโปรโมชัน</p>{!adminMode && <Link className="s-btn pri" to="/catalog">เลือกรถทั้งหมด</Link>}</div>}
      </section>
      {!adminMode && <section className="catalog-promo-contact"><div><p className="catalog-eyebrow">NEED MORE DETAILS?</p><h2>อยากได้ข้อเสนอที่เหมาะกับคุณ?</h2><p>เลือกรุ่นรถที่สนใจแล้วส่งคำขอให้ทีมขายช่วยอธิบายค่าใช้จ่ายและเงื่อนไข</p></div><Link to="/catalog" className="catalog-promotions-cta">เลือกรถยนต์ <span>→</span></Link></section>}
      {adminMode && <p className="catalog-demo-note">เมื่อต่อ Backend ควรเพิ่มสิทธิ์ผู้ดูแล การตั้งวันเริ่ม/สิ้นสุด เงื่อนไขรุ่นรถที่ร่วมรายการ และประวัติผู้แก้ไขแคมเปญ</p>}
    </div>
  );
}