import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Action } from '../../../components/common/Showroom.jsx';
import InstallmentCalculator from '../../payment/components/InstallmentCalculator.jsx';
import CarPhoto from './CarPhoto.jsx';
import { useConfigurator, useQuote } from '../api/catalogApi.js';
import {
  CATEGORY_LABELS,
  FINISH_LABELS,
  formatBaht,
  formatDateRange,
} from '../data/catalogData.js';
import '../pages/configurator.css';

const NO_TRIMS = [];

function extra(amount) {
  return Number(amount) > 0 ? `+${formatBaht(amount)}` : 'ไม่มีค่าใช้จ่ายเพิ่ม';
}

function trimNames(trims, codes) {
  return trims.filter((trim) => codes.includes(trim.code)).map((trim) => trim.name).join(', ');
}

/** Every colour / wheel any trim offers, with the trims that may use it. */
function optionUnion(trims, key) {
  const byCode = new Map();
  for (const trim of trims) {
    for (const option of trim[key]) {
      const entry = byCode.get(option.code) || { ...option, trims: [] };
      entry.trims.push(trim.code);
      byCode.set(option.code, entry);
    }
  }
  return [...byCode.values()].sort((a, b) => (key === 'wheels' ? a.sizeInch - b.sizeInch : 0));
}

/**
 * Configurator for a made-to-order TOYOTY model: trim → colour → wheel, live price
 * from the catalog service (never computed here), pick-up window and request link.
 * The selection lives in the URL (?trim=&color=&wheel=) so it can be shared.
 */
