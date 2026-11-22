// Insurance: the direct checkout URL stays readable but cannot create a purchase.
import { toyotyUrl } from './api.js';
export default function PartnerPurchaseNotice() {
  return (
    <section className="container state">
      <h1>เลือกซื้อประกันพร้อมรถผ่าน Seller</h1>
      <p>
        แจ้ง Seller ของ TOYOTY เพื่อเลือกแพ็กเกจ NOVA พร้อมวันส่งมอบรถ
        หลังชำระเงินครบ คำขอจะส่งให้ NOVA อนุมัติ
      </p>
      <p>ติดตามผลและดูกรมธรรม์ได้ที่เมนู “ประกันของฉัน” ในบัญชี TOYOTY</p>
      <a className="button" href={toyotyUrl()}>
        กลับเว็บไซต์ TOYOTY
      </a>
    </section>
  );
}
