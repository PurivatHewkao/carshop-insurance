import { Link } from 'react-router-dom';
import { carSvg } from '../../design/carSvg.js';
export function CarImage({
  type = 'sedan',
  color = '#B8BBC2',
  outline = false,
}) {
  return (
    <div
      className="car-art"
      dangerouslySetInnerHTML={{ __html: carSvg(type, color, { outline }) }}
    />
  );
}
export function Brand() {
  return (
    <Link className="s-logo" to="/" aria-label="TOYOTY หน้าแรก">
      <span className="s-mark">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18v4h-7v11h-4V10H3z" />
        </svg>
      </span>
      TOYOTY
    </Link>
  );
}
export function Pill({ children }) {
  const tone = /ยกเลิก|ไม่อนุมัติ/.test(children)
    ? 'bad'
    : /ว่าง|อนุมัติแล้ว|ปิดแล้ว/.test(children)
      ? 'good'
      : /ใหม่/.test(children)
        ? 'info'
        : 'warn';
  return <span className={'s-pill t-' + tone}>{children}</span>;
}
export function Action({
  children,
  to = '/requests',
  variant = 'pri',
  ...props
}) {
  return (
    <Link className={'s-btn ' + variant} to={to} {...props}>
      {children}
    </Link>
  );
}
export function CarGrid({ items, title, link, cols = 3 }) {
  return (
    <section>
      <div className="s-sec-h">
        <h2>{title}</h2>
        <span className="cnt">{items.length} รุ่น</span>
        {link && (
          <Link className="lnk" to="/catalog">
            {link}
          </Link>
        )}
      </div>
      <div className="s-cars" style={{ '--cols': cols }}>
        {items.map((car) => (
          <Link
            className="s-car"
            key={car.name}
            to={'/catalog/' + encodeURIComponent(car.name)}
          >
            <h3>{car.name}</h3>
            <div className="pr">เริ่มต้น {car.price}</div>
            <span className="tag">
              <Pill>{car.tag}</Pill>
            </span>
            <div className="im">
              <CarImage type={car.type} color={car.color} />
            </div>
            <span className="go">ดูรายละเอียดรุ่นนี้ →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
export function Specs({ items }) {
  return (
    <div className="s-specs">
      {items.map((item) => (
        <div className="s-spec" key={item.l}>
          <b>
            {item.v}
            <small>{item.u}</small>
          </b>
          <span>{item.l}</span>
        </div>
      ))}
    </div>
  );
}
export function Details({ title, rows }) {
  return (
    <section className="s-card">
      <h3>{title}</h3>
      <dl className="s-kv">
        {rows.map((row) => (
          <div className="r" key={row.l}>
            <dt className="k">{row.l}</dt>
            <dd>{row.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function ItemList({ title, items }) {
  return (
    <section className="s-card s-list">
      <h3>{title}</h3>
      {items.map((item) => (
        <div className="it" key={item.a}>
          <div className="grow">
            <b>{item.a}</b>
            <span>{item.b}</span>
          </div>
          <Pill>{item.tag}</Pill>
        </div>
      ))}
    </section>
  );
}
