import { useEffect, useRef } from 'react';
import { formatMoney } from '../hooks/useReports.js';
import { formatDate, statusText } from './reportFormat.js';
import { number, percent, sameModel, toNumber } from './dashboardFormat.js';

function Stat({ label, value, hint }) {
  return (
    <div className="db-stat">
      <span className="l">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="h">{hint}</span>}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="db-dsec">
      <h3>{title}</h3>
      {hint && <p className="db-muted">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * รายละเอียดรุ่นรถ 1 รุ่น: ยอดขาย, สต็อก/การผลิตแยกรุ่นย่อย, สเปกที่ขายได้, ออเดอร์ล่าสุด
 * ข้อมูลทั้งหมดมาจากรายงานที่ Dashboard โหลดไว้แล้ว ไม่ยิง API เพิ่ม
 */
export default function ModelDetailDialog({ row, totalSales, inventory, configuration, orders, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const sales = toNumber(row.totalSales);
  const count = toNumber(row.orderCount);
  const toyoty = inventory?.mode === 'toyoty';
  const stockRows = (inventory?.items || []).filter((item) => sameModel(row.carModel, `${item.brand} ${item.model}`, item.model));
  const specRows = (configuration?.items || []).filter((item) => sameModel(row.carModel, item.model, String(item.model || '').split(' ').slice(1).join(' ')));
  const modelOrders = (orders?.items || []).filter((item) => item.carModel === row.carModel);
  const pending = modelOrders.filter((item) => item.approvalStatus === 'PENDING_APPROVAL').length;

  return (
    <dialog ref={ref} onCancel={onClose} onClick={(event) => event.target === ref.current && onClose()} className="s-card order-modal db-dialog" aria-labelledby="model-title">
      <header className="db-dialog-h">
        <div>
          <p className="db-muted">รายละเอียดรุ่นรถ</p>
          <h2 id="model-title">{row.carModel}</h2>
        </div>
        <button type="button" className="s-btn" onClick={onClose} aria-label="ปิด">ปิด ✕</button>
      </header>

      <div className="db-stats">
        <Stat label="ออเดอร์" value={number(count)} hint={pending ? `รออนุมัติ ${number(pending)}` : 'ไม่นับที่ยกเลิก'} />
        <Stat label="ยอดขาย" value={formatMoney(sales)} />
        <Stat label="เฉลี่ยต่อออเดอร์" value={count ? formatMoney(sales / count) : '—'} hint="รวมเบี้ยประกัน" />
        <Stat label="สัดส่วนยอดขายทั้งร้าน" value={percent(sales, totalSales)} />
      </div>

      <Section
        title="สต็อกและการผลิต"
        hint={toyoty ? 'นับรถของรุ่นนี้แยกตามรุ่นย่อย ตามขั้นการผลิตตอนนี้' : 'จำนวนรถพร้อมขายจาก Catalog'}
      >
        {!stockRows.length ? (
          <p className="db-muted">ไม่พบรุ่นนี้ในข้อมูลสต็อก (อาจเป็นรุ่นเดิมที่ซ่อนไว้แล้ว)</p>
        ) : toyoty ? (
          <div className="s-tw">
            <table className="s-tbl db-mini-tbl">
              <thead>
                <tr><th scope="col">รุ่นย่อย</th><th scope="col">ราคา</th><th scope="col">รถโชว์</th><th scope="col">รอคิว</th><th scope="col">กำลังผลิต / ขนส่ง</th><th scope="col">ถึงศูนย์</th><th scope="col">ส่งมอบแล้ว</th><th scope="col">ล่าช้า</th></tr>
              </thead>
              <tbody>
                {stockRows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.trimName}</td>
                    <td>{item.price ? formatMoney(item.price) : '—'}</td>
                    <td>{number(item.showroom + item.inStock)}</td>
                    <td>{number(item.waiting + item.scheduled)}</td>
                    <td>{number(item.inProduction + item.inTransit)}</td>
                    <td>{number(item.ready)}</td>
                    <td>{number(item.delivered)}</td>
                    <td className={item.delayed ? 'db-bad' : ''}>{item.delayed ? `${number(item.delayed)} คัน` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <dl className="s-kv">
            {stockRows.map((item) => (
              <div className="r" key={item.id}>
                <dt className="k">{item.brand} {item.model}</dt>
                <dd>{number(item.stock)} คัน · {statusText(item.stockStatus)} · ราคาเริ่มต้น {formatMoney(item.price)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      {configuration?.available && (
        <Section title="สเปกที่ลูกค้าเลือก" hint="รุ่นย่อย / สี / ล้อ ที่ขายได้ของรุ่นนี้ เรียงจากขายได้มากสุด (ยอด = ราคารถ ไม่รวมประกัน)">
          {specRows.length ? (
            <div className="s-tw">
              <table className="s-tbl db-mini-tbl">
                <thead><tr><th scope="col">รุ่นย่อย</th><th scope="col">สี</th><th scope="col">ล้อ</th><th scope="col">คัน</th><th scope="col">ยอดขาย</th></tr></thead>
                <tbody>
                  {specRows.map((item) => (
                    <tr key={item.id}><td>{item.trimName}</td><td>{item.color}</td><td>{item.wheel || '—'}</td><td>{number(item.orderCount)}</td><td>{formatMoney(item.totalSales)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="db-muted">ยังไม่มีรถสั่งผลิตของรุ่นนี้</p>}
        </Section>
      )}

      <Section title="ออเดอร์ล่าสุดของรุ่นนี้" hint={modelOrders.length > 8 ? `แสดง 8 จาก ${number(modelOrders.length)} รายการ — ดูทั้งหมดในไฟล์ Excel` : null}>
        {modelOrders.length ? (
          <div className="s-tw">
            <table className="s-tbl db-mini-tbl">
              <thead><tr><th scope="col">รหัส</th><th scope="col">วันที่</th><th scope="col">ลูกค้า</th><th scope="col">พนักงานขาย</th><th scope="col">ยอดรวม</th><th scope="col">สถานะ</th></tr></thead>
              <tbody>
                {modelOrders.slice(0, 8).map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.customerName || '—'}</td>
                    <td>{item.sellerName || '—'}</td>
                    <td>{formatMoney(item.totalAmount)}</td>
                    <td>{statusText(item.orderStatus || item.approvalStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="db-muted">{orders ? 'ไม่พบออเดอร์' : 'กำลังโหลด…'}</p>}
      </Section>
    </dialog>
  );
}
