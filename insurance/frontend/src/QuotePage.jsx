import { useEffect, useRef, useState } from 'react';
import {
  CarFront,
  Check,
  ShieldCheck,
  SlidersHorizontal,
  FileCheck2,
  RotateCcw,
  Download,
  BadgePercent,
  ChevronDown,
} from 'lucide-react';
import { request, money, toyotyUrl } from './api.js';
import { State } from './components.jsx';
import './quote.css';

const steps = ['เลือกรถ', 'เลือกสเปก', 'เปรียบเทียบแผน', 'สรุปราคา'];
const baht = (value) => Number(value).toLocaleString('th-TH');
const initial = {
  modelSlug: '',
  trimCode: 'ECO',
  colorCode: 'white',
  wheelCode: 'standard',
};

function Choice({ selected, children, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`quote-choice ${selected ? 'selected' : ''} ${className}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
      {selected && (
        <Check className="choice-check" size={19} aria-hidden="true" />
      )}
    </button>
  );
}
function Coverage({ plan }) {
  return (
    <dl className="quote-coverage">
      <div>
        <dt>ซ่อมรถเรา</dt>
        <dd>
          {plan.collisionLimit
            ? `${baht(plan.collisionLimit)} บาท`
            : 'ไม่คุ้มครอง'}
        </dd>
      </div>
      <div>
        <dt>สูญหาย / ไฟไหม้</dt>
        <dd>
          {plan.fireTheftLimit
            ? `${baht(plan.fireTheftLimit)} บาท`
            : 'ไม่คุ้มครอง'}
        </dd>
      </div>
      <div>
        <dt>ทรัพย์สินคู่กรณี</dt>
        <dd>1,000,000 บาท/ครั้ง</dd>
      </div>
      <div>
        <dt>ชนเอง / น้ำท่วม</dt>
        <dd>
          {plan.slug === 'signature' ? 'ตามทุนและเงื่อนไข' : 'ไม่คุ้มครอง'}
        </dd>
      </div>
    </dl>
  );
}
export default function QuotePage({ source }) {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [config, setConfig] = useState(initial);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState('signature');
  const titleRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    request('/quotes/catalog', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setCatalog(data);
          setCatalogError('');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setCatalogError(err.message);
      });
    return () => controller.abort();
  }, [attempt]);
  const configKey = JSON.stringify({ ...config, source });
  const shouldQuote = step >= 2;
  useEffect(() => {
    if (!shouldQuote) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    request('/quotes', {
      method: 'POST',
      body: JSON.parse(configKey),
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ ...data, key: configKey });
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [configKey, shouldQuote, attempt]);
  useEffect(() => {
    titleRef.current?.focus();
  }, [step]);
  const update = (patch) => {
    setConfig((value) => ({ ...value, ...patch }));
    setResult(null);
  };
  const model = catalog?.models.find((item) => item.slug === config.modelSlug);
  const trimIndex =
    catalog?.trims.findIndex((item) => item.code === config.trimCode) ?? 0;
  const trim = catalog?.trims[trimIndex];
  const color = catalog?.colors.find((item) => item.code === config.colorCode);
  const value = model
    ? model.prices[trimIndex] +
      (color?.extra || 0) +
      (config.wheelCode === 'upgrade' ? trim.extra : 0)
    : 0;
  const quote = result?.key === configKey ? result : null;
  const plan = quote?.plans.find((item) => item.slug === selectedSlug);
  function download() {
    if (!plan) return;
    const text = [
      'NOVA INSURE · ใบสรุปราคาสาธิต',
      'ไม่มีความคุ้มครองจริง ไม่ใช่กรมธรรม์',
      `รถ: TOYOTY ${model.name} ${trim.name}`,
      `สี: ${color.name} · ล้อ: ${quote.vehicle.wheelName}`,
      `มูลค่ารถ: ${baht(value)} บาท`,
      `แผน: ${plan.name} · ${plan.insuranceType}`,
      `ทุนประกันตัวรถ: ${baht(plan.sumInsured)} บาท`,
      `วงเงินชนรถเรา: ${baht(plan.collisionLimit)} บาท`,
      `สูญหาย/ไฟไหม้: ${baht(plan.fireTheftLimit)} บาท`,
      `เบี้ยก่อนลด: ${money(plan.originalAmount)} บาท`,
      `ส่วนลด: ${money(plan.discountAmount)} บาท`,
      `ยอดสุทธิ: ${money(plan.finalAmount)} บาท/ปี`,
      'ซ่อมอู่ · ส่วนแรกสมัครใจ 0 บาท · ไม่รวม พ.ร.บ.',
      `กติกา: ${quote.ratingVersion}`,
      'ราคาอ้างอิงตามสเปกที่เลือก Seller จะตรวจรถจริงและยืนยันราคาอีกครั้ง',
      'ซื้อพร้อมรถผ่าน Seller หลังชำระครบ รอแอดมิน NOVA อนุมัติ',
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob(['\ufeff', text], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `NOVA-${model.slug}-${trim.code}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!catalog)
    return (
      <div className="container">
        <State
          loading={!catalogError}
          error={catalogError}
          retry={() => setAttempt((v) => v + 1)}
        />
      </div>
    );
  return (
    <div className="quote-page">
      <div className="container">
        <div className="quote-heading">
          <span className="eyebrow">YOUR CAR. YOUR COVER.</span>
          <h1>
            ประกันที่พอดี
            <br className="quote-mobile-break" />
            กับรถของคุณ
          </h1>
          <p>เลือกสเปกที่ใช่ เปรียบเทียบความคุ้มครอง แล้วดูราคาของคุณ</p>
        </div>
        <ol className="quote-steps" aria-label="ขั้นตอนขอราคา">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={step === index ? 'step' : undefined}
              className={
                step === index ? 'current' : step > index ? 'done' : ''
              }
            >
              <button
                type="button"
                disabled={index >= step}
                onClick={() => setStep(index)}
              >
                <span>{step > index ? <Check size={17} /> : index + 1}</span>
                <b>{label}</b>
              </button>
            </li>
          ))}
        </ol>
        <div className="quote-layout" id="plans">
          <section className="quote-panel" aria-busy={loading}>
            <div className="quote-section-title">
              <span className="quote-kicker">ขั้นตอน {step + 1} จาก 4</span>
              <h2 tabIndex={-1} ref={titleRef}>
                {
                  [
                    'คุณขับ TOYOTY รุ่นไหน?',
                    'เติมรายละเอียดให้ตรงกับรถคุณ',
                    'เลือกความอุ่นใจในแบบคุณ',
                    'ราคาประกันสำหรับรถของคุณ',
                  ][step]
                }
              </h2>
              <p>
                {
                  [
                    'เลือกจากรุ่นรถที่ร่วมรายการกับ NOVA',
                    'ราคาและทุนประกันเปลี่ยนตามรุ่นย่อย สี และล้อ',
                    'เบี้ยรายปีรวมภาษีและอากรในยอดเดโมแล้ว ไม่รวม พ.ร.บ.',
                    'ตรวจสอบสเปก แล้วเก็บสรุปไว้แจ้ง Seller เพื่อซื้อพร้อมรถ',
                  ][step]
                }
              </p>
            </div>
            {step === 0 && (
              <>
                <div className="quote-model-picker">
                  <label htmlFor="quote-model">รุ่นรถยนต์</label>
                  <div className="quote-select-wrap">
                    <CarFront size={22} aria-hidden="true" />
                    <select
                      id="quote-model"
                      value={config.modelSlug}
                      onChange={(event) =>
                        update({ modelSlug: event.target.value })
                      }
                    >
                      <option value="">เลือกรุ่นรถยนต์ของคุณ</option>
                      {catalog.models.map((item) => (
                        <option key={item.slug} value={item.slug}>
                          TOYOTY {item.name} · {item.type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={19} aria-hidden="true" />
                  </div>
                  {model && (
                    <div className="quote-selected-model">
                      <strong>TOYOTY {model.name}</strong>
                      <span>
                        {model.type} · ราคาเริ่มต้น ฿{baht(model.prices[0])}
                      </span>
                    </div>
                  )}
                </div>
                <p className="quote-note">รถ TOYOTY ปี 2026 · ใช้ส่วนบุคคล</p>
              </>
            )}
            {step === 1 && (
              <>
                <fieldset className="quote-fieldset">
                  <legend>รุ่นย่อย</legend>
                  <div className="quote-trims">
                    {catalog.trims.map((item, index) => (
                      <Choice
                        key={item.code}
                        selected={config.trimCode === item.code}
                        onClick={() =>
                          update({
                            trimCode: item.code,
                            colorCode:
                              config.colorCode === 'sport-red' &&
                              item.code !== 'HIGH_PERFORMANCE'
                                ? 'white'
                                : config.colorCode,
                            wheelCode: 'standard',
                          })
                        }
                      >
                        <strong>{item.name}</strong>
                        <span className="quote-small">{item.description}</span>
                        <span>{model.horsepower[index]} แรงม้า</span>
                        <b>฿{baht(model.prices[index])}</b>
                      </Choice>
                    ))}
                  </div>
                </fieldset>
                <div className="quote-option-field">
                  <label htmlFor="quote-color">สีตัวถัง</label>
                  <div className="quote-select-wrap">
                    <select
                      id="quote-color"
                      className="quote-option-select"
                      value={config.colorCode}
                      onChange={(event) =>
                        update({ colorCode: event.target.value })
                      }
                    >
                      {catalog.colors
                        .filter(
                          (item) => !item.trim || item.trim === config.trimCode,
                        )
                        .map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name} ·{' '}
                            {item.extra
                              ? `+฿${baht(item.extra)}`
                              : 'รวมในราคารถ'}
                          </option>
                        ))}
                    </select>
                    <ChevronDown size={19} aria-hidden="true" />
                  </div>
                </div>
                <div className="quote-option-field">
                  <label htmlFor="quote-wheel">ล้อ</label>
                  <div className="quote-select-wrap">
                    <select
                      id="quote-wheel"
                      className="quote-option-select"
                      value={config.wheelCode}
                      onChange={(event) =>
                        update({ wheelCode: event.target.value })
                      }
                    >
                      {['standard', 'upgrade'].map((code) => (
                        <option key={code} value={code}>
                          {code === 'standard' ? trim.wheel : trim.upgrade} ·{' '}
                          {code === 'standard'
                            ? 'รวมในราคารุ่นย่อยแล้ว'
                            : `+฿${baht(trim.extra)}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={19} aria-hidden="true" />
                  </div>
                </div>
                <div className="quote-info">
                  <SlidersHorizontal size={20} />
                  <p>
                    สีและล้อรวมในมูลค่ารถครั้งเดียว รุ่น High Performance
                    มีปัจจัยสมรรถนะเพิ่ม 15% สำหรับชั้น 1, 2+ และ 3+
                  </p>
                </div>
              </>
            )}
            {step >= 2 && loading && <State loading />}
            {step >= 2 && error && (
              <State error={error} retry={() => setAttempt((v) => v + 1)} />
            )}
            {step === 2 && quote && (
              <>
                <div className="quote-plans">
                  {[...quote.plans].reverse().map((item) => (
                    <Choice
                      key={item.id}
                      selected={selectedSlug === item.slug}
                      onClick={() => setSelectedSlug(item.slug)}
                      className="quote-plan"
                    >
                      <div className="quote-plan-top">
                        <span>{item.insuranceType}</span>
                        {item.slug === 'signature' && <em>คุ้มครองครบกว่า</em>}
                      </div>
                      <h3>{item.name}</h3>
                      <p className="quote-plan-price">
                        ฿{money(item.finalAmount)}
                        <small>/ ปี</small>
                      </p>
                      {item.discountAmount > 0 && (
                        <span className="quote-small">
                          จาก ฿{money(item.originalAmount)} · ลด ฿
                          {money(item.discountAmount)}
                        </span>
                      )}
                      <Coverage plan={item} />
                      <span className="quote-plan-select">
                        {selectedSlug === item.slug
                          ? 'เลือกแผนนี้แล้ว'
                          : 'เลือกแผนนี้'}
                      </span>
                    </Choice>
                  ))}
                </div>
                <div className="quote-conditions" id="comparison">
                  <h3>เงื่อนไขที่ควรรู้ก่อนเลือก</h3>
                  <p>
                    ชั้น 2+ และ 3+ คุ้มครองรถเราเฉพาะรถชนรถตามเงื่อนไข
                    วงเงินสูงสุด 200,000 บาท ส่วนชั้น 2+
                    แยกทุนสูญหาย/ไฟไหม้ตามมูลค่ารถ
                  </p>
                  <p>
                    ทุกแผน: บุคคลภายนอก 500,000 บาท/คน สูงสุด 10 ล้านบาท/ครั้ง ·
                    ทรัพย์สิน 1 ล้านบาท/ครั้ง · ซ่อมอู่ · ส่วนแรกสมัครใจ 0 บาท
                  </p>
                </div>
              </>
            )}
            {step === 3 && plan && (
              <div className="quote-result">
                <div className="quote-result-badge">
                  <FileCheck2 size={34} />
                </div>
                <p className="quote-kicker">
                  {plan.insuranceType} · {plan.name}
                </p>
                <h3>พร้อมสำหรับเส้นทางของคุณ</h3>
                <p className="quote-result-price">
                  ฿{money(plan.finalAmount)}
                  <small>/ ปี</small>
                </p>
                <Coverage plan={plan} />
                <div className="quote-info">
                  <ShieldCheck size={22} />
                  <p>
                    นี่คือสรุปราคาสาธิต ยังไม่ได้ส่งคำขอซื้อหรือออกกรมธรรม์
                    ดาวน์โหลดสรุปเพื่อแจ้ง Seller
                    ซึ่งจะตรวจรถจริงและยืนยันราคาอีกครั้ง
                  </p>
                </div>
                <div className="quote-result-actions">
                  <button className="button" onClick={download}>
                    <Download size={18} /> ดาวน์โหลดสรุปราคา
                  </button>
                  <a className="button secondary" href={toyotyUrl()}>
                    ไป TOYOTY เพื่อติดต่อ Seller
                  </a>
                </div>
                <p className="quote-note">
                  ซื้อพร้อมรถผ่าน Seller · ชำระครบแล้วรอ NOVA อนุมัติ ·
                  ติดตามในเมนูประกันของฉัน
                </p>
              </div>
            )}
            <div className="quote-navigation">
              {step > 0 ? (
                <button
                  className="quote-back"
                  onClick={() => setStep((s) => s - 1)}
                >
                  ย้อนกลับ
                </button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <button
                  className="button"
                  disabled={!model || (step === 2 && (!plan || loading))}
                  onClick={() => setStep((s) => s + 1)}
                >
                  {
                    [
                      'เลือกรุ่นย่อยและออปชัน',
                      'ดูราคาประกันของฉัน',
                      'ตรวจสอบแผนที่เลือก',
                    ][step]
                  }
                </button>
              ) : (
                <button className="quote-back" onClick={() => setStep(2)}>
                  เปรียบเทียบแผนอีกครั้ง
                </button>
              )}
            </div>
          </section>
          <aside className="quote-sidebar" aria-label="สรุปรถและราคา">
            <div className="quote-summary-head">
              <CarFront size={22} />
              <h2>รถของคุณ</h2>
            </div>
            {model ? (
              <>
                <h3>TOYOTY {model.name}</h3>
                <p>{trim.name} · ปี 2026</p>
                <dl className="quote-summary-lines">
                  <div>
                    <dt>สี</dt>
                    <dd>{color.name}</dd>
                  </div>
                  <div>
                    <dt>ล้อ</dt>
                    <dd>
                      {config.wheelCode === 'upgrade'
                        ? trim.upgrade
                        : trim.wheel}
                    </dd>
                  </div>
                  <div>
                    <dt>ราคารุ่นย่อย</dt>
                    <dd>฿{baht(model.prices[trimIndex])}</dd>
                  </div>
                  {color.extra > 0 && (
                    <div>
                      <dt>ค่าสีเพิ่ม</dt>
                      <dd>฿{baht(color.extra)}</dd>
                    </div>
                  )}
                  {config.wheelCode === 'upgrade' && (
                    <div>
                      <dt>ค่าล้อเพิ่ม</dt>
                      <dd>฿{baht(trim.extra)}</dd>
                    </div>
                  )}
                  <div className="quote-summary-total">
                    <dt>มูลค่ารถรวม</dt>
                    <dd>฿{baht(value)}</dd>
                  </div>
                </dl>
                {plan && (
                  <div className="quote-sidebar-premium">
                    <span>
                      {plan.insuranceType} · {plan.name}
                    </span>
                    <strong>
                      ฿{money(plan.finalAmount)}
                      <small>/ ปี</small>
                    </strong>
                    {plan.sumInsured > 0 && (
                      <p>ทุนประกัน ฿{baht(plan.sumInsured)}</p>
                    )}
                    {plan.discountAmount > 0 && (
                      <p>ส่วนลด TOYOTY ฿{money(plan.discountAmount)}</p>
                    )}
                  </div>
                )}
                <button className="quote-edit" onClick={() => setStep(0)}>
                  <RotateCcw size={15} /> เปลี่ยนรถ
                </button>
              </>
            ) : (
              <p>
                เลือกประเภทรถเพื่อเริ่มต้น
                <br />
                เราจะแสดงรายละเอียดไว้ตรงนี้
              </p>
            )}
            <div className="quote-summary-footer">
              <ShieldCheck size={18} />
              <span>
                คำนวณราคาเฉพาะสเปกรถ
                <br />
                ไม่ต้องกรอกข้อมูลส่วนตัวเพื่อดูราคา
              </span>
            </div>
          </aside>
        </div>
        <section className="quote-benefits" id="benefits">
          <div>
            <ShieldCheck />
            <h3>ความคุ้มครองที่เข้าใจง่าย</h3>
            <p>เห็นวงเงินและเงื่อนไขก่อนเลือก</p>
          </div>
          <div>
            <SlidersHorizontal />
            <h3>ราคาเปลี่ยนตามรถคุณ</h3>
            <p>คิดจากรุ่นย่อยและออปชันจริง</p>
          </div>
          <div>
            <BadgePercent />
            <h3>สิทธิพิเศษ TOYOTY</h3>
            <p>เข้าผ่าน TOYOTY ลด 5% สูงสุด 1,000 บาท</p>
          </div>
        </section>
        <section className="quote-method" id="how-it-works">
          <h2>ราคานี้คำนวณอย่างไร?</h2>
          <p>
            ทุนชั้น 1 และทุนสูญหาย/ไฟไหม้ชั้น 2+ เท่ากับ 80% ของมูลค่ารถ
            ปัดลงหลักหมื่น เบี้ยคำนวณตามกลุ่มรถและรุ่นย่อย
            ออปชันมาตรฐานรวมในราคารถแล้ว
          </p>
        </section>
      </div>
    </div>
  );
}
