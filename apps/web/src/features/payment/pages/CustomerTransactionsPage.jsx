import { useState } from 'react';
import {
  createPayment,
  DEMO_CUSTOMER_ID,
  invoicePaidSatang,
  invoicePendingSatang,
  invoiceStatus,
  orderSummary,
  paymentMethods,
  toSatang,
} from '../api/mockPaymentApi.js';
import {
  DemoNote,
  Dialog,
  FormMessage,
  InvoiceDialog,
  Kpis,
  PageHeader,
  Progress,
  StatusPill,
} from '../components/FinanceUi.jsx';
import { useAction, usePaymentData } from '../hooks/usePaymentData.js';
import { baht, money, thDate, thDateTime } from '../utils/format.js';

export default function CustomerTransactionsPage() {
  const data = usePaymentData();
  const [paying, setPaying] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [message, , setMessage] = useAction();

  const orders = data.orders.filter((o) => o.customerId === DEMO_CUSTOMER_ID);
  const orderIds = new Set(orders.map((o) => o.orderId));
  const invoices = data.invoices.filter((i) => orderIds.has(i.orderId));
  const openBills = invoices
    .filter((i) => ['issued', 'overdue'].includes(invoiceStatus(data, i)))
    .map((i) => ({
      invoice: i,
      order: orders.find((o) => o.orderId === i.orderId),
      paid: invoicePaidSatang(data, i.invoiceId),
      pending: invoicePendingSatang(data, i.invoiceId),
    }));
  const payments = data.payments.filter((p) => orderIds.has(p.orderId));
  const history = [
    ...payments.map((p) => ({ kind: 'payment', at: p.paidAt, item: p })),
    ...data.refunds
      .filter((r) => payments.some((p) => p.paymentId === r.paymentId))
      .map((r) => ({ kind: 'refund', at: r.processedAt, item: r })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const due = openBills.reduce(
    (sum, b) => sum + toSatang(b.invoice.amount) - b.paid - b.pending,
    0,
  );
  const paidTotal = payments
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + toSatang(p.amount), 0);
  const pendingTotal = openBills.reduce((sum, b) => sum + b.pending, 0);

  return (
    <div className="page-content">
      <PageHeader
        crumb="บัญชีลูกค้า / ประวัติธุรกรรม"
        title="ประวัติธุรกรรม"
        sub="ดูบิลที่ต้องชำระ ชำระเงิน และย้อนดูการชำระทั้งหมดของคุณ"
      />
      <DemoNote />
      <Kpis
        items={[
          { l: 'ยอดที่ต้องชำระ', v: baht(due), d: openBills.length + ' บิล' },
          { l: 'รอฝ่ายการเงินตรวจสอบ', v: baht(pendingTotal) },
          { l: 'ชำระแล้วทั้งหมด', v: baht(paidTotal) },
        ]}
      />
      <FormMessage message={message} />

      <section>
        <div className="s-sec-h">
          <h2>บิลที่ต้องชำระ</h2>
          <span className="cnt">{openBills.length} รายการ</span>
        </div>
        {openBills.length === 0 ? (
          <p className="empty-state">ไม่มีบิลค้างชำระ</p>
        ) : (
          <div className="pay-bills">
            {openBills.map(({ invoice, order, paid, pending }) => {
              const remaining = toSatang(invoice.amount) - paid - pending;
              return (
                <article className="s-card pay-bill" key={invoice.invoiceId}>
                  <div className="top">
                    <div>
                      <b>{invoice.title}</b>
                      <span className="pay-sub">
                        {invoice.invoiceNumber} · {order.car}
                      </span>
                    </div>
                    <StatusPill
                      kind="invoice"
                      status={invoiceStatus(data, invoice)}
                    />
                  </div>
                  <span className="amt">{baht(remaining)}</span>
                  <span className="small">
                    ครบกำหนด {thDate(invoice.dueDate)}
                    {pending > 0 && ` · รอตรวจสอบ ${baht(pending)}`}
                  </span>
                  <div className="s-btns">
                    {remaining > 0 ? (
                      <button
                        className="s-btn pri"
                        onClick={() => {
                          setMessage(null);
                          setPaying(invoice);
                        }}
                      >
                        ชำระเงิน
                      </button>
                    ) : (
                      <span className="small">
                        แจ้งชำระครบแล้ว รอฝ่ายการเงินยืนยัน
                      </span>
                    )}
                    <button
                      className="s-act"
                      onClick={() => setViewing(invoice)}
                    >
                      ดูใบแจ้งหนี้
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="s-card flush">
        <div className="s-card-h">
          <h2>ออเดอร์ของฉัน</h2>
        </div>
        <div className="s-tw">
          <table className="s-tbl">
            <thead>
              <tr>
                <th scope="col">ออเดอร์</th>
                <th scope="col">รถ</th>
                <th scope="col" className="num">
                  ราคาสุทธิ
                </th>
                <th scope="col" className="num">
                  ชำระแล้ว
                </th>
                <th scope="col">ความคืบหน้า</th>
                <th scope="col">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const sum = orderSummary(data, o.orderId);
                return (
                  <tr key={o.orderId}>
                    <td>{o.orderNumber}</td>
                    <td>{o.car}</td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td className="num">{baht(sum.paid)}</td>
                    <td>
                      <Progress value={sum.paid} total={sum.total} />
                    </td>
                    <td>
                      <StatusPill kind="order" status={o.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="s-card flush">
        <div className="s-card-h">
          <h2>ประวัติการชำระเงิน</h2>
        </div>
        <div className="s-tw">
          <table className="s-tbl">
            <thead>
              <tr>
                <th scope="col">วันที่</th>
                <th scope="col">รายการ</th>
                <th scope="col">ช่องทาง / อ้างอิง</th>
                <th scope="col" className="num">
                  จำนวนเงิน
                </th>
                <th scope="col">สถานะ</th>
                <th scope="col">เอกสาร</th>
              </tr>
            </thead>
            <tbody>
              {history.map(({ kind, at, item }) => {
                const payment =
                  kind === 'payment'
                    ? item
                    : payments.find((p) => p.paymentId === item.paymentId);
                const invoice = data.invoices.find(
                  (i) => i.invoiceId === payment.invoiceId,
                );
                const order = orders.find((o) => o.orderId === payment.orderId);
                return (
                  <tr
                    key={kind + (item.paymentId ?? '') + (item.refundId ?? '')}
                  >
                    <td>{thDateTime(at)}</td>
                    <td>
                      {kind === 'payment'
                        ? `ชำระ${invoice.title}`
                        : `คืนเงิน ${item.reason}`}
                      <span className="pay-sub">
                        {kind === 'payment'
                          ? item.paymentNumber
                          : item.refundNumber}{' '}
                        · {order.orderNumber} {order.car}
                      </span>
                    </td>
                    <td>
                      {kind === 'payment'
                        ? paymentMethods[item.paymentMethod]
                        : 'คืนเข้าช่องทางเดิม'}
                      <span className="pay-sub">
                        {payment.transactionReference}
                      </span>
                    </td>
                    <td className="num">
                      {kind === 'refund' && '−'}
                      {money(item.amount)}
                    </td>
                    <td>
                      <StatusPill kind={kind} status={item.status} />
                    </td>
                    <td>
                      <button
                        className="s-act"
                        onClick={() => setViewing(invoice)}
                      >
                        {invoice.invoiceNumber}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {history.length === 0 && (
            <p className="empty-state">ยังไม่มีประวัติการชำระเงิน</p>
          )}
        </div>
        <div className="s-card-f">แสดง {history.length} รายการ</div>
      </section>

      {paying && (
        <PayDialog
          data={data}
          invoice={paying}
          onClose={() => setPaying(null)}
          onDone={(text) => {
            setPaying(null);
            setMessage({ ok: true, text });
          }}
        />
      )}
      {viewing && (
        <InvoiceDialog
          data={data}
          invoice={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function PayDialog({ data, invoice, onClose, onDone }) {
  const remaining =
    toSatang(invoice.amount) -
    invoicePaidSatang(data, invoice.invoiceId) -
    invoicePendingSatang(data, invoice.invoiceId);
  const [method, setMethod] = useState('transfer');
  // หนึ่ง dialog = หนึ่ง Idempotency-Key กดซ้ำไม่เกิดรายการซ้ำ
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [message, run] = useAction();

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = run(() =>
      createPayment(
        {
          invoiceId: invoice.invoiceId,
          amount: String(form.get('amount')),
          paymentMethod: method,
          transactionReference: String(form.get('reference') || ''),
        },
        idempotencyKey,
        'ลูกค้า',
      ),
    );
    if (created)
      onDone(
        created.status === 'confirmed'
          ? `ชำระเงิน ${money(created.amount)} สำเร็จ (${created.paymentNumber}) — ระบบจำลองอนุมัติบัตรทันที`
          : `แจ้งโอน ${money(created.amount)} แล้ว (${created.paymentNumber}) รอฝ่ายการเงินตรวจสอบยอด`,
      );
  }

  return (
    <Dialog title={'ชำระ' + invoice.title} onClose={onClose}>
      <p className="small">
        {invoice.invoiceNumber} · ยอดคงค้าง {baht(remaining)}
      </p>
      <form className="s-form" onSubmit={submit}>
        <fieldset className="s-fld wide pay-methods">
          <legend className="lb">ช่องทางชำระ *</legend>
          {['transfer', 'card'].map((key) => (
            <label key={key}>
              <input
                type="radio"
                name="method"
                value={key}
                checked={method === key}
                onChange={() => setMethod(key)}
              />
              <span>
                {paymentMethods[key]}
                <small>
                  {key === 'transfer'
                    ? 'โอนแล้วกรอกเลขอ้างอิง ฝ่ายการเงินจะตรวจยอดภายใน 1 วันทำการ'
                    : 'จำลองการตัดบัตร อนุมัติทันที ไม่ต้องกรอกข้อมูลบัตรจริง'}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
        {method === 'transfer' && (
          <div className="s-fld wide pay-bank">
            บัญชีรับโอน (จำลอง): ธนาคารตัวอย่าง · 123-4-56789-0 · บจก. โตโยตี้
            มอเตอร์
          </div>
        )}
        <label className="s-fld">
          <span>จำนวนเงิน (บาท) *</span>
          <input
            className="s-in"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            max={(remaining / 100).toFixed(2)}
            defaultValue={(remaining / 100).toFixed(2)}
            required
          />
        </label>
        {method === 'transfer' && (
          <label className="s-fld">
            <span>เลขอ้างอิงการโอน *</span>
            <input
              className="s-in"
              name="reference"
              placeholder="เช่น KBANK-2569101301"
              maxLength={40}
              required
            />
          </label>
        )}
        <div className="s-form-f">
          <button className="s-btn pri" type="submit">
            {method === 'card' ? 'ชำระด้วยบัตร (จำลอง)' : 'แจ้งโอนเงิน'}
          </button>
        </div>
        <FormMessage message={message} />
      </form>
    </Dialog>
  );
}
