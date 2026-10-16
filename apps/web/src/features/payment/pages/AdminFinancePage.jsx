import { useState } from 'react';
import {
  createPayment,
  createRefund,
  DEMO_ADMIN_NAME,
  invoicePaidSatang,
  invoicePendingSatang,
  invoiceStatus,
  paymentMethods,
  receivedSatang,
  refundedSatang,
  replyFinanceRequest,
  resetDemoData,
  reviewPayment,
  toSatang,
  voidInvoice,
} from '../api/mockPaymentApi.js';
import {
  DemoNote,
  Dialog,
  FormMessage,
  InvoiceDialog,
  Kpis,
  PageHeader,
  StatusPill,
  Tabs,
} from '../components/FinanceUi.jsx';
import { useAction, usePaymentData } from '../hooks/usePaymentData.js';
import { baht, money, thDate, thDateTime } from '../utils/format.js';

export default function AdminFinancePage() {
  const data = usePaymentData();
  const [tab, setTab] = useState('pending');
  const [viewing, setViewing] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [message, run, setMessage] = useAction();

  const orderOf = (orderId) => data.orders.find((o) => o.orderId === orderId);
  const invoiceOf = (invoiceId) =>
    data.invoices.find((i) => i.invoiceId === invoiceId);
  const pending = data.payments.filter((p) => p.status === 'pending');
  const openRequests = data.financeRequests.filter((r) => r.status === 'open');
  const openInvoices = data.invoices.filter((i) =>
    ['issued', 'overdue'].includes(invoiceStatus(data, i)),
  );
  const received = receivedSatang(data, 30);
  const outstanding = openInvoices.reduce(
    (sum, i) => sum + toSatang(i.amount) - invoicePaidSatang(data, i.invoiceId),
    0,
  );

  function done(text) {
    setDialog(null);
    setMessage({ ok: true, text });
  }

  return (
    <main className="page-content admin-content">
      <PageHeader
        crumb="Workspace / การเงิน"
        title="การเงิน"
        sub="ตรวจยอดโอน ติดตามใบแจ้งหนี้ คืนเงิน และตอบเรื่องจากฝ่ายขาย"
      >
        <button
          className="s-btn out"
          onClick={() => {
            resetDemoData();
            setMessage({ ok: true, text: 'รีเซ็ตข้อมูลจำลองแล้ว' });
          }}
        >
          รีเซ็ตข้อมูลจำลอง
        </button>
      </PageHeader>
      <DemoNote />
      <Kpis
        items={[
          {
            l: 'รอตรวจสอบยอดโอน',
            v: pending.length + ' รายการ',
            d: baht(pending.reduce((s, p) => s + toSatang(p.amount), 0)),
          },
          { l: 'รับชำระแล้ว 30 วัน', v: baht(received) },
          {
            l: 'ยอดค้างชำระ',
            v: baht(outstanding),
            d:
              openInvoices.filter((i) => invoiceStatus(data, i) === 'overdue')
                .length + ' บิลเกินกำหนด',
          },
          { l: 'เรื่องจากฝ่ายขายรอตอบ', v: openRequests.length },
        ]}
      />
      <FormMessage message={message} />

      <Tabs
        value={tab}
        onChange={(key) => {
          setTab(key);
          setMessage(null);
        }}
        tabs={[
          ['pending', 'ตรวจสอบการชำระ', pending.length],
          ['invoices', 'ใบแจ้งหนี้'],
          ['payments', 'รับชำระ / คืนเงิน'],
          ['requests', 'เรื่องจากฝ่ายขาย', openRequests.length],
        ]}
      />

      {tab === 'pending' && (
        <section className="s-card flush">
          <div className="s-card-h">
            <h2>รายการแจ้งโอนรอตรวจสอบ</h2>
          </div>
          <div className="s-tw">
            <table className="s-tbl">
              <thead>
                <tr>
                  <th scope="col">แจ้งเมื่อ</th>
                  <th scope="col">ลูกค้า / ออเดอร์</th>
                  <th scope="col">ใบแจ้งหนี้</th>
                  <th scope="col">เลขอ้างอิง</th>
                  <th scope="col" className="num">
                    ยอดแจ้งโอน
                  </th>
                  <th scope="col">ตรวจสอบ</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => {
                  const order = orderOf(p.orderId);
                  const invoice = invoiceOf(p.invoiceId);
                  return (
                    <tr key={p.paymentId}>
                      <td>{thDateTime(p.paidAt)}</td>
                      <td>
                        {order.customerName}
                        <span className="pay-sub">
                          {order.orderNumber} · {order.car}
                        </span>
                      </td>
                      <td>
                        <button
                          className="s-act"
                          onClick={() => setViewing(invoice)}
                        >
                          {invoice.invoiceNumber}
                        </button>
                        <span className="pay-sub">
                          {invoice.title} {money(invoice.amount)}
                        </span>
                      </td>
                      <td>
                        {p.transactionReference}
                        <span className="pay-sub">{p.paymentNumber}</span>
                      </td>
                      <td className="num">{money(p.amount)}</td>
                      <td className="acts">
                        <button
                          className="s-act"
                          onClick={() =>
                            run(
                              () => reviewPayment(p.paymentId, 'confirmed'),
                              () =>
                                `ยืนยันยอด ${p.paymentNumber} ${money(p.amount)} แล้ว`,
                            )
                          }
                        >
                          ยืนยันยอด
                        </button>
                        <button
                          className="s-act del"
                          onClick={() =>
                            run(
                              () => reviewPayment(p.paymentId, 'failed'),
                              () =>
                                `ปฏิเสธ ${p.paymentNumber} — ยอดไม่เข้าบัญชี ลูกค้าต้องแจ้งใหม่`,
                            )
                          }
                        >
                          ไม่พบยอด
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pending.length === 0 && (
              <p className="empty-state">ไม่มีรายการรอตรวจสอบ</p>
            )}
          </div>
        </section>
      )}

      {tab === 'invoices' && (
        <InvoicesTab
          data={data}
          orderOf={orderOf}
          onView={setViewing}
          onCash={(invoice) => setDialog({ type: 'cash', invoice })}
          onVoid={(invoice) =>
            run(
              () => voidInvoice(invoice.invoiceId),
              () => `ยกเลิกบิล ${invoice.invoiceNumber} แล้ว`,
            )
          }
        />
      )}

      {tab === 'payments' && (
        <>
          <section className="s-card flush">
            <div className="s-card-h">
              <h2>ประวัติรับชำระ</h2>
            </div>
            <div className="s-tw">
              <table className="s-tbl">
                <thead>
                  <tr>
                    <th scope="col">เลขที่</th>
                    <th scope="col">ลูกค้า / ออเดอร์</th>
                    <th scope="col">ช่องทาง</th>
                    <th scope="col" className="num">
                      ยอด
                    </th>
                    <th scope="col">สถานะ</th>
                    <th scope="col">ยืนยันโดย</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {data.payments
                    .filter((p) => p.status !== 'pending')
                    .map((p) => {
                      const order = orderOf(p.orderId);
                      const refundable =
                        toSatang(p.amount) - refundedSatang(data, p.paymentId);
                      return (
                        <tr key={p.paymentId}>
                          <td>
                            {p.paymentNumber}
                            <span className="pay-sub">
                              {thDateTime(p.paidAt)}
                            </span>
                          </td>
                          <td>
                            {order.customerName}
                            <span className="pay-sub">
                              {order.orderNumber} ·{' '}
                              {invoiceOf(p.invoiceId).invoiceNumber}
                            </span>
                          </td>
                          <td>
                            {paymentMethods[p.paymentMethod]}
                            <span className="pay-sub">
                              {p.transactionReference}
                            </span>
                          </td>
                          <td className="num">{money(p.amount)}</td>
                          <td>
                            <StatusPill kind="payment" status={p.status} />
                          </td>
                          <td>{p.confirmedBy ?? '–'}</td>
                          <td className="acts">
                            {p.status === 'confirmed' && refundable > 0 && (
                              <button
                                className="s-act del"
                                onClick={() =>
                                  setDialog({
                                    type: 'refund',
                                    payment: p,
                                    refundable,
                                  })
                                }
                              >
                                คืนเงิน
                              </button>
                            )}
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
              <h2>รายการคืนเงิน</h2>
            </div>
            <div className="s-tw">
              <table className="s-tbl">
                <thead>
                  <tr>
                    <th scope="col">เลขที่</th>
                    <th scope="col">อ้างอิงการชำระ</th>
                    <th scope="col">เหตุผล</th>
                    <th scope="col" className="num">
                      ยอดคืน
                    </th>
                    <th scope="col">สถานะ</th>
                    <th scope="col">ดำเนินการเมื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.refunds.map((r) => {
                    const p = data.payments.find(
                      (x) => x.paymentId === r.paymentId,
                    );
                    return (
                      <tr key={r.refundId}>
                        <td>{r.refundNumber}</td>
                        <td>
                          {p.paymentNumber}
                          <span className="pay-sub">
                            {orderOf(p.orderId).customerName}
                          </span>
                        </td>
                        <td>{r.reason}</td>
                        <td className="num">{money(r.amount)}</td>
                        <td>
                          <StatusPill kind="refund" status={r.status} />
                        </td>
                        <td>{thDateTime(r.processedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.refunds.length === 0 && (
                <p className="empty-state">ยังไม่มีการคืนเงิน</p>
              )}
            </div>
          </section>
        </>
      )}

      {tab === 'requests' && (
        <section className="s-card">
          <h2>เรื่องจากฝ่ายขาย</h2>
          <div className="pay-thread">
            {data.financeRequests.length === 0 && (
              <p className="empty-state">ไม่มีเรื่องเข้ามา</p>
            )}
            {data.financeRequests.map((r) => {
              const order = orderOf(r.orderId);
              return (
                <article className="pay-msg" key={r.requestId}>
                  <div className="meta">
                    <b>{r.topic}</b>
                    <span>
                      จาก {r.sellerId} · {order.orderNumber}{' '}
                      {order.customerName}
                    </span>
                    <span>{thDateTime(r.createdAt)}</span>
                    <StatusPill kind="request" status={r.status} />
                  </div>
                  <p>{r.message}</p>
                  {r.reply ? (
                    <div className="pay-reply">
                      <b>{DEMO_ADMIN_NAME}:</b> {r.reply}
                    </div>
                  ) : (
                    <form
                      className="pay-reply-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const reply = new FormData(event.currentTarget).get(
                          'reply',
                        );
                        run(
                          () => replyFinanceRequest(r.requestId, String(reply)),
                          () => `ตอบเรื่อง "${r.topic}" ของ ${r.sellerId} แล้ว`,
                        );
                      }}
                    >
                      <input
                        className="s-in"
                        name="reply"
                        aria-label={'ตอบเรื่อง ' + r.topic}
                        placeholder="พิมพ์คำตอบถึงฝ่ายขาย…"
                        maxLength={300}
                        required
                      />
                      <button className="s-btn pri sm" type="submit">
                        ตอบและปิดเรื่อง
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {viewing && (
        <InvoiceDialog
          data={data}
          invoice={viewing}
          onClose={() => setViewing(null)}
        />
      )}
      {dialog?.type === 'cash' && (
        <CashDialog
          data={data}
          invoice={dialog.invoice}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog?.type === 'refund' && (
        <RefundDialog
          payment={dialog.payment}
          refundable={dialog.refundable}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
    </main>
  );
}

const invoiceFilters = [
  ['all', 'ทั้งหมด'],
  ['issued', 'รอชำระ'],
  ['overdue', 'เกินกำหนด'],
  ['paid', 'ชำระครบ'],
  ['void', 'ยกเลิกบิล'],
];

function InvoicesTab({ data, orderOf, onView, onCash, onVoid }) {
  const [filter, setFilter] = useState('all');
  const rows = data.invoices
    .map((i) => ({ invoice: i, status: invoiceStatus(data, i) }))
    .filter((row) => filter === 'all' || row.status === filter)
    .sort((a, b) => b.invoice.issueDate.localeCompare(a.invoice.issueDate));
  return (
    <section className="s-card flush">
      <div className="s-card-h pay-filter">
        <h2>ใบแจ้งหนี้ทั้งหมด</h2>
        <label className="pay-filter">
          <span className="small">สถานะ</span>
          <select
            className="s-in"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {invoiceFilters.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="s-tw">
        <table className="s-tbl">
          <thead>
            <tr>
              <th scope="col">เลขที่</th>
              <th scope="col">ลูกค้า / ออเดอร์</th>
              <th scope="col">รายการ</th>
              <th scope="col" className="num">
                ยอดบิล
              </th>
              <th scope="col" className="num">
                ชำระแล้ว
              </th>
              <th scope="col">ครบกำหนด</th>
              <th scope="col">สถานะ</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ invoice, status }) => {
              const order = orderOf(invoice.orderId);
              const busy =
                invoicePaidSatang(data, invoice.invoiceId) > 0 ||
                invoicePendingSatang(data, invoice.invoiceId) > 0;
              return (
                <tr key={invoice.invoiceId}>
                  <td>
                    <button className="s-act" onClick={() => onView(invoice)}>
                      {invoice.invoiceNumber}
                    </button>
                  </td>
                  <td>
                    {order.customerName}
                    <span className="pay-sub">
                      {order.orderNumber} · {order.car}
                    </span>
                  </td>
                  <td>{invoice.title}</td>
                  <td className="num">{money(invoice.amount)}</td>
                  <td className="num">
                    {baht(invoicePaidSatang(data, invoice.invoiceId))}
                  </td>
                  <td>{thDate(invoice.dueDate)}</td>
                  <td>
                    <StatusPill kind="invoice" status={status} />
                  </td>
                  <td className="acts">
                    {(status === 'issued' || status === 'overdue') && (
                      <button className="s-act" onClick={() => onCash(invoice)}>
                        รับเงินสด
                      </button>
                    )}
                    {(status === 'issued' || status === 'overdue') && !busy && (
                      <button
                        className="s-act del"
                        onClick={() => onVoid(invoice)}
                      >
                        ยกเลิกบิล
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="empty-state">ไม่มีใบแจ้งหนี้ในสถานะนี้</p>
        )}
      </div>
      <div className="s-card-f">แสดง {rows.length} รายการ</div>
    </section>
  );
}

function CashDialog({ data, invoice, onClose, onDone }) {
  const remaining =
    toSatang(invoice.amount) -
    invoicePaidSatang(data, invoice.invoiceId) -
    invoicePendingSatang(data, invoice.invoiceId);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [message, run] = useAction();
  function submit(event) {
    event.preventDefault();
    const amount = String(new FormData(event.currentTarget).get('amount'));
    const payment = run(() =>
      createPayment(
        { invoiceId: invoice.invoiceId, amount, paymentMethod: 'cash' },
        idempotencyKey,
        DEMO_ADMIN_NAME,
      ),
    );
    if (payment)
      onDone(
        `บันทึกรับเงินสด ${money(payment.amount)} (${payment.paymentNumber}) เข้าบิล ${invoice.invoiceNumber} แล้ว`,
      );
  }
  return (
    <Dialog title="บันทึกรับเงินสดที่โชว์รูม" onClose={onClose}>
      <p className="small">
        {invoice.invoiceNumber} {invoice.title} · คงค้าง {baht(remaining)}
        {remaining <= 0 && ' (มีรายการแจ้งโอนรอตรวจสอบครบยอดแล้ว)'}
      </p>
      <form className="s-form" onSubmit={submit}>
        <label className="s-fld wide">
          <span>จำนวนเงินที่รับ (บาท) *</span>
          <input
            className="s-in"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            max={(remaining / 100).toFixed(2)}
            defaultValue={(Math.max(0, remaining) / 100).toFixed(2)}
            required
          />
        </label>
        <div className="s-form-f">
          <button className="s-btn pri" type="submit">
            บันทึกรับเงิน
          </button>
        </div>
        <FormMessage message={message} />
      </form>
    </Dialog>
  );
}

function RefundDialog({ payment, refundable, onClose, onDone }) {
  const [message, run] = useAction();
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const refund = run(() =>
      createRefund({
        paymentId: payment.paymentId,
        amount: String(form.get('amount')),
        reason: String(form.get('reason')),
      }),
    );
    if (refund)
      onDone(
        `คืนเงิน ${money(refund.amount)} (${refund.refundNumber}) จาก ${payment.paymentNumber} แล้ว`,
      );
  }
  return (
    <Dialog title={'คืนเงิน ' + payment.paymentNumber} onClose={onClose}>
      <p className="small">
        ชำระมา {money(payment.amount)} ผ่าน{' '}
        {paymentMethods[payment.paymentMethod]} · คืนได้สูงสุด{' '}
        {baht(refundable)}
      </p>
      <form className="s-form" onSubmit={submit}>
        <label className="s-fld">
          <span>ยอดคืน (บาท) *</span>
          <input
            className="s-in"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            max={(refundable / 100).toFixed(2)}
            defaultValue={(refundable / 100).toFixed(2)}
            required
          />
        </label>
        <label className="s-fld wide">
          <span>เหตุผล *</span>
          <textarea
            className="s-in"
            name="reason"
            maxLength={300}
            required
            placeholder="เช่น ลูกค้ายกเลิกการจอง / ชำระซ้ำ"
          />
        </label>
        <div className="s-form-f">
          <button className="s-btn pri" type="submit">
            ยืนยันคืนเงิน
          </button>
        </div>
        <FormMessage message={message} />
      </form>
    </Dialog>
  );
}
