import { useState } from 'react';
import { createFinanceRequest, createInvoice } from '../api/paymentApi.js';
import {
  FormMessage,
  Kpis,
  LoadState,
  PageHeader,
  Progress,
  StatusPill,
} from '../components/FinanceUi.jsx';
import { useAction, usePaymentData } from '../hooks/usePaymentData.js';
import {
  activeInvoice,
  canInvoice,
  carLabel,
  invoiceStatus,
  netPaid,
  orderOf,
  outstanding,
} from '../utils/finance.js';
import {
  baht,
  dateInput,
  money,
  thDateTime,
  toSatang,
} from '../utils/format.js';

const requestTopics = [
  'ตรวจสอบยอดโอน',
  'ลูกค้าขอแยกงวดชำระ',
  'แก้ไขใบแจ้งหนี้',
  'ลูกค้าขอคืนเงิน',
  'อื่น ๆ',
];

// backend ส่งเฉพาะออเดอร์ที่ Seller ที่ login อยู่เป็นผู้ขาย
export default function SellerFinancePage() {
  const { data, error, loading, reload } = usePaymentData({ requests: true });
  const [orderId, setOrderId] = useState('');
  const [message, run, , busy] = useAction();

  const header = (
    <PageHeader
      crumb="Workspace / ติดต่อการเงิน"
      title="ติดต่อการเงิน"
      sub="ติดตามการชำระของลูกค้าที่คุณดูแล ออกใบแจ้งหนี้ และส่งเรื่องถึงฝ่ายการเงิน"
    />
  );
  if (!data)
    return (
      <main className="page-content admin-content">
        {header}
        <LoadState loading={loading} error={error} onRetry={reload} />
      </main>
    );

  const orders = data.orders;
  const requests = data.financeRequests;
  const overdue = data.invoices.filter(
    (i) => invoiceStatus(i) === 'OVERDUE',
  ).length;
  const active = orders.filter((o) => o.orderStatus === 'CONFIRMED');

  async function issue(order) {
    const invoice = await run(
      () => createInvoice(order.orderId, dateInput(7)),
      (inv) => `ออกใบแจ้งหนี้ ${inv.invoiceNumber} ${money(inv.amount)} แล้ว`,
    );
    if (invoice) reload();
  }

  async function submit(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const created = await run(
      () =>
        createFinanceRequest({
          orderId,
          topic: String(form.get('topic')),
          message: String(form.get('message')),
        }),
      () => 'ส่งเรื่องถึงฝ่ายการเงินแล้ว ติดตามคำตอบได้ด้านล่าง',
    );
    if (created) {
      formEl.reset();
      setOrderId('');
      reload();
    }
  }

  return (
    <main className="page-content admin-content">
      {header}
      <LoadState error={error} onRetry={reload} />
      <Kpis
        items={[
          { l: 'ออเดอร์ที่กำลังชำระ', v: active.length },
          {
            l: 'ยอดค้างรับจากลูกค้า',
            v: baht(active.reduce((s, o) => s + outstanding(o), 0)),
          },
          { l: 'บิลเกินกำหนด', v: overdue },
          {
            l: 'เรื่องรอการเงินตอบ',
            v: requests.filter((r) => r.status === 'OPEN').length,
          },
        ]}
      />
      <FormMessage message={message} />

      <section className="s-card flush">
        <div className="s-card-h">
          <h2>สถานะการชำระของลูกค้าฉัน</h2>
        </div>
        <div className="s-tw">
          <table className="s-tbl">
            <thead>
              <tr>
                <th scope="col">ออเดอร์</th>
                <th scope="col">ลูกค้า / รถ</th>
                <th scope="col" className="num">
                  ราคาสุทธิ
                </th>
                <th scope="col">ชำระแล้ว</th>
                <th scope="col" className="num">
                  คงค้าง
                </th>
                <th scope="col">ใบแจ้งหนี้</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const invoice = activeInvoice(data, o.orderId);
                return (
                  <tr key={o.orderId}>
                    <td>
                      {o.orderNumber}
                      <span className="pay-sub">
                        <StatusPill kind="order" status={o.orderStatus} />
                      </span>
                    </td>
                    <td>
                      {o.customerName}
                      <span className="pay-sub">{carLabel(o)}</span>
                    </td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td>
                      <Progress
                        value={netPaid(o)}
                        total={toSatang(o.totalAmount)}
                      />
                      <span className="pay-sub">{baht(netPaid(o))}</span>
                    </td>
                    <td className="num">
                      {o.orderStatus === 'CANCELLED'
                        ? '–'
                        : baht(outstanding(o))}
                    </td>
                    <td>
                      {invoice ? (
                        <>
                          {invoice.invoiceNumber}
                          <span className="pay-sub">
                            <StatusPill
                              kind="invoice"
                              status={invoiceStatus(invoice)}
                            />
                          </span>
                        </>
                      ) : canInvoice(data, o) ? (
                        <button
                          className="s-act"
                          disabled={busy}
                          onClick={() => issue(o)}
                        >
                          ออกใบแจ้งหนี้
                        </button>
                      ) : (
                        <span className="small">
                          {o.orderStatus === 'PENDING'
                            ? 'รออนุมัติก่อน'
                            : 'ยังไม่ออกบิล'}
                        </span>
                      )}
                    </td>
                    <td className="acts">
                      <button
                        className="s-act"
                        onClick={() => {
                          setOrderId(o.orderId);
                          document
                            .getElementById('finance-form')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        แจ้งการเงิน
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="empty-state">ยังไม่มีออเดอร์ที่คุณดูแล</p>
          )}
        </div>
      </section>

      <div className="request-columns">
        <section className="s-card" id="finance-form">
          <h2>ส่งเรื่องถึงฝ่ายการเงิน</h2>
          <form className="s-form" onSubmit={submit}>
            <label className="s-fld wide">
              <span>ออเดอร์ *</span>
              <select
                className="s-in"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              >
                <option value="" disabled>
                  เลือกออเดอร์
                </option>
                {orders.map((o) => (
                  <option key={o.orderId} value={o.orderId}>
                    {o.orderNumber} · {o.customerName} · {o.car.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="s-fld wide">
              <span>เรื่อง *</span>
              <select className="s-in" name="topic" required>
                {requestTopics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="s-fld wide">
              <span>ข้อความ *</span>
              <textarea
                className="s-in"
                name="message"
                maxLength={500}
                required
                placeholder="เช่น ลูกค้าโอนเงินแล้วเมื่อเช้า ฝากตรวจสอบยอด"
              />
            </label>
            <div className="s-form-f">
              <button className="s-btn pri" type="submit" disabled={busy}>
                ส่งเรื่อง
              </button>
            </div>
          </form>
        </section>

        <section className="s-card">
          <h2>เรื่องที่ส่งไปแล้ว</h2>
          <div className="pay-thread">
            {requests.length === 0 && (
              <p className="empty-state">ยังไม่มีเรื่องที่ส่ง</p>
            )}
            {requests.map((r) => {
              const order = orderOf(data, r.orderId);
              return (
                <article className="pay-msg" key={r.id}>
                  <div className="meta">
                    <b>{r.topic}</b>
                    <span>
                      {order?.orderNumber} {order?.customerName}
                    </span>
                    <span>{thDateTime(r.createdAt)}</span>
                    <StatusPill kind="request" status={r.status} />
                  </div>
                  <p>{r.message}</p>
                  {r.reply && (
                    <div className="pay-reply">
                      <b>การเงิน:</b> {r.reply}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
