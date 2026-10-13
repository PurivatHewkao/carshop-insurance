import { Link, useParams } from 'react-router-dom';

export default function PlannedPage({ page }) {
  const { customerId } = useParams();
  return (
    <section className="page-content admin-content">
      <header className="s-ph">
        <div>
          <p className="s-crumb">
            {page.role === 'public' ? 'TOYOTY' : page.role.toUpperCase()} /{' '}
            {page.title}
          </p>
          <h1>{page.title}</h1>
        </div>
      </header>
      <div className="s-card">
        <h2>ยังไม่เปิดใช้งาน</h2>
        <p>
          หน้านี้เป็นโครงตามรายการหน้าของระบบ
          ยังไม่มีข้อมูลหรือการดำเนินรายการจริง
        </p>
        {customerId && (
          <p className="small">
            รหัสลูกค้า: {customerId} · ยังไม่ได้โหลดข้อมูลลูกค้า
          </p>
        )}
      </div>
      {page.path === 'register' && (
        <Link className="s-act" to="/login">
          มีบัญชีแล้ว? เข้าสู่ระบบ
        </Link>
      )}
    </section>
  );
}
