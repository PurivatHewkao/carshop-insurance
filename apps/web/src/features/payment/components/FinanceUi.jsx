import { useEffect, useRef } from 'react';
import {
  invoicePaidSatang,
  invoiceStatus,
  toSatang,
} from '../api/mockPaymentApi.js';
import { baht, money, statusLabels, thDate } from '../utils/format.js';
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

export function DemoNote() {
  return (
    <p className="s-note">
      โหมดสาธิต · ข้อมูลการเงินเป็นข้อมูลจำลอง เก็บเฉพาะแท็บนี้ ยังไม่เชื่อม
      Payment service และไม่มีการตัดเงินจริง
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
  const order = data.orders.find((o) => o.orderId === invoice.orderId);
  const payments = data.payments.filter(
    (p) => p.invoiceId === invoice.invoiceId,
  );
  const paid = invoicePaidSatang(data, invoice.invoiceId);
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
            <StatusPill kind="invoice" status={invoiceStatus(data, invoice)} />
          </div>
        </div>
        <dl className="s-kv">
          {[
            ['ลูกค้า', order.customerName],
            ['ออเดอร์', order.orderNumber + ' · ' + order.car],
            ['วันที่ออก', thDate(invoice.issueDate)],
            ['ครบกำหนดชำระ', thDate(invoice.dueDate)],
            ['ออกโดย', invoice.issuedBy],
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
              <td>
                {invoice.title} — {order.car}
                {invoice.note && <div className="small">{invoice.note}</div>}
              </td>
              <td className="num">{money(invoice.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>ชำระแล้ว</td>
              <td className="num">{baht(paid)}</td>
            </tr>
            <tr>
              <th scope="row">คงค้าง</th>
              <th className="num">
                {invoice.status === 'void'
                  ? '–'
                  : baht(Math.max(0, toSatang(invoice.amount) - paid))}
              </th>
            </tr>
          </tfoot>
        </table>
        {payments.length > 0 && (
          <>
            <h3>การชำระเงิน</h3>
            <ul className="pay-mini">
              {payments.map((p) => (
                <li key={p.paymentId}>
                  <span>
                    {p.paymentNumber} · {thDate(p.paidAt)} ·{' '}
                    {p.transactionReference}
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
        <p className="small">เอกสารจำลองสำหรับสาธิตระบบ ไม่ใช่ใบกำกับภาษี</p>
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