export default function CarConfigurator({ car, promotions }) {
  const { configurator, loading, error } = useConfigurator(car.id);
  const [params, setParams] = useSearchParams();
  const [photoIndex, setPhotoIndex] = useState(0);
  const trims = configurator?.trims ?? NO_TRIMS;

  const trim = trims.find((item) => item.code === params.get('trim')) || trims[0];
  const color = trim?.colors.find((item) => item.code === params.get('color')) || trim?.colors[0];
  const wheel = trim?.wheels.find((item) => item.code === params.get('wheel'))
    || trim?.wheels.find((item) => item.isDefault)
    || trim?.wheels[0];
  const selection = trim && color && wheel
    ? { modelSlug: car.id, trim: trim.code, colorId: color.code, wheelId: wheel.code }
    : null;
  const { quote, lastQuote, error: quoteError, loading: quoting } = useQuote(selection);
  const shownQuote = quote || lastQuote;

  const allColors = useMemo(() => optionUnion(trims, 'colors'), [trims]);
  const allWheels = useMemo(() => optionUnion(trims, 'wheels'), [trims]);

  function choose(next) {
    const merged = { trim: trim?.code, color: color?.code, wheel: wheel?.code, ...next };
    const target = trims.find((item) => item.code === merged.trim);
    // Keep the colour / wheel when the new trim offers it, otherwise fall back to its standard one.
    if (target && !target.colors.some((item) => item.code === merged.color)) merged.color = target.colors[0]?.code;
    if (target && !target.wheels.some((item) => item.code === merged.wheel)) merged.wheel = target.wheels.find((item) => item.isDefault)?.code;
    const nextParams = new URLSearchParams(params);
    for (const [key, value] of Object.entries(merged)) {
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    }
    setParams(nextParams, { replace: true, preventScrollReset: true });
    setPhotoIndex(0);
  }

  const photos = [color?.imageUrl, car.imageUrl, ...(car.gallery || [])]
    .filter((url, index, all) => Boolean(url) && all.indexOf(url) === index)
    .slice(0, 6);
  const activePhoto = photos[Math.min(photoIndex, Math.max(photos.length - 1, 0))] || '';
  const total = shownQuote?.total ?? trim?.price ?? car.price;
  const eta = shownQuote?.estimatedReady ?? trim?.estimatedReady;
  const requestUrl = selection
    ? `/requests?${new URLSearchParams({
      type: 'จอง',
      brand: car.brand,
      car: car.name,
      variant: trim.name,
      color: color.name,
      model: car.id,
      trim: trim.code,
      colorId: color.code,
      wheelId: wheel.code,
    })}`
    : '';
  const testDriveUrl = `/requests?${new URLSearchParams({ type: 'ทดลองขับ', brand: car.brand, car: car.name })}`;
  const matchingPromotions = promotions
    .filter((promo) => `${promo.appliesTo} ${promo.title}`.includes('ทุกรุ่น'))
    .slice(0, 2);

  return (
    <div className="page-content catalog-page catalog-detail-page cfg-page">
      <p className="catalog-breadcrumb"><Link to="/catalog">รถทั้งหมด</Link><span>/</span>{car.brand}<span>/</span><strong>{car.name}</strong></p>

      <section className="catalog-model-hero">
        <CarPhoto key={activePhoto} car={{ ...car, imageUrl: activePhoto }} className="catalog-model-photo" imageOnly />
        <div className="catalog-model-shade" aria-hidden="true" />
        <div className="catalog-model-title">
          <p className="catalog-eyebrow">{car.brand} · {car.tag || CATEGORY_LABELS[car.type] || car.type} · สั่งผลิต</p>
          <h1>{car.name}</h1>
          <p className="catalog-detail-variant">{trim ? `${trim.name} · ${color?.name ?? ''} · ล้อ ${wheel?.sizeInch ?? '–'}"` : 'เลือกรุ่นย่อย สี และล้อได้เอง'}</p>
        </div>
        <div className="catalog-model-bottom">
          <dl className="catalog-model-stats">
            <div><dt>กำลังสูงสุด</dt><dd>{trim?.horsepower ? <>{trim.horsepower.toLocaleString('th-TH')}<small> แรงม้า</small></> : '—'}</dd></div>
            <div><dt>อัตราสิ้นเปลือง</dt><dd>{trim?.fuelEconomyKml ? <>{trim.fuelEconomyKml}<small> กม./ลิตร</small></> : '—'}</dd></div>
            <div><dt>จำนวนที่นั่ง</dt><dd>{car.seats || '—'}<small> ที่นั่ง</small></dd></div>
          </dl>
          {photos.length > 1 && <div className="catalog-detail-thumbnails catalog-model-thumbs" aria-label="เลือกรูปรถ">{photos.map((photo, index) => <button className={activePhoto === photo ? 'is-active' : ''} key={photo} type="button" onClick={() => setPhotoIndex(index)} aria-label={`ดูรูปที่ ${index + 1}`}><img src={photo} alt={`${car.name} มุมที่ ${index + 1}`} loading="lazy" /></button>)}</div>}
        </div>
        {color && <span className="cfg-hero-color" aria-hidden="true"><i style={{ '--swatch': color.hex }} />{color.name}</span>}
      </section>

      <div className="catalog-model-layout">
        <div className="catalog-model-main">
          <p className="catalog-detail-description">{car.description}</p>

          {loading && <div className="catalog-empty-state"><h3>กำลังโหลดรุ่นย่อย...</h3></div>}
          {error && <div className="catalog-empty-state" role="alert"><h3>โหลดตัวเลือกไม่สำเร็จ</h3><p>{error}</p></div>}

          {trim && (
            <>
              <section className="cfg-step" aria-labelledby="cfg-trim-title">
                <header><span className="cfg-step-no">1</span><div><p className="catalog-eyebrow">TRIM</p><h2 id="cfg-trim-title">เลือกรุ่นย่อย</h2></div></header>
                <div className="cfg-trims" role="radiogroup" aria-label="รุ่นย่อย">
                  {trims.map((item) => (
                    <button key={item.code} type="button" role="radio" aria-checked={item.code === trim.code} className={`cfg-trim${item.code === trim.code ? ' is-active' : ''}`} onClick={() => choose({ trim: item.code })}>
                      <span className="cfg-trim-name">{item.name}</span>
                      <small>{item.tagline}</small>
                      <strong>{formatBaht(item.price)}</strong>
                      <span className="cfg-trim-specs">{item.engine} · {item.horsepower} แรงม้า</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="cfg-step" aria-labelledby="cfg-color-title">
                <header><span className="cfg-step-no">2</span><div><p className="catalog-eyebrow">PAINT</p><h2 id="cfg-color-title">เลือกสี</h2></div><span className="catalog-results-count">{color?.name} · {FINISH_LABELS[color?.finish] || ''}</span></header>
                <div className="cfg-colors" role="radiogroup" aria-label="สีตัวถัง">
                  {allColors.map((item) => {
                    const allowed = item.trims.includes(trim.code);
                    const own = trim.colors.find((option) => option.code === item.code);
                    return (
                      <button key={item.code} type="button" role="radio" aria-checked={item.code === color?.code} disabled={!allowed} className={`cfg-color${item.code === color?.code ? ' is-active' : ''}`} onClick={() => choose({ color: item.code })} title={allowed ? item.name : `เลือกได้กับ ${trimNames(trims, item.trims)}`}>
                        <i style={{ '--swatch': item.hex }} aria-hidden="true" />
                        <span>{item.name}</span>
                        <small>{allowed ? extra(own.priceExtra) : `เฉพาะ ${trimNames(trims, item.trims)}`}</small>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="cfg-step" aria-labelledby="cfg-wheel-title">
                <header><span className="cfg-step-no">3</span><div><p className="catalog-eyebrow">WHEELS</p><h2 id="cfg-wheel-title">เลือกล้อ</h2></div></header>
                <div className="cfg-wheels" role="radiogroup" aria-label="ล้อ">
                  {allWheels.map((item) => {
                    const own = trim.wheels.find((option) => option.code === item.code);
                    return (
                      <button key={item.code} type="button" role="radio" aria-checked={item.code === wheel?.code} disabled={!own} className={`cfg-wheel${item.code === wheel?.code ? ' is-active' : ''}`} onClick={() => choose({ wheel: item.code })}>
                        <b>{item.sizeInch}<small>"</small></b>
                        <span>{item.name.replace(/^\d+"\s*/, '')}</span>
                        <small>{own ? (own.isDefault ? 'มาตรฐานของรุ่นนี้' : extra(own.priceExtra)) : `เฉพาะ ${trimNames(trims, item.trims)}`}</small>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="cfg-step" aria-labelledby="cfg-compare-title">
                <header><span className="cfg-step-no">≡</span><div><p className="catalog-eyebrow">COMPARE</p><h2 id="cfg-compare-title">เทียบ 3 รุ่นย่อย</h2></div></header>
                <div className="cfg-compare-wrap">
                  <table className="cfg-compare">
                    <thead><tr><th scope="col"><span className="sr-only">รายการ</span></th>{trims.map((item) => <th scope="col" key={item.code} className={item.code === trim.code ? 'is-active' : ''}><button type="button" onClick={() => choose({ trim: item.code })}>{item.name}</button></th>)}</tr></thead>
                    <tbody>
                      <tr><th scope="row">ราคา</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}>{formatBaht(item.price)}</td>)}</tr>
                      <tr><th scope="row">เครื่องยนต์</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}>{item.engine}</td>)}</tr>
                      <tr><th scope="row">กำลังสูงสุด</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}>{item.horsepower} แรงม้า</td>)}</tr>
                      <tr><th scope="row">อัตราสิ้นเปลือง</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}>{item.fuelEconomyKml} กม./ลิตร</td>)}</tr>
                      <tr><th scope="row">ระบบส่งกำลัง</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}>{item.transmission}</td>)}</tr>
                      <tr><th scope="row">ล้อมาตรฐาน</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}>{item.defaultWheelSize ? `${item.defaultWheelSize} นิ้ว` : '—'}</td>)}</tr>
                      <tr><th scope="row">สีให้เลือก</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}>{item.colors.length} สี</td>)}</tr>
                      <tr><th scope="row">ได้รับรถประมาณ</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}>{formatDateRange(item.estimatedReady)}</td>)}</tr>
                      <tr><th scope="row">อุปกรณ์เด่น</th>{trims.map((item) => <td key={item.code} className={item.code === trim.code ? 'is-active' : ''}><ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></td>)}</tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          <section className="catalog-detail-lower-grid">
            <div className="catalog-detail-panel"><p className="catalog-eyebrow">HIGHLIGHTS</p><h2>จุดเด่นของ {car.name}</h2><ul>{(car.features || []).map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul><div className="catalog-warranty"><span>การรับประกัน</span><strong>{car.warranty || 'โปรดสอบถามเงื่อนไขผู้จำหน่าย'}</strong></div></div>
            <div className="catalog-detail-panel"><p className="catalog-eyebrow">RECOMMENDED OFFERS</p><h2>โปรโมชันที่แนะนำ</h2>{matchingPromotions.length ? <div className="catalog-detail-promos">{matchingPromotions.map((promo) => <Link to={`/promotions/${encodeURIComponent(promo.id)}`} key={promo.id} className="catalog-detail-promo"><span className="catalog-promo-mini-badge">{promo.badge}</span><strong>{promo.title}</strong><b>{promo.value}</b><small>{promo.description}</small></Link>)}</div> : <p className="catalog-muted">ขณะนี้ยังไม่มีโปรโมชันที่ตรงกับรุ่นนี้ โปรดสอบถามข้อเสนอจากทีมขาย</p>}<Link className="catalog-text-link" to="/promotions">สำรวจโปรโมชันทั้งหมด →</Link></div>
          </section>
        </div>

        <aside className="catalog-order-card cfg-summary" aria-label="สรุปราคารถที่เลือก" aria-busy={quoting}>
          <p className="catalog-eyebrow">YOUR {car.brand}</p>
          <h2>{car.brand} {car.name}{trim ? ` ${trim.name}` : ''}</h2>
          {shownQuote ? (
            <dl className={`cfg-lines${quoting ? ' is-loading' : ''}`}>
              {shownQuote.lines.map((line) => <div key={line.kind}><dt>{line.label}</dt><dd>{Number(line.amount) > 0 || line.kind === 'TRIM' ? formatBaht(line.amount) : 'รวมแล้ว'}</dd></div>)}
            </dl>
          ) : (
            <p className="catalog-muted">{quoteError || 'กำลังคำนวณราคา...'}</p>
          )}
          {quoteError && shownQuote && <p className="cfg-quote-error" role="alert">{quoteError}</p>}
          <div className="cfg-total"><span>ราคารวม</span><strong>{formatBaht(total)}</strong><small>ราคาจากระบบ catalog ยังไม่รวมประกันและส่วนลด</small></div>
          <div className="cfg-eta">
            <span>คาดว่าได้รับรถ</span>
            <strong>{formatDateRange(eta)}</strong>
            <small>ประมาณจากคิวผลิตวันนี้ ช่วงวันจะแคบลงทุกครั้งที่รถผ่านขั้นผลิต</small>
          </div>
          <div className="catalog-detail-actions">
            {selection && !quoteError ? <Action to={requestUrl}>ส่งคำขอซื้อ</Action> : <button type="button" className="s-btn catalog-soldout-btn" disabled>ส่งคำขอซื้อ</button>}
            {Number(car.stock) > 0 && <Action to={testDriveUrl} variant="out">นัดทดลองขับรถโชว์</Action>}
          </div>
          <details className="cfg-finance">
            <summary>คำนวณค่างวดผ่อน</summary>
            <InstallmentCalculator price={String(total)} />
          </details>
          <div className="catalog-trust-notes"><span>✓ สั่งผลิตตามสเปกที่เลือก</span><span>✓ เงินจองสูงสุด ฿50,000</span><span>✓ เลื่อนส่งมอบเกิน 30 วัน ยกเลิกได้ คืนเงินจองเต็มจำนวน</span></div>
        </aside>
      </div>
      <p className="catalog-demo-note">ราคา สเปก และวันรับรถเป็นข้อมูลสาธิตของ TOYOTY ไม่ใช่ใบเสนอราคาจริง</p>
    </div>
  );
}
