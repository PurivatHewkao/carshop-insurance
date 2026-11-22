import '../sales.css';

const PHONE = '02-123-4567';
const LINE_ID = '@toyoty';

export default function ContactPage() {
  return (
    <div className="sales-contact-page">
      <section className="sales-contact-hero">
        <p className="sales-contact-kicker">TOYOTY · CONTACT</p>
        <h1>ติดต่อเรา</h1>
        <p>เลือกช่องทางที่สะดวกเพื่อติดต่อทีมงาน</p>
      </section>

      <section className="sales-contact-grid" aria-label="ช่องทางติดต่อ">
        <a
          className="sales-contact-card"
          href={`tel:${PHONE.replaceAll('-', '')}`}
        >
          <span className="sales-contact-icon" aria-hidden="true">
            ☎
          </span>
          <span className="sales-contact-label">โทรหาเรา</span>
          <strong>{PHONE}</strong>
          <small>แตะเพื่อโทรจากอุปกรณ์ของคุณ</small>
        </a>
        <article className="sales-contact-card">
          <span className="sales-contact-icon" aria-hidden="true">
            LINE
          </span>
          <span className="sales-contact-label">LINE Official</span>
          <strong>{LINE_ID}</strong>
          <small>แจ้ง LINE ID นี้เพื่อพูดคุยกับทีมงาน</small>
        </article>
      </section>
      <p className="sales-contact-note">
        ช่องทางติดต่อบนเว็บไซต์นี้เป็นข้อมูลตัวอย่างของโปรเจกต์ TOYOTY
      </p>
    </div>
  );
}
