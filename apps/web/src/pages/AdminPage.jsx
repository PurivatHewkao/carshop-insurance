import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import design from '../design/toyoty.json';
import { Brand, ItemList, Pill } from '../components/common/Showroom.jsx';
const page = design.roles[2].pages[0];
const [kpis, chart, list, table] = page.blocks;
function OrderDialog({ selected, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      className="s-card order-modal"
      aria-labelledby="order-title"
    >
      <h2 id="order-title">ออเดอร์ตัวอย่าง {selected[0]}</h2>
      <dl className="s-kv">
        {selected.slice(1, -1).map((value, i) => (
          <div className="r" key={i}>
            <dt className="k">{table.cols[i + 1]}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button autoFocus className="s-btn pri" onClick={onClose}>
        ปิดรายละเอียด
      </button>
    </dialog>
  );
}
export default function AdminPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const rows = table.rows.filter((row) =>
    row.join(' ').toLowerCase().includes(search.toLowerCase()),
  );
  const values = chart.data.split(',').map(Number);
  function exportReport() {
    const csv =
      '\uFEFF' +
      [table.cols.slice(0, -1), ...rows.map((row) => row.slice(0, -1))]
        .map((row) =>
          row.map((cell) => '"' + cell.replaceAll('"', '""') + '"').join(','),
        )
        .join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'toyoty-demo-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="site admin-site">
      <div className="s-adm">
        <aside className="s-side">
          <Brand />
          <p className="grp">WORKSPACE</p>
          <Link className="on" to="/admin">
            ▦ Dashboard
          </Link>
          <Link to="/catalog">◇ ดูรายการรถ</Link>
          <Link to="/requests">▤ ตัวอย่างคำขอลูกค้า</Link>
          <Link to="/system-status">◉ สถานะระบบ</Link>
          <Link to="/">← กลับหน้าเว็บไซต์</Link>
          <div className="who">
            <span className="av">A</span>
            <div>
              Admin<small>บัญชีสาธิต</small>
            </div>
          </div>
        </aside>
        <div className="s-adm-main">
          <header className="s-adm-top">
            <label className="s-search">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">ค้นหาออเดอร์</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาออเดอร์ ลูกค้า หรือรุ่นรถ…"
                type="search"
              />
            </label>
            <span className="sp" />
            <span className="av">A</span>
            <span>Admin</span>
          </header>
          <main className="page-content admin-content">
            <header className="s-ph">
              <div>
                <p className="s-crumb">Workspace / ภาพรวม</p>
                <h1>Dashboard</h1>
                <p>{page.sub}</p>
              </div>
              <button className="s-btn pri" onClick={exportReport}>
                ↓ ส่งออกรายงาน
              </button>
            </header>
            <p className="small">
              ข้อมูลทั้งหมดเป็นตัวอย่างจากแบบ UI · ยังไม่เชื่อมระบบผู้ดูแล
            </p>
            <div className="s-kpis">
              {kpis.items.map((item) => (
                <article className="s-card s-kpi" key={item.l}>
                  <span className="l">{item.l}</span>
                  <strong className="v">{item.v}</strong>
                  <div className="r2">
                    <span className="s-delta">{item.d}</span>
                    <svg
                      className="spark"
                      width="100"
                      height="28"
                      viewBox="0 0 100 28"
                      aria-hidden="true"
                    >
                      <polyline
                        fill="none"
                        stroke="var(--red)"
                        strokeWidth="2"
                        points={item.s
                          .split(',')
                          .map(
                            (v, i, all) =>
                              `${i * 19},${25 - ((Number(v) - Math.min(...all.map(Number))) / (Math.max(...all.map(Number)) - Math.min(...all.map(Number)) || 1)) * 22}`,
                          )
                          .join(' ')}
                      />
                    </svg>
                  </div>
                </article>
              ))}
            </div>
            <div className="request-columns">
              <section className="s-card">
                <h2>{chart.title}</h2>
                <div
                  className="bar-chart"
                  role="img"
                  aria-label={values
                    .map(
                      (v, i) =>
                        chart.labels.split(',')[i] + ' ' + v + ' รายการ',
                    )
                    .join(', ')}
                >
                  {values.map((v, i) => (
                    <div className="bar-column" key={i}>
                      <span>{v}</span>
                      <div
                        className={
                          'chart-bar ' +
                          (i === values.length - 1 ? 'highlight' : '')
                        }
                        style={{ height: (v / Math.max(...values)) * 180 }}
                      />
                      <small>{chart.labels.split(',')[i]}</small>
                    </div>
                  ))}
                </div>
              </section>
              <ItemList {...list} />
            </div>
            <section className="s-card flush">
              <div className="s-card-h">
                <h2>{table.title}</h2>
              </div>
              <div className="s-tw">
                <table className="s-tbl">
                  <thead>
                    <tr>
                      {table.cols.map((col, i) => (
                        <th scope="col" key={i}>
                          {col || 'รายละเอียด'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row[0]}>
                        {row.slice(0, -1).map((cell, i) => (
                          <td key={i}>
                            {i === 5 ? <Pill>{cell}</Pill> : cell}
                          </td>
                        ))}
                        <td>
                          <button
                            className="s-act"
                            onClick={() => setSelected(row)}
                          >
                            เปิดดู
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <p className="empty-state">ไม่พบออเดอร์ที่ค้นหา</p>
                )}
              </div>
              <div className="s-card-f">แสดง {rows.length} รายการตัวอย่าง</div>
            </section>
          </main>
        </div>
      </div>
      {selected && (
        <OrderDialog selected={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
