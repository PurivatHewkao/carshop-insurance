import { Link } from 'react-router-dom';
export default function HomePage() {
  return (
    <section className="panel">
      <p className="eyebrow">TEAM STARTER</p>
      <h1>พื้นที่เริ่มต้นของทีม Carshop</h1>
      <p>React แอปเดียว เชื่อมต่อกับ 5 services ที่พัฒนาแยกกันได้</p>
      <div className="notice">
        พร้อมสำหรับแบ่งงาน — business features ยังไม่ได้พัฒนา
      </div>
      <Link className="button mt-6 inline-block" to="/system-status">
        ตรวจสถานะ services →
      </Link>
    </section>
  );
}
