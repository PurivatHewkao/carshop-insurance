import { useEffect, useRef } from 'react';
import {
  carLabel,
  invoiceStatus,
  netPaid,
  orderOf,
  outstanding,
} from '../utils/finance.js';
import {
  baht,
  money,
  paymentMethods,
  statusLabels,
  thDate,
  thDateTime,
} from '../utils/format.js';
import '../payment.css';

export function StatusPill({ kind, status }) {
  const [label, tone] = statusLabels[kind][status] ?? [status, 'info'];
  return <span className={'s-pill t-' + tone}>{label}</span>;
}

export function PageHeader({ crumb, title, sub, children }) {
  return (
    <header className="s-ph">
      <div>
        <p className="s-crumb">{crumb}</p>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </header>
  );
}

/** แสดงระหว่างโหลด / เมื่อโหลดไม่ได้ — คืน null เมื่อพร้อมแสดงข้อมูล */
export function LoadState({ loading, error, onRetry }) {
  if (loading) return <p className="s-note">กำลังโหลดข้อมูลการเงิน…</p>;
  if (!error) return null;
  return (
    <p className="s-note pay-error" role="alert">
      {error}{' '}
      <button type="button" className="s-act" onClick={onRetry}>
        ลองใหม่
      </button>
    </p>
  );
}

export function SimNote() {
  return (
    <p className="s-note">
      ข้อมูลจริงจาก Payment service · การตัดบัตรเป็นระบบจำลอง
      ไม่มีการตัดเงินจริง
    </p>
  );
}

export function Kpis({ items }) {
  return (
    <div className="s-kpis pay-kpis">
      {items.map((item) => (
        <article className="s-card s-kpi" key={item.l}>
          <span className="l">{item.l}</span>
          <strong className="v">{item.v}</strong>
          {item.d && <span className="small">{item.d}</span>}
        </article>
      ))}
    </div>
  );
}

export function FormMessage({ message }) {
  return (
    <p
      className={'form-message' + (message && !message.ok ? ' pay-error' : '')}
      role={message && !message.ok ? 'alert' : 'status'}
    >
      {message?.text}
    </p>
  );
}

export function Progress({ value, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="pay-progress" title={pct + '%'}>
      <span style={{ width: pct + '%' }} />
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="pay-tabs" role="tablist">
      {tabs.map(([key, label, count]) => (
        <button
          key={key}
          role="tab"
          type="button"
          aria-selected={value === key}
          className={value === key ? 'on' : ''}
          onClick={() => onChange(key)}
        >
          {label}
          {count > 0 && <span className="cnt">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Dialog({ title, onClose, children }) {
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
      className="s-card order-modal pay-dialog"
      aria-label={title}
    >
      <div className="pay-dialog-h">
        <h2>{title}</h2>
        <button type="button" className="s-act mute" onClick={onClose}>
          ปิด ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function InvoiceDialog({ data, invoice, onClose }) {
  const order = orderOf(data, invoice.orderId);
  const payments = data.payments.filter((p) => p.orderId === invoice.orderId);
  function print() {
    document.body.classList.add('pay-printing');
    window.addEventListener(
      'afterprint',
      () => document.body.classList.remove('pay-printing'),
      { once: true },
    );
    window.print();
  }
  return (
    <Dialog title={'ใบแจ้งหนี้ ' + invoice.invoiceNumber} onClose={onClose}>
      <article className="pay-doc">
        <div className="pay-doc-h">
          <div>
            <b>TOYOTY</b>
            <span className="small">ศูนย์จำหน่ายรถยนต์โตโยตี้ (จำลอง)</span>
          </div>
          <div className="pay-doc-no">
            <span className="small">ใบแจ้งหนี้</span>
            <b>{invoice.invoiceNumber}</b>
            <StatusPill kind="invoice" status={invoiceStatus(invoice)} />
          </div>
        </div>
        <dl className="s-kv">
          {[
            ['ลูกค้า', order?.customerName ?? '–'],
            [
              'ออเดอร์',
              order ? order.orderNumber + ' · ' + carLabel(order) : '–',
            ],
            ['ฝ่ายขาย', order?.sellerName ?? '–'],
            ['วันที่ออก', thDate(invoice.issueDate)],
            ['ครบกำหนดชำระ', thDate(invoice.dueDate)],
          ].map(([k, v]) => (
            <div className="r" key={k}>
              <dt className="k">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <table className="s-tbl pay-doc-items">
          <thead>
            <tr>
              <th scope="col">รายการ</th>
              <th scope="col" className="num">
                จำนวนเงิน
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ราคารถสุทธิ — {order ? carLabel(order) : invoice.orderId}</td>
              <td className="num">{money(invoice.amount)}</td>
            </tr>
          </tbody>
          {order && (
            <tfoot>
              <tr>
                <td>ชำระแล้ว (หักคืนเงิน)</td>
                <td className="num">{baht(netPaid(order))}</td>
              </tr>
              <tr>
                <th scope="row">คงค้าง</th>
                <th className="num">
                  {invoice.status === 'CANCELLED'
                    ? '–'
                    : baht(outstanding(order))}
                </th>
              </tr>
            </tfoot>
          )}
        </table>
        {payments.length > 0 && (
          <>
            <h3>การชำระเงินของออเดอร์นี้</h3>
            <ul className="pay-mini">
              {payments.map((p) => (
                <li key={p.id}>
                  <span>
                    {thDateTime(p.paymentDate ?? p.createdAt)} ·{' '}
                    {paymentMethods[p.paymentMethod]} · {p.transactionReference}
                  </span>
                  <span>
                    {money(p.amount)}{' '}
                    <StatusPill kind="payment" status={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="small">เอกสารสำหรับสาธิตระบบ ไม่ใช่ใบกำกับภาษี</p>
      </article>
      <div className="s-btns">
        <button className="s-btn pri" type="button" onClick={print}>
          พิมพ์ / บันทึก PDF
        </button>
        <button className="s-btn out" type="button" onClick={onClose}>
          ปิด
        </button>
      </div>
    </Dialog>
  );
}
