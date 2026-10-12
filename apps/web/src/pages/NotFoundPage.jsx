import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <section className="panel">
      <h1>ไม่พบหน้านี้</h1>
      <Link to="/">กลับหน้า Home</Link>
    </section>
  );
}
