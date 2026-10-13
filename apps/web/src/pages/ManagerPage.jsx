export default function ManagerPage() {
  return (
    <main className="page-content admin-content">
      <header className="s-ph">
        <div>
          <p className="s-crumb">Workspace / ผู้จัดการ</p>
          <h1>Dashboard</h1>
          <p>พื้นที่สำหรับติดตามงานขายและประสานงานทีม</p>
        </div>
      </header>
      <p className="s-note">
        โหมดสาธิต · ยังไม่เชื่อมข้อมูลจริงหรือระบบตรวจสิทธิ์
      </p>
      <div className="detail-columns">
        <section className="s-card">
          <h2>การมอบหมายงานขาย</h2>
          <p>พื้นที่สำหรับติดตามคำขอลูกค้าและจัดสรรงานให้ทีมขาย</p>
          <p className="small">สถานะ: ยังไม่เปิดใช้งาน</p>
        </section>
        <section className="s-card">
          <h2>การอนุมัติรายการ</h2>
          <p>พื้นที่สำหรับตรวจสอบรายละเอียดและอนุมัติรายการขาย</p>
          <p className="small">สถานะ: ยังไม่เปิดใช้งาน</p>
        </section>
      </div>
    </main>
  );
}
