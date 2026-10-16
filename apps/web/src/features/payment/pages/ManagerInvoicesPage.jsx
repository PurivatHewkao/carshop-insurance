import { useState } from 'react';
import {
  createInvoice,
  invoiceStatus,
  invoiceTitles,
  orderSummary,
} from '../api/mockPaymentApi.js';
import {
  DemoNote,
  FormMessage,
  InvoiceDialog,
  Kpis,
  PageHeader,
  Progress,
  StatusPill,
} from '../components/FinanceUi.jsx';
import { useAction, usePaymentData } from '../hooks/usePaymentData.js';
import { baht, dateInput, money, thDate } from '../utils/format.js';

export default function ManagerInvoicesPage() {
  const data = usePaymentData();
  const [orderId, setOrderId] = useState('');
  const [viewing, setViewing] = useState(null);
  const [message, run] = useAction();

  const orders = data.orders.filter((o) => o.status !== 'cancelled');
  const billable = orders.filter(
    (o) =>
      o.status === 'approved' && orderSummary(data, o.orderId).unbilled > 0,
  );
  const selected = billable.find((o) => o.orderId === orderId);
  const unbilled = selected ? orderSummary(data, orderId).unbilled : 0;
  const issued = data.invoices
    .filter((i) => orders.some((o) => o.orderId === i.orderId))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const statusCount = (status) =>
    issued.filter((i) => invoiceStatus(data, i) === status).length;

  function submit(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const invoice = run(
      () =>
        createInvoice({
          orderId,
          title: String(form.get('title')),
          amount: String(form.get('amount')),
          dueDate: String(form.get('dueDate')),
          note: String(form.get('note') || ''),
        }),
      (inv) =>
        `ออกใบแจ้งหนี้ ${inv.invoiceNumber} ${money(inv.amount)} ส่งฝ่ายการเงินและลูกค้าแล้ว (จำลอง)`,
    );
    if (invoice) {
      formEl.reset();
      setOrderId('');
    }
  }

  function pick(id) {
    setOrderId(id);
    document
      .getElementById('invoice-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="page-content admin-content">
      <PageHeader
        crumb="Workspace / ออกบิลส่งการเงิน"
        title="ออกบิลส่งการเงิน"
        sub="ออกใบแจ้งหนี้จากออเดอร์ที่อนุมัติแล้ว ระบบส่งต่อให้ฝ่ายการเงิน (Admin) และลูกค้า"
      />
      <DemoNote />
      <Kpis
        items={[
          { l: 'ออเดอร์รอออกบิล', v: billable.length },
          { l: 'บิลรอชำระ', v: statusCount('issued') },
          { l: 'บิลเกินกำหนด', v: statusCount('overdue') },
          { l: 'บิลชำระครบ', v: statusCount('paid') },
        ]}
      />

      <section className="s-card flush">
        <div className="s-card-h">
          <h2>ออเดอร์และยอดที่ออกบิล</h2>
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
                <th scope="col" className="num">
                  ออกบิลแล้ว
                </th>
                <th scope="col" className="num">
                  ยังไม่ออกบิล
                </th>
                <th scope="col">ชำระแล้ว</th>
                <th scope="col">สถานะออเดอร์</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const sum = orderSummary(data, o.orderId);
                return (
                  <tr key={o.orderId}>
                    <td>{o.orderNumber}</td>
                    <td>
                      {o.customerName}
                      <span className="pay-sub">
                        {o.car} · {o.sellerId}
                      </span>
                    </td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td className="num">{baht(sum.billed)}</td>
                    <td className="num">{baht(sum.unbilled)}</td>
                    <td>
                      <Progress value={sum.paid} total={sum.total} />
                      <span className="pay-sub">{baht(sum.paid)}</span>
                    </td>
                    <td>
                      <StatusPill kind="order" status={o.status} />
                    </td>
                    <td className="acts">
                      {o.status !== 'approved' ? (
                        <span className="small">รออนุมัติก่อน</span>
                      ) : sum.unbilled > 0 ? (
                        <button
                          className="s-act"
                          onClick={() => pick(o.orderId)}
                        >
                          ออกบิล
                        </button>
                      ) : (
                        <span className="small">ออกบิลครบแล้ว</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="request-columns">
        <section className="s-card" id="invoice-form">
          <h2>ออกใบแจ้งหนี้ใหม่</h2>
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
                  เลือกออเดอร์ที่อนุมัติแล้ว
                </option>
                {billable.map((o) => (
                  <option key={o.orderId} value={o.orderId}>
                    {o.orderNumber} · {o.customerName} · {o.car}
                  </option>
                ))}
              </select>
            </label>
            <label className="s-fld">
              <span>ประเภทบิล *</span>
              <select className="s-in" name="title" required>
                {invoiceTitles.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="s-fld">
              <span>จำนวนเงิน (บาท) *</span>
              <input
                key={orderId}
                className="s-in"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                max={selected ? (unbilled / 100).toFixed(2) : undefined}
                defaultValue={selected ? (unbilled / 100).toFixed(2) : ''}
                disabled={!selected}
                required
              />
            </label>
            <label className="s-fld">
              <span>ครบกำหนดชำระ *</span>
              <input
                className="s-in"
                name="dueDate"
                type="date"
                min={dateInput()}
                defaultValue={dateInput(7)}
                required
              />
            </label>
            <label className="s-fld wide">
              <span>หมายเหตุถึงฝ่ายการเงิน</span>
              <textarea
                className="s-in"
                name="note"
                maxLength={300}
                placeholder="เช่น ลูกค้าขอแยกชำระ 2 งวด"
              />
            </label>
            {selected && (
              <p className="small s-fld wide">
                ยอดที่ยังไม่ได้ออกบิลของ {selected.orderNumber}:{' '}
                <b>{baht(unbilled)}</b>
              </p>
            )}
            <div className="s-form-f">
              <button className="s-btn pri" type="submit" disabled={!selected}>
                ออกบิลและส่งการเงิน
              </button>
            </div>
            <FormMessage message={message} />
          </form>
        </section>

        <section className="s-card s-list">
          <h3>บิลที่ออกแล้ว</h3>
          {issued.length === 0 && <p className="empty-state">ยังไม่มีบิล</p>}
          {issued.map((inv) => {
            const order = data.orders.find((o) => o.orderId === inv.orderId);
            return (
              <div className="it" key={inv.invoiceId}>
                <div className="grow">
                  <b>
                    <button className="s-act" onClick={() => setViewing(inv)}>
                      {inv.invoiceNumber}
                    </button>{' '}
                    {inv.title} {money(inv.amount)}
                  </b>
                  <span>
                    {order.orderNumber} {order.customerName} · ครบกำหนด{' '}
                    {thDate(inv.dueDate)}
                  </span>
                </div>
                <StatusPill kind="invoice" status={invoiceStatus(data, inv)} />
              </div>
            );
          })}
        </section>
      </div>

      {viewing && (
        <InvoiceDialog
          data={data}
          invoice={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </main>
  );
}
