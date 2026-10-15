import { useState } from 'react';
import {
  createFinanceRequest,
  DEMO_SELLER_ID,
  invoiceStatus,
  orderSummary,
  requestTopics,
} from '../api/mockPaymentApi.js';
import {
  DemoNote,
  FormMessage,
  Kpis,
  PageHeader,
  Progress,
  StatusPill,
} from '../components/FinanceUi.jsx';
import { useAction, usePaymentData } from '../hooks/usePaymentData.js';
import { baht, money, thDateTime } from '../utils/format.js';

export default function SellerFinancePage() {
  const data = usePaymentData();
  const [orderId, setOrderId] = useState('');
  const [message, run] = useAction();

  const orders = data.orders.filter((o) => o.sellerId === DEMO_SELLER_ID);
  const requests = data.financeRequests.filter(
    (r) => r.sellerId === DEMO_SELLER_ID,
  );
  const overdue = data.invoices.filter(
    (i) =>
      orders.some((o) => o.orderId === i.orderId) &&
      invoiceStatus(data, i) === 'overdue',
  );
  const active = orders.filter((o) => o.status === 'approved');
  const outstanding = active.reduce(
    (sum, o) => sum + orderSummary(data, o.orderId).outstanding,
    0,
  );

  function submit(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const created = run(
      () =>
        createFinanceRequest({
          orderId,
          topic: String(form.get('topic')),
          message: String(form.get('message')),
        }),
      () => 'ส่งเรื่องถึงฝ่ายการเงินแล้ว (จำลอง) ติดตามคำตอบได้ด้านล่าง',
    );
    if (created) {
      formEl.reset();
      setOrderId('');
    }
  }

  return (
    <main className="page-content admin-content">
      <PageHeader
        crumb="Workspace / ติดต่อการเงิน"
        title="ติดต่อการเงิน"
        sub="ติดตามสถานะการชำระของลูกค้าที่คุณดูแล และส่งเรื่องถึงฝ่ายการเงิน"
      />
      <DemoNote />
      <Kpis
        items={[
          { l: 'ออเดอร์ที่กำลังชำระ', v: active.length },
          { l: 'ยอดค้างรับจากลูกค้า', v: baht(outstanding) },
          { l: 'บิลเกินกำหนด', v: overdue.length },
          {
            l: 'เรื่องรอการเงินตอบ',
            v: requests.filter((r) => r.status === 'open').length,
          },
        ]}
      />

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
                <th scope="col">บิลล่าสุด</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const sum = orderSummary(data, o.orderId);
                const last = data.invoices
                  .filter((i) => i.orderId === o.orderId)
                  .sort((a, b) => b.issueDate.localeCompare(a.issueDate))[0];
                return (
                  <tr key={o.orderId}>
                    <td>
                      {o.orderNumber}
                      <span className="pay-sub">
                        <StatusPill kind="order" status={o.status} />
                      </span>
                    </td>
                    <td>
                      {o.customerName}
                      <span className="pay-sub">{o.car}</span>
                    </td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td>
                      <Progress value={sum.paid} total={sum.total} />
                      <span className="pay-sub">{baht(sum.paid)}</span>
                    </td>
                    <td className="num">
                      {o.status === 'cancelled' ? '–' : baht(sum.outstanding)}
                    </td>
                    <td>
                      {last ? (
                        <>
                          {last.invoiceNumber} {last.title}
                          <span className="pay-sub">
                            <StatusPill
                              kind="invoice"
                              status={invoiceStatus(data, last)}
                            />
                          </span>
                        </>
                      ) : (
                        <span className="small">ยังไม่ออกบิล</span>
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
                    {o.orderNumber} · {o.customerName} · {o.car}
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
                placeholder="เช่น ลูกค้าโอนเงินดาวน์แล้วเมื่อเช้า ฝากตรวจสอบยอด"
              />
            </label>
            <div className="s-form-f">
              <button className="s-btn pri" type="submit">
                ส่งเรื่อง
              </button>
            </div>
            <FormMessage message={message} />
          </form>
        </section>

        <section className="s-card">
          <h2>เรื่องที่ส่งไปแล้ว</h2>
          <div className="pay-thread">
            {requests.length === 0 && (
              <p className="empty-state">ยังไม่มีเรื่องที่ส่ง</p>
            )}
            {requests.map((r) => {
              const order = data.orders.find((o) => o.orderId === r.orderId);
              return (
                <article className="pay-msg" key={r.requestId}>
                  <div className="meta">
                    <b>{r.topic}</b>
                    <span>
                      {order.orderNumber} {order.customerName}
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
