import { useEffect, useRef, useState } from 'react';
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  ShieldCheck,
  Check,
  CheckCircle2,
  FileCheck2,
  BadgeCheck,
  MousePointer2,
  Sparkles,
  Menu,
  X,
  LockKeyhole,
  CarFront,
  UserRound,
} from 'lucide-react';
import { request, money, toyotyUrl } from './api.js';
// Insurance: separate NOVA admin and closed direct-purchase notice.
import AdminPage from './AdminPage.jsx';
import PartnerPurchaseNotice from './PartnerPurchaseNotice.jsx';
import QuotePage from './QuotePage.jsx';
import {
  Logo,
  DemoNotice,
  State,
  Steps,
  Summary,
  CarVisual,
} from './components.jsx';

function useSource() {
  const { search } = useLocation();
  return new URLSearchParams(search).get('source') === 'toyoty'
    ? 'toyoty'
    : 'direct';
}
const suffix = (source) => (source === 'toyoty' ? '?source=toyoty' : '');
function useResource(path, token) {
  const [state, setState] = useState({ path: null, data: null, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    request(path, { token, signal: controller.signal })
      .then((data) => setState({ path, data, error: '' }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ path, data: null, error: error.message });
      });
    return () => controller.abort();
  }, [path, token, attempt]);
  return {
    ...(state.path === path ? state : { data: null, error: '' }),
    retry: () => {
      setState({ path: null, data: null, error: '' });
      setAttempt((value) => value + 1);
    },
  };
}
function Header({ source }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const home = '/' + suffix(source);
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Logo to={home} />
        <button
          className="menu-toggle"
          aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          aria-label="เมนูหลัก"
          className={open ? 'nav-links open' : 'nav-links'}
          onClick={() => setOpen(false)}
        >
          <Link to={home + '#plans'}>ขอราคาประกัน</Link>
          <Link to={home + '#benefits'}>ทำไมเลือก NOVA</Link>
          <Link to={home + '#how-it-works'}>วิธีคำนวณราคา</Link>
          <Link className="button small" to={home + '#plans'}>
            เช็กราคาของคุณ
          </Link>
          {/* Insurance: NOVA administrators have a separate login. */}
          <Link to="/admin">ผู้ดูแล NOVA</Link>
        </nav>
      </div>
      {location.pathname !== '/' && (
        <div className="container breadcrumb">
          <Link to={home}>หน้าแรก</Link> /{' '}
          {location.pathname.startsWith('/buy/')
            ? 'ทำรายการสาธิต'
            : 'ใบรับรายการ'}
        </div>
      )}
    </header>
  );
}
function Home({ source }) {
  const { data: plans, error, retry } = useResource('/plans' + suffix(source));
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-line" /> INSURANCE, SIMPLIFIED.
            </span>
            <h1>
              ทุกการเดินทาง
              <br />
              มั่นใจได้<span>มากกว่า</span>
            </h1>
            <p className="hero-sub">
              ประกันรถยนต์ที่เลือกง่าย คุ้มครองอย่างเข้าใจ
              <br className="desktop" /> พร้อมแผนที่เหมาะกับทุกการเดินทาง
            </p>
            <div className="actions">
              <a className="button" href="#plans">
                เลือกแผนประกัน
              </a>
              <a className="button secondary" href="#comparison">
                ดูความคุ้มครอง
              </a>
            </div>
            <div className="hero-note">
              <ShieldCheck size={20} />
              เลือกง่าย ราคาโปร่งใส อุ่นใจในทุกกิโลเมตร
            </div>
          </div>
          <CarVisual />
        </div>
        <div className="container partner-line">
          <span>เดินทางไปด้วยกัน กับพาร์ทเนอร์ของเรา</span>
          <b>TOYOTY</b>
          <span className="partner-divider" />
          <span>Insurance Partner</span>
          <span className="partner-end">
            <BadgeCheck size={19} /> ออกแบบเพื่อการสาธิต
          </span>
        </div>
      </section>
      <div className="container">
        {source === 'toyoty' && (
          <div className="partner-banner">
            <Sparkles size={25} />
            <div>
              <strong>Welcome TOYOTY Customer</strong>
              <p>
                รับข้อเสนอพิเศษจากพันธมิตรของเรา — ส่วนลดสาธิต 5% สูงสุด 1,000
                บาท คำนวณโดยระบบเมื่อเลือกแผน
              </p>
            </div>
            <a href="#plans">ดูแผนประกัน</a>
          </div>
        )}
        <section id="benefits" className="benefits">
          {[
            [MousePointer2, 'เลือกแผนง่าย', '4 แผนที่เข้าใจได้ในไม่กี่นาที'],
            [BadgeCheck, 'ราคาแสดงชัดเจน', 'ตรวจสอบยอดสุทธิก่อนยืนยัน'],
            [ShieldCheck, 'สมัครผ่านเว็บไซต์', 'สะดวกทุกที่ ทุกอุปกรณ์'],
            [FileCheck2, 'กรมธรรม์สาธิตออนไลน์', 'รับเลขกรมธรรม์จำลองทันที'],
          ].map(([Icon, title, desc]) => (
            <article key={title}>
              <span className="benefit-icon">
                <Icon size={25} />
              </span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </section>
        <section id="plans" className="section">
          <div className="section-heading">
            <span className="eyebrow">FIND YOUR PERFECT COVER</span>
            <h2>ความอุ่นใจ ที่คุณเลือกได้</h2>
            <p>
              เลือกแผนที่เข้ากับรถและการใช้ชีวิตของคุณ ราคาสาธิตต่อปี
              ไม่มีค่าใช้จ่ายจริง
            </p>
          </div>
          {!plans ? (
            <State
              loading={!error}
              error={error}
              retry={error ? retry : undefined}
            />
          ) : plans.length === 0 ? (
            <State error="ยังไม่มีแผนประกันที่เปิดให้เลือก" retry={retry} />
          ) : (
            <div className="plan-grid">
              {plans.map((plan, i) => (
                <article
                  key={plan.id}
                  className={
                    'plan-card' + (plan.isRecommended ? ' recommended' : '')
                  }
                >
                  {plan.isRecommended && (
                    <span className="recommend">
                      <Sparkles size={14} /> แนะนำ
                    </span>
                  )}
                  <span className="plan-number">NOVA / 0{i + 1}</span>
                  <h3>{plan.name}</h3>
                  <span className="plan-type">{plan.insuranceType}</span>
                  <p className="plan-description">{plan.description}</p>
                  <div className="plan-price">
                    {plan.discountAmount > 0 && (
                      <del>฿{money(plan.originalAmount)}</del>
                    )}
                    <div>
                      <b>฿{money(plan.finalAmount).replace('.00', '')}</b>
                      <span>/ ปี</span>
                    </div>
                    <small>
                      ราคาเริ่มต้นสาธิต
                      {source === 'toyoty' ? ' หลังส่วนลด TOYOTY' : ''}
                    </small>
                  </div>
                  <Link
                    className={
                      'button ' + (plan.isRecommended ? '' : 'secondary')
                    }
                    to={'/buy/' + plan.id + suffix(source)}
                  >
                    {/* Insurance: direct checkout is replaced by partner instructions. */}
                    ซื้อพร้อมรถผ่าน Seller
                  </Link>
                  <div className="coverage-title">ความคุ้มครองตัวอย่าง</div>
                  <ul className="coverage-list">
                    {plan.coverage.highlights.map((item) => (
                      <li key={item}>
                        <Check size={16} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a className="text-link" href="#comparison">
                    เปรียบเทียบความคุ้มครอง
                  </a>
                </article>
              ))}
            </div>
          )}
          <DemoNotice />
        </section>
        <section id="comparison" className="section comparison-section">
          <div className="section-heading">
            <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span>
            <h2>เปรียบเทียบให้ชัด ก่อนตัดสินใจ</h2>
            <p>
              รายละเอียดความคุ้มครองตัวอย่าง
              เพื่อช่วยให้เข้าใจความแตกต่างของแต่ละแผน
            </p>
          </div>
          {plans?.length > 0 && (
            <div
              className="table-scroll"
              tabIndex={0}
              aria-label="ตารางเปรียบเทียบ เลื่อนแนวนอนเพื่อดูทุกแผน"
            >
              <table>
                <caption className="sr-only">
                  เปรียบเทียบความคุ้มครองจำลองทั้ง 4 แผน
                </caption>
                <thead>
                  <tr>
                    <th scope="col">ความคุ้มครอง</th>
                    {plans.map((p) => (
                      <th scope="col" key={p.id}>
                        {p.name}
                        <small>{p.insuranceType}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['thirdParty', 'ความรับผิดต่อบุคคลภายนอก'],
                    ['ownCollision', 'รถผู้เอาประกันจากอุบัติเหตุ*'],
                    ['fireTheft', 'ไฟไหม้และโจรกรรม*'],
                    ['flood', 'น้ำท่วมตามเงื่อนไข*'],
                  ].map(([key, label]) => (
                    <tr key={key}>
                      <th scope="row">{label}</th>
                      {plans.map((p) => (
                        <td key={p.id}>
                          {p.coverage[key] ? (
                            <CheckCircle2
                              className="table-check"
                              aria-label="มีตามเงื่อนไขสาธิต"
                              size={20}
                            />
                          ) : (
                            <span aria-label="ไม่มี">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted">
            * ชั้น 3+ และ 2+ จำกัดกรณีชนกับยานพาหนะทางบกตามเงื่อนไข ชั้น 1
            มีขอบเขตอุบัติเหตุกว้างกว่า ตารางนี้ไม่ใช่เอกสารความคุ้มครองจริง
          </p>
        </section>
        <section id="how-it-works" className="section">
          <div className="section-heading">
            <span className="eyebrow">SIMPLE FROM START TO FINISH</span>
            <h2>เริ่มต้นง่าย ใน 4 ขั้นตอน</h2>
          </div>
          <div className="how-grid">
            {[
              // Insurance: public instructions follow the seller-assisted purchase flow.
              [
                ShieldCheck,
                'เลือกแผนผ่าน Seller',
                'เลือกแพ็กเกจ NOVA เมื่อซื้อรถกับ TOYOTY',
              ],
              [
                CarFront,
                'ระบุวันส่งมอบ',
                'Seller บันทึกข้อมูลรถ ผู้เอาประกัน และวันเริ่มคุ้มครอง',
              ],
              [
                MousePointer2,
                'ชำระครบที่ TOYOTY',
                'ระบบส่งคำขอให้ NOVA รอแอดมินอนุมัติ',
              ],
              [
                FileCheck2,
                'ดูกรมธรรม์',
                'หลังอนุมัติ ดูที่ประกันของฉันใน TOYOTY คุ้มครอง 1 ปีจากวันส่งมอบ',
              ],
            ].map(([Icon, title, text], i) => (
              <article key={title}>
                <span className="how-icon">
                  <Icon size={28} />
                  <small>{i + 1}</small>
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="closing">
          <div>
            <span className="eyebrow">YOUR NEXT JOURNEY STARTS HERE</span>
            <h2>
              เส้นทางข้างหน้า
              <br />
              ให้ความอุ่นใจไปกับคุณ
            </h2>
            <p>เลือกแผนประกันจำลองที่ใช่ ในแบบที่เป็นคุณ</p>
          </div>
          <a className="button white" href="#plans">
            เลือกแผนประกัน
          </a>
        </section>
      </div>
    </>
  );
}
const fields = [
  {
    name: 'fullName',
    label: 'ชื่อ-นามสกุล',
    autoComplete: 'name',
    maxLength: 150,
    placeholder: 'ชื่อและนามสกุลผู้เอาประกัน',
  },
  {
    name: 'phone',
    label: 'เบอร์โทรศัพท์',
    type: 'tel',
    autoComplete: 'tel',
    maxLength: 10,
    pattern: '0[0-9]{8,9}',
    placeholder: '0812345678',
  },
  {
    name: 'email',
    label: 'อีเมล',
    type: 'email',
    autoComplete: 'email',
    maxLength: 254,
    placeholder: 'you@example.com',
  },
  {
    name: 'brand',
    label: 'ยี่ห้อรถ',
    maxLength: 80,
    placeholder: 'เช่น Toyota',
  },
  {
    name: 'model',
    label: 'รุ่นรถ',
    maxLength: 100,
    placeholder: 'เช่น Yaris Ativ',
  },
  {
    name: 'year',
    label: 'ปีรถ (ค.ศ.)',
    type: 'number',
    min: 1950,
    max: new Date().getFullYear() + 1,
    placeholder: '2026',
  },
  {
    name: 'registrationNumber',
    label: 'ทะเบียนรถ (ไม่บังคับ)',
    maxLength: 30,
    placeholder: 'เว้นว่างได้ หากยังไม่มีทะเบียน',
    optional: true,
  },
];
function Checkout({ source }) {
  const { planId } = useParams();
  const {
    data: plan,
    error: loadError,
    retry,
  } = useResource('/plans/' + encodeURIComponent(planId) + suffix(source));
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState([]);
  const locked = useRef(false);
  // Keep the id after a timeout/refresh so retry cannot issue another policy.
  async function submit(event) {
    event.preventDefault();
    if (locked.current) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const key = 'nova:request:' + planId + ':' + source;
    const receiptKey = 'nova:completed:' + planId + ':' + source;
    locked.current = true;
    setBusy(true);
    setError('');
    setDetails([]);
    try {
      const previous = sessionStorage.getItem(receiptKey);
      if (previous && sessionStorage.getItem('nova:receipt:' + previous)) {
        navigate('/success/' + previous + suffix(source));
        return;
      }
      const clientRequestId =
        sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, clientRequestId);
      // Verify browser storage works before sending a request that returns a secret.
      sessionStorage.setItem('nova:storage-check', 'ok');
      sessionStorage.removeItem('nova:storage-check');
      const result = await request('/purchases', {
        method: 'POST',
        body: {
          planId,
          customer: {
            fullName: values.fullName,
            phone: values.phone,
            email: values.email,
          },
          vehicle: {
            brand: values.brand,
            model: values.model,
            year: Number(values.year),
            registrationNumber: values.registrationNumber,
          },
          source,
          clientRequestId,
        },
      });
      sessionStorage.setItem(
        'nova:receipt:' + result.policyId,
        result.receiptToken,
      );
      sessionStorage.setItem(receiptKey, result.policyId);
      navigate('/success/' + result.policyId + suffix(source));
    } catch (err) {
      setError(
        err.name === 'SecurityError' || err.name === 'QuotaExceededError'
          ? 'กรุณาอนุญาตพื้นที่จัดเก็บสำหรับแท็บนี้ก่อนทำรายการ'
          : err.message,
      );
      setDetails(err.details || []);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (!plan)
    return (
      <div className="container">
        <State
          loading={!loadError}
          error={loadError}
          retry={loadError ? retry : undefined}
        />
      </div>
    );
  return (
    <div className="container checkout">
      <Steps />
      <div className="page-title">
        <span className="eyebrow">ONE STEP CLOSER TO PEACE OF MIND</span>
        <h1>ความอุ่นใจ เริ่มจากตรงนี้</h1>
        <p>กรอกข้อมูลเพื่อรับเลขกรมธรรม์จำลอง ใช้เวลาเพียงไม่กี่นาที</p>
      </div>
      <div className="checkout-grid">
        <form className="panel checkout-form" onSubmit={submit}>
          <h2>
            <UserRound size={22} />
            ข้อมูลผู้เอาประกัน
          </h2>
          <p className="muted">
            ใช้ข้อมูลตัวอย่างได้ ไม่ต้องกรอกเลขบัตรประชาชนหรือเอกสารส่วนตัว
          </p>
          <div className="form-grid">
            {fields.map(({ name, label, optional, ...props }, i) => (
              <div
                key={name}
                className={
                  i === 0 || i === 3 || i === 6 ? 'field wide' : 'field'
                }
              >
                {i === 3 && (
                  <h2 className="vehicle-heading">
                    <CarFront size={22} />
                    ข้อมูลรถ
                  </h2>
                )}
                <label htmlFor={name}>
                  {label}
                  {!optional && <span aria-hidden="true"> *</span>}
                </label>
                <input
                  id={name}
                  name={name}
                  required={!optional}
                  {...props}
                  aria-invalid={
                    details.some((d) => d.field.endsWith('.' + name)) ||
                    undefined
                  }
                  aria-describedby={
                    details.some((d) => d.field.endsWith('.' + name))
                      ? name + '-error'
                      : undefined
                  }
                />
                {details
                  .filter((d) => d.field.endsWith('.' + name))
                  .map((d) => (
                    <small
                      id={name + '-error'}
                      className="field-error"
                      key={d.field}
                    >
                      {d.message}
                    </small>
                  ))}
              </div>
            ))}
          </div>
          <label className="consent">
            <input type="checkbox" required />
            <span>
              ฉันเข้าใจว่ารายการนี้เป็นการจำลองเพื่อการศึกษา
              ไม่มีการชำระเงินหรือความคุ้มครองจริง
              และข้อมูลจะถูกบันทึกในระบบสาธิต
            </span>
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="button submit" type="submit" disabled={busy}>
            {busy ? 'กำลังบันทึกรายการ…' : 'ยืนยันซื้อประกัน (สาธิต)'}
          </button>
          <p className="secure-note">
            <LockKeyhole size={15} />
            ใบรับรายการเปิดได้เฉพาะแท็บที่ทำรายการ กรุณาเก็บแท็บนี้ไว้
          </p>
        </form>
        <Summary plan={plan} source={source} />
      </div>
      <DemoNotice />
    </div>
  );
}
function Success() {
  const { policyId } = useParams();
  let token;
  try {
    token = sessionStorage.getItem('nova:receipt:' + policyId);
  } catch {
    /* Access will be denied by the API. */
  }
  const { data, error, retry } = useResource(
    '/policies/' + encodeURIComponent(policyId),
    token,
  );
  if (!data)
    return (
      <div className="container">
        <State
          loading={!error}
          error={error}
          retry={error ? retry : undefined}
        />
        <div className="center">
          <Link to="/" className="button secondary">
            กลับหน้าแรก NOVA INSURE
          </Link>
        </div>
      </div>
    );
  return (
    <div className="container success">
      <Steps success />
      <div className="success-intro">
        <span className="success-icon">
          <Check size={44} />
        </span>
        <span className="eyebrow">THANK YOU FOR EXPLORING NOVA</span>
        <h1>รับคำขอซื้อประกันสาธิตสำเร็จ</h1>
        <p>บันทึกรายการของคุณเรียบร้อยแล้ว นี่คือรายละเอียดกรมธรรม์จำลอง</p>
      </div>
      <article className="panel receipt">
        <div className="receipt-head">
          <Logo to={'/' + suffix(data.source)} />
          <span className="status">ISSUED_DEMO</span>
        </div>
        <h2>กรมธรรม์จำลอง</h2>
        <p className="muted">
          ไม่มีความคุ้มครองจริง · ใช้เพื่อการศึกษาเท่านั้น
        </p>
        <div className="policy-number">
          <span>เลขกรมธรรม์จำลอง</span>
          <strong>{data.policyNumber}</strong>
        </div>
        <dl className="receipt-details">
          <div>
            <dt>ชื่อผู้เอาประกัน</dt>
            <dd>{data.customerName}</dd>
          </div>
          <div>
            <dt>รถยนต์</dt>
            <dd>
              {data.vehicle.brand} {data.vehicle.model} · {data.vehicle.year}
            </dd>
          </div>
          <div>
            <dt>ทะเบียนรถ</dt>
            <dd>{data.vehicle.registrationNumber || 'ยังไม่ระบุ'}</dd>
          </div>
          <div>
            <dt>แผนที่เลือก</dt>
            <dd>
              {data.plan.name} · {data.plan.insuranceType}
            </dd>
          </div>
          <div>
            <dt>วันที่สร้างรายการ</dt>
            <dd>
              {new Intl.DateTimeFormat('th-TH', {
                dateStyle: 'long',
                timeStyle: 'short',
                timeZone: 'Asia/Bangkok',
              }).format(new Date(data.createdAt))}
            </dd>
          </div>
        </dl>
        <dl className="price-lines">
          <div>
            <dt>ราคาปกติสาธิต</dt>
            <dd>฿{money(data.originalAmount)}</dd>
          </div>
          <div>
            <dt>ส่วนลด{data.source === 'toyoty' ? ' TOYOTY' : ''}</dt>
            <dd>−฿{money(data.discountAmount)}</dd>
          </div>
          <div className="total">
            <dt>ยอดสุทธิที่บันทึก</dt>
            <dd>฿{money(data.finalAmount)}</dd>
          </div>
        </dl>
        <DemoNotice />
      </article>
      <div className="actions center">
        <Link className="button secondary" to={'/' + suffix(data.source)}>
          กลับหน้าแรก NOVA INSURE
        </Link>
        {data.source === 'toyoty' && (
          <a className="button" href={toyotyUrl()}>
            กลับไปยัง TOYOTY
          </a>
        )}
      </div>
      <p className="secure-note">
        ข้อมูลใบรับรายการเข้าถึงด้วยสิทธิ์ในแท็บนี้เท่านั้น
        ปิดแท็บแล้วจะไม่สามารถเปิดใหม่ด้วย URL เพียงอย่างเดียว
      </p>
    </div>
  );
}
export default function App() {
  const source = useSource();
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';
  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
    } else window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  return (
    <>
      <a href="#main" className="skip-link">
        ข้ามไปเนื้อหา
      </a>
      {!isAdmin && <Header source={source} />}
      <main id="main">
        <Routes>
          <Route path="/" element={<QuotePage source={source} />} />
          <Route
            path="/buy/:planId"
            element={
              /* Insurance: keep historical checkout code, but close its public route. */
              <PartnerPurchaseNotice />
            }
          />
          <Route path="/success/:policyId" element={<Success />} />
          {/* Insurance: independent NOVA admin session. */}
          <Route path="/admin" element={<AdminPage />} />
          <Route
            path="*"
            element={
              <div className="container state">
                <h1>ไม่พบหน้านี้</h1>
                <Link className="button" to="/">
                  กลับหน้าแรก
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      {!isAdmin && (
        <footer className="footer">
          <div className="container footer-grid">
            <div>
              <Logo to={'/' + suffix(source)} />
              <p>ความอุ่นใจ สำหรับทุกเส้นทางของคุณ</p>
              <span className="muted">Insurance Partner of TOYOTY</span>
            </div>
            <div>
              <b>Explore NOVA</b>
              <Link to={'/' + suffix(source) + '#plans'}>แผนประกันรถยนต์</Link>
              <Link to={'/' + suffix(source) + '#plans'}>
                เปรียบเทียบความคุ้มครอง
              </Link>
            </div>
            <div>
              <b>Our partner</b>
              <a href={toyotyUrl()}>กลับเว็บไซต์ TOYOTY</a>
              <span className="muted">แบรนด์จำลองอิสระจาก TOYOTY</span>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>
              © {new Date().getFullYear()} NOVA INSURE · Educational Project
            </span>
            <span>ข้อมูลทั้งหมดเป็นตัวอย่าง ไม่ใช่คำเสนอขายประกันจริง</span>
          </div>
        </footer>
      )}
    </>
  );
}
