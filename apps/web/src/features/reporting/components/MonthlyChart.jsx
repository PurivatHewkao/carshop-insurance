import { useState } from 'react';
import { formatMoney } from '../hooks/useReports.js';
import { monthLong, monthShort, number, shortBaht } from './dashboardFormat.js';

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 22, right: 8, bottom: 30, left: 56 };
const MAX_BAR = 36;

const METRICS = {
  orders: { label: 'จำนวนออเดอร์', unit: 'ออเดอร์', key: 'orderCount', tick: number, value: (v) => `${number(v)} ออเดอร์` },
  sales: { label: 'ยอดขาย (บาท)', unit: 'บาท', key: 'totalSales', tick: shortBaht, value: formatMoney },
};

/** ค่าบนสุดของแกนที่เป็นเลขกลม ๆ (1, 2, 5 × 10ⁿ) แบ่ง 4 ช่อง */
function niceScale(max) {
  if (max <= 0) return { top: 4, step: 1 };
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough);
  // จำนวนออเดอร์เป็นจำนวนเต็ม: ขั้นต่ำ 1
  const whole = Math.max(step, max < 4 ? 1 : step);
  return { top: whole * 4, step: whole };
}

/** มุมบนมน 4px ฐานตรงติดเส้นศูนย์ */
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export default function MonthlyChart({ months }) {
  const [metric, setMetric] = useState('orders');
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const spec = METRICS[metric];
  const values = months.map((item) => item[spec.key]);
  const { top, step } = niceScale(Math.max(...values, 0));
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / months.length;
  const barW = Math.min(MAX_BAR, band * 0.56);
  const y = (value) => PAD.top + plotH - (value / top) * plotH;
  const ticks = Array.from({ length: 5 }, (_, i) => i * step);
  const last = months.length - 1;
  const maxIndex = values.indexOf(Math.max(...values));
  const empty = values.every((value) => value === 0);
  // ป้ายตัวเลขเฉพาะเดือนล่าสุดและเดือนสูงสุด ไม่ใส่ทุกแท่ง
  const labelled = new Set([last, maxIndex].filter((i) => values[i] > 0));
  const hovered = hover == null ? null : months[hover];

  return (
    <div className="db-chart">
      <div className="db-chart-bar">
        <div className="db-seg" role="group" aria-label="เลือกข้อมูลที่แสดงในกราฟ">
          {Object.entries(METRICS).map(([key, item]) => (
            <button key={key} type="button" className={metric === key ? 'on' : ''} aria-pressed={metric === key} onClick={() => setMetric(key)}>
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className="db-link" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'ดูเป็นกราฟ' : 'ดูเป็นตาราง'}
        </button>
      </div>

      {asTable ? (
        <table className="s-tbl db-mini-tbl">
          <thead><tr><th scope="col">เดือน</th><th scope="col">ออเดอร์</th><th scope="col">ยอดขาย</th></tr></thead>
          <tbody>
            {months.map((item) => (
              <tr key={item.period}><td>{monthLong(item.period)}</td><td>{number(item.orderCount)}</td><td>{formatMoney(item.totalSales)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="db-plot" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${spec.label} รายเดือน: ` + months.map((item) => `${monthLong(item.period)} ${spec.value(item[spec.key])}`).join(', ')}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line className={tick === 0 ? 'db-base' : 'db-gl'} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
                <text className="db-tick" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">{spec.tick(tick)}</text>
              </g>
            ))}
            {months.map((item, i) => {
              const value = item[spec.key];
              const cx = PAD.left + band * i + band / 2;
              const h = Math.max(0, y(0) - y(value));
              return (
                <g key={item.period}>
                  {hover === i && <rect className="db-hover-band" x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} />}
                  {value > 0 && <path className={'db-bar' + (i === last ? ' now' : '')} d={barPath(cx - barW / 2, y(value), barW, h)} />}
                  {labelled.has(i) && <text className="db-val" x={cx} y={y(value) - 6} textAnchor="middle">{spec.tick(value)}</text>}
                  <text className={'db-tick' + (i === last ? ' now' : '')} x={cx} y={HEIGHT - 10} textAnchor="middle">{monthShort(item.period)}</text>
                  {/* พื้นที่ hover กว้างทั้งช่อง ไม่ต้องชี้โดนแท่งพอดี */}
                  <rect
                    x={PAD.left + band * i} y={PAD.top} width={band} height={plotH + PAD.bottom}
                    fill="transparent" tabIndex={0}
                    aria-label={`${monthLong(item.period)}: ${number(item.orderCount)} ออเดอร์, ${formatMoney(item.totalSales)}`}
                    onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>
          {empty && <p className="db-empty-note">ยังไม่มีออเดอร์ในช่วงนี้</p>}
          {hovered && (
            <div
              className="db-tip"
              role="status"
              style={{
                left: `${((PAD.left + band * hover + band / 2) / WIDTH) * 100}%`,
                // ช่องริมซ้าย/ขวา: เลื่อนกล่องเข้าด้านใน ไม่ให้ล้นกราฟ
                '--tip-shift': hover === 0 ? '-20%' : hover === months.length - 1 ? '-85%' : '-50%',
              }}
            >
              <strong>{monthLong(hovered.period)}</strong>
              <span>{number(hovered.orderCount)} ออเดอร์</span>
              <span>{formatMoney(hovered.totalSales)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
