import { ShieldCheck, BadgePercent, Check, CarFront } from 'lucide-react';
import { CarImage } from '../components/common/Showroom.jsx';
import './InsurancePartnerPage.css';

function partnerUrl() {
  const url = new URL(
    import.meta.env.VITE_INSURANCE_FRONTEND_URL || 'http://localhost:5174',
  );
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Invalid insurance frontend URL');
  url.pathname = '/';
  url.search = '?source=toyoty';
  url.hash = '';
  return url.href;
}
export default function InsurancePartnerPage() {
  const href = partnerUrl();
  return (
    <div className="toyoty-insurance">
      <section className="ti-hero">
        <div>
          <p className="s-eyebrow">TOYOTY INSURANCE PARTNER</p>
          <h1>
            เลือกประกันกับ Partner ของเรา
            <br />
            เพื่อดีลที่ดีกว่า
          </h1>
          <p className="ti-sub">
            ดูแลการเดินทางให้ครบกว่าเดิม พร้อมสิทธิพิเศษสาธิต
            <br />
            จาก NOVA INSURE พันธมิตรประกันรถยนต์ของเรา
          </p>
          <a className="s-btn pri" href={href}>
            เลือกซื้อประกัน
          </a>
          <small>พาคุณไปยังเว็บไซต์ Partner โดยไม่ส่งข้อมูลบัญชี TOYOTY</small>
        </div>
        <div className="ti-art">
          <ShieldCheck className="ti-shield" size={100} strokeWidth={1.2} />
          <CarImage type="sedan" color="#c4d5ee" />
        </div>
      </section>
      <div className="ti-content">
        <div className="ti-heading">
          <span className="s-eyebrow">A PARTNER FOR YOUR NEXT JOURNEY</span>
          <h2>ความอุ่นใจ ที่เลือกได้ด้วยตัวคุณเอง</h2>
          <p>
            เปรียบเทียบ 4 แผนประกันจำลอง
            ตั้งแต่ความคุ้มครองพื้นฐานถึงแผนที่ครอบคลุม
          </p>
        </div>
        <article className="ti-partner">
          <a
            href={href}
            className="ti-brand"
            aria-label="เลือกซื้อประกันกับ NOVA INSURE"
          >
            <ShieldCheck size={64} strokeWidth={1.3} />
            <strong>
              NOVA <span>INSURE</span>
            </strong>
            <small>CONFIDENCE IN EVERY MILE</small>
            <span className="ti-partner-label">
              Insurance Partner of TOYOTY
            </span>
          </a>
          <div className="ti-info">
            <span className="ti-offer">
              <BadgePercent size={19} />
              สิทธิพิเศษลูกค้า TOYOTY
            </span>
            <h2>NOVA INSURE</h2>
            <p>
              ประกันรถยนต์ที่เลือกง่าย ราคาโปร่งใส
              และทำรายการผ่านเว็บไซต์ได้ในไม่กี่ขั้นตอน
            </p>
            <ul>
              {[
                'ส่วนลดสาธิต 5% สูงสุด 1,000 บาท จากราคาแผน',
                'เลือกประกันชั้น 3, 3+, 2+ หรือชั้น 1',
                'ยืนยันรายการและรับเลขกรมธรรม์จำลองออนไลน์',
              ].map((text) => (
                <li key={text}>
                  <Check size={18} />
                  {text}
                </li>
              ))}
            </ul>
            <a className="s-btn pri" href={href}>
              เลือกซื้อประกัน
            </a>
            <small>คุณจะออกจาก TOYOTY เพื่อไปยังเว็บไซต์ NOVA INSURE</small>
          </div>
        </article>
        <div className="ti-notes">
          <CarFront size={25} />
          <p>
            โครงการเพื่อการศึกษา แบรนด์ ราคา ส่วนลด
            และความคุ้มครองทั้งหมดเป็นตัวอย่าง
            ไม่มีการชำระเงินหรือความคุ้มครองจริง ไม่ใช่คำเสนอขายประกัน
            ข้อมูลที่กรอกบนเว็บไซต์ Partner จะถูกบันทึกแยกจาก TOYOTY
          </p>
        </div>
      </div>
    </div>
  );
}
