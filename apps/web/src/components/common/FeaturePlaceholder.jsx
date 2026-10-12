export default function FeaturePlaceholder({ title, owner, description }) {
  return (
    <section className="panel">
      <p className="eyebrow">FEATURE · คนที่ {owner}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="notice">
        ยังไม่ได้พัฒนา — หน้านี้เป็น placeholder
        ไม่มีข้อมูลธุรกิจหรือการตรวจสิทธิ์
      </div>
    </section>
  );
}
