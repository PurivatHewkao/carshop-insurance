import { useState } from 'react';
import {
  approveRefund,
  cancelInvoice,
  createPayment,
  rejectRefund,
  replyFinanceRequest,
  requestRefund,
  reviewPayment,
} from '../api/paymentApi.js';
import {
  Dialog,
  FormMessage,
  InvoiceDialog,
  Kpis,
  LoadState,
  PageHeader,
  ReceiptButton,
  StatusPill,
  Tabs,
} from '../components/FinanceUi.jsx';
import { useAction, usePaymentData } from '../hooks/usePaymentData.js';
import {
  activeInvoice,
  canPay,
  carLabel,
  flowWaitingText,
  invoiceStatus,
  needsRefund,
  netPaid,
  openRefund,
  orderOf,
  outstanding,
  refundableSatang,
  staffPaymentOptions,
} from '../utils/finance.js';
import {
  baht,
  DEPOSIT_LIMIT_SATANG,
  money,
  paymentMethods,
  paymentTypes,
  satangInput,
  thDate,
  thDateTime,
  toSatang,
} from '../utils/format.js';

// งานฝ่ายการเงิน (role admin หรือ finance): ตรวจยอดโอน อนุมัติคืนเงิน รับเงินสด ตอบเรื่องจากฝ่ายขาย
export default function AdminFinancePage() {
  const { data, error, loading, reload } = usePaymentData({ requests: true });
  const [tab, setTab] = useState('pending');
  const [viewing, setViewing] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [message, run, setMessage, busy] = useAction();

  const header = (
    <PageHeader
      crumb="Workspace / การเงิน"
      title="การเงิน"
      sub="ตรวจยอดโอน อนุมัติคืนเงิน รับเงินสด ติดตามใบแจ้งหนี้ และตอบเรื่องจากฝ่ายขาย"
    />
  );
  if (!data)
    return (
      <main className="page-content admin-content">
        {header}
        <LoadState loading={loading} error={error} onRetry={reload} />
      </main>
    );

  const customerOf = (orderId) => {
    const order = orderOf(data, orderId);
    return order ? (
      <>
        {order.customerName}
        <span className="pay-sub">
          {order.orderNumber} · {carLabel(order)}
        </span>
      </>
    ) : (
      orderId
    );
  };
  const pending = data.payments.filter((p) => p.status === 'PENDING');
  const refundRequests = data.refunds.filter((r) => r.status === 'REQUESTED');
  const openRequests = data.financeRequests.filter((r) => r.status === 'OPEN');
  const payable = data.orders.filter(canPay);
  // รับเงินได้เฉพาะออเดอร์ที่ผู้จัดการอนุมัติแล้ว (ขั้นที่ 1 เริ่มหลังอนุมัติ)
  const receivable = payable;
  // ผู้จัดการไม่อนุมัติ / ยกเลิก แต่ยังถือเงินลูกค้า (เช่นเงินจอง) → ต้องคืน
  const toReturn = data.orders.filter(needsRefund);
  const since = data.loadedAt - 30 * 864e5;
  const received = data.payments
    .filter(
      (p) =>
        ['SUCCESS', 'REFUNDED'].includes(p.status) &&
        new Date(p.paymentDate ?? p.createdAt).getTime() >= since,
    )
    .reduce((s, p) => s + toSatang(p.amount), 0);

  async function act(action, success) {
    const result = await run(action, success);
    if (result) reload();
    return result;
  }
  function done(text) {
    setDialog(null);
    setMessage({ ok: true, text });
    reload();
  }

  return (
    <main className="page-content admin-content">
      {header}
      <LoadState error={error} onRetry={reload} />
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
            v: baht(payable.reduce((s, o) => s + outstanding(o), 0)),
            d:
              data.invoices.filter((i) => invoiceStatus(i) === 'OVERDUE')
                .length + ' บิลเกินกำหนด',
          },
          {
            l: 'คำขอคืนเงิน / เรื่องรอตอบ',
            v: refundRequests.length + ' / ' + openRequests.length,
          },
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
          ['pending', 'ตรวจสอบการโอน', pending.length],
          ['refunds', 'คำขอคืนเงิน', refundRequests.length],
          ['orders', 'ยอดค้าง / รับเงิน'],
          ['invoices', 'ใบแจ้งหนี้'],
          ['payments', 'ประวัติรับชำระ'],
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
                  <th scope="col">เลขอ้างอิง</th>
                  <th scope="col" className="num">
                    ยอดแจ้งโอน
                  </th>
                  <th scope="col">ตรวจสอบ</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td>{thDateTime(p.createdAt)}</td>
                    <td>{customerOf(p.orderId)}</td>
                    <td>
                      {p.transactionReference}
                      <span className="pay-sub">
                        {paymentTypes[p.paymentType] ?? 'ชำระยอด'} ·{' '}
                        {paymentMethods[p.paymentMethod]}
                      </span>
                    </td>
                    <td className="num">{money(p.amount)}</td>
                    <td className="acts">
                      <button
                        className="s-act"
                        disabled={busy}
                        onClick={() =>
                          act(
                            () => reviewPayment(p.id, 'SUCCESS'),
                            () =>
                              `ยืนยันยอด ${p.transactionReference} ${money(p.amount)} แล้ว`,
                          )
                        }
                      >
                        ยืนยันยอด
                      </button>
                      <button
                        className="s-act del"
                        disabled={busy}
                        onClick={() =>
                          act(
                            () => reviewPayment(p.id, 'FAILED'),
                            () =>
                              `ปฏิเสธ ${p.transactionReference} — ยอดไม่เข้าบัญชี ลูกค้าต้องแจ้งใหม่`,
                          )
                        }
                      >
                        ไม่พบยอด
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pending.length === 0 && (
              <p className="empty-state">ไม่มีรายการรอตรวจสอบ</p>
            )}
          </div>
        </section>
      )}

      {tab === 'refunds' && (
        <RefundsTab
          data={data}
          customerOf={customerOf}
          onApprove={(refund) => setDialog({ type: 'approve', refund })}
          onReject={(refund) => setDialog({ type: 'reject', refund })}
        />
      )}

      {tab === 'orders' && toReturn.length > 0 && (
        <section className="s-card">
          <h2>ออเดอร์ยกเลิกแล้วแต่ยังไม่คืนเงิน</h2>
          <ul className="small">
            {toReturn.map((o) => (
              <li key={o.orderId}>
                {o.customerName} · {o.orderNumber} · ถือเงินอยู่{' '}
                {baht(netPaid(o))} — คืนได้ที่แท็บ &quot;ประวัติรับชำระ&quot;
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === 'orders' && (
        <section className="s-card flush">
          <div className="s-card-h">
            <h2>ออเดอร์ที่อนุมัติแล้ว ยังชำระไม่ครบ</h2>
          </div>
          <div className="s-tw">
            <table className="s-tbl">
              <thead>
                <tr>
                  <th scope="col">ลูกค้า / ออเดอร์</th>
                  <th scope="col" className="num">
                    ราคาสุทธิ
                  </th>
                  <th scope="col" className="num">
                    ชำระแล้ว
                  </th>
                  <th scope="col" className="num">
                    รอตรวจ
                  </th>
                  <th scope="col" className="num">
                    คงค้าง
                  </th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {receivable.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      {customerOf(o.orderId)}
                      {o.flow && (
                        <span className="pay-sub">
                          {o.flow.currentStep
                            ? `ขั้นที่ ${o.flow.currentStep}/${o.flow.steps.length} · `
                            : ''}
                          {flowWaitingText(o)}
                        </span>
                      )}
                    </td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td className="num">{baht(netPaid(o))}</td>
                    <td className="num">{money(o.pendingAmount)}</td>
                    <td className="num">{baht(outstanding(o))}</td>
                    <td className="acts">
                      <button
                        className="s-act"
                        onClick={() => {
                          setMessage(null);
                          setDialog({ type: 'cash', order: o });
                        }}
                      >
                        รับเงิน / ไฟแนนซ์
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {receivable.length === 0 && (
              <p className="empty-state">ไม่มียอดค้างชำระ</p>
            )}
          </div>
        </section>
      )}

      {tab === 'invoices' && (
        <InvoicesTab
          data={data}
          customerOf={customerOf}
          busy={busy}
          onView={setViewing}
          onCancel={(invoice) =>
            act(
              () => cancelInvoice(invoice.id),
              () => `ยกเลิกใบแจ้งหนี้ ${invoice.invoiceNumber} แล้ว`,
            )
          }
        />
      )}

      {tab === 'payments' && (
        <section className="s-card flush">
          <div className="s-card-h">
            <h2>ประวัติรับชำระ</h2>
          </div>
          <div className="s-tw">
            <table className="s-tbl">
              <thead>
                <tr>
                  <th scope="col">วันที่</th>
                  <th scope="col">ลูกค้า / ออเดอร์</th>
                  <th scope="col">ช่องทาง / อ้างอิง</th>
                  <th scope="col" className="num">
                    ยอด
                  </th>
                  <th scope="col">สถานะ</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {data.payments
                  .filter((p) => p.status !== 'PENDING')
                  .map((p) => {
                    const refundable =
                      p.status === 'SUCCESS' ? refundableSatang(data, p) : 0;
                    return (
                      <tr key={p.id}>
                        <td>{thDateTime(p.paymentDate ?? p.createdAt)}</td>
                        <td>{customerOf(p.orderId)}</td>
                        <td>
                          {paymentTypes[p.paymentType] ?? 'ชำระยอด'} ·{' '}
                          {paymentMethods[p.paymentMethod]}
                          <span className="pay-sub">
                            {[p.financeCompany, p.transactionReference]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </td>
                        <td className="num">{money(p.amount)}</td>
                        <td>
                          <StatusPill kind="payment" status={p.status} />
                        </td>
                        <td className="acts">
                          <ReceiptButton payment={p} />
                          {refundable > 0 && !openRefund(data, p.id) && (
                            <button
                              className="s-act del"
                              onClick={() => {
                                setMessage(null);
                                setDialog({
                                  type: 'refund',
                                  payment: p,
                                  refundable,
                                });
                              }}
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
      )}

      {tab === 'requests' && (
        <section className="s-card">
          <h2>เรื่องจากฝ่ายขาย</h2>
          <div className="pay-thread">
            {data.financeRequests.length === 0 && (
              <p className="empty-state">ไม่มีเรื่องเข้ามา</p>
            )}
            {data.financeRequests.map((r) => {
              const order = orderOf(data, r.orderId);
              return (
                <article className="pay-msg" key={r.id}>
                  <div className="meta">
                    <b>{r.topic}</b>
                    <span>
                      จาก {order?.sellerName} · {order?.orderNumber}{' '}
                      {order?.customerName}
                    </span>
                    <span>{thDateTime(r.createdAt)}</span>
                    <StatusPill kind="request" status={r.status} />
                  </div>
                  <p>{r.message}</p>
                  {r.reply ? (
                    <div className="pay-reply">
                      <b>การเงิน:</b> {r.reply}
                    </div>
                  ) : (
                    <form
                      className="pay-reply-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const reply = String(
                          new FormData(event.currentTarget).get('reply'),
                        );
                        act(
                          () => replyFinanceRequest(r.id, reply),
                          () => `ตอบเรื่อง "${r.topic}" แล้ว`,
                        );
                      }}
                    >
                      <input
                        className="s-in"
                        name="reply"
                        aria-label={'ตอบเรื่อง ' + r.topic}
                        placeholder="พิมพ์คำตอบถึงฝ่ายขาย…"
                        maxLength={500}
                        required
                      />
                      <button
                        className="s-btn pri sm"
                        type="submit"
                        disabled={busy}
                      >
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
          order={dialog.order}
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
      {(dialog?.type === 'approve' || dialog?.type === 'reject') && (
        <ReviewRefundDialog
          refund={dialog.refund}
          approve={dialog.type === 'approve'}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
    </main>
  );
}

function RefundsTab({ data, customerOf, onApprove, onReject }) {
  const rows = [...data.refunds].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  );
  return (
    <section className="s-card flush">
      <div className="s-card-h">
        <h2>คำขอคืนเงิน</h2>
      </div>
      <div className="s-tw">
        <table className="s-tbl">
          <thead>
            <tr>
              <th scope="col">ขอเมื่อ</th>
              <th scope="col">ลูกค้า / ออเดอร์</th>
              <th scope="col">เหตุผล</th>
              <th scope="col" className="num">
                ยอดคืน
              </th>
              <th scope="col">สถานะ</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{thDateTime(r.createdAt)}</td>
                <td>{customerOf(r.orderId)}</td>
                <td>
                  {r.reason}
                  {r.reviewNote && (
                    <span className="pay-sub">หมายเหตุ: {r.reviewNote}</span>
                  )}
                  {r.refundReference && (
                    <span className="pay-sub">อ้างอิง {r.refundReference}</span>
                  )}
                </td>
                <td className="num">{money(r.amount)}</td>
                <td>
                  <StatusPill kind="refund" status={r.status} />
                </td>
                <td className="acts">
                  {r.status === 'REQUESTED' && (
                    <>
                      <button className="s-act" onClick={() => onApprove(r)}>
                        อนุมัติคืนเงิน
                      </button>
                      <button className="s-act del" onClick={() => onReject(r)}>
                        ไม่อนุมัติ
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="empty-state">ยังไม่มีคำขอคืนเงิน</p>
        )}
      </div>
    </section>
  );
}

const invoiceFilters = [
  ['all', 'ทั้งหมด'],
  ['ISSUED', 'รอชำระ'],
  ['OVERDUE', 'เกินกำหนด'],
  ['PAID', 'ชำระครบ'],
  ['CANCELLED', 'ยกเลิกบิล'],
];

function InvoicesTab({ data, customerOf, busy, onView, onCancel }) {
  const [filter, setFilter] = useState('all');
  const rows = data.invoices
    .map((invoice) => ({ invoice, status: invoiceStatus(invoice) }))
    .filter((row) => filter === 'all' || row.status === filter);
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
              <th scope="col" className="num">
                ยอดบิล
              </th>
              <th scope="col">ออกเมื่อ</th>
              <th scope="col">ครบกำหนด</th>
              <th scope="col">สถานะ</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ invoice, status }) => (
              <tr key={invoice.id}>
                <td>
                  <button className="s-act" onClick={() => onView(invoice)}>
                    {invoice.invoiceNumber}
                  </button>
                </td>
                <td>{customerOf(invoice.orderId)}</td>
                <td className="num">{money(invoice.amount)}</td>
                <td>{thDate(invoice.issueDate)}</td>
                <td>{thDate(invoice.dueDate)}</td>
                <td>
                  <StatusPill kind="invoice" status={status} />
                </td>
                <td className="acts">
                  {invoice.status === 'ISSUED' &&
                    activeInvoice(data, invoice.orderId)?.id === invoice.id && (
                      <button
                        className="s-act del"
                        disabled={busy}
                        onClick={() => onCancel(invoice)}
                      >
                        ยกเลิกบิล
                      </button>
                    )}
                </td>
              </tr>
            ))}
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

// รับเงินที่โชว์รูม ตามขั้นตอนของออเดอร์ (staffPaymentOptions):
// ขั้น 1 เงินจอง · ขั้น 3 เงินดาวน์ (ยอดตายตัว + บริษัทไฟแนนซ์) · ขั้น 4 ยอดจัดที่ไฟแนนซ์โอนเข้ามา / ยอดที่เหลือ
function CashDialog({ order, onClose, onDone }) {
  const remaining = outstanding(order);
  const options = staffPaymentOptions(order);
  // ซื้อผ่อนขั้นที่ 4: ยอดที่เหลือคือยอดจัดที่ไฟแนนซ์โอนเข้ามา
  const [method, setMethod] = useState(
    !options.types.length ||
      (options.finance && order.flow?.plan === 'FINANCE')
      ? 'FINANCE'
      : 'CASH',
  );
  const [type, setType] = useState(options.types[0] ?? 'BALANCE');
  const isDown = method === 'CASH' && type === 'DOWN_PAYMENT';
  const fixedAmount = isDown
    ? toSatang(order.flow.downPayment.dueAmount)
    : null;
  let maxAmount = remaining;
  if (method === 'CASH' && type === 'BOOKING_DEPOSIT')
    maxAmount = Math.min(remaining, DEPOSIT_LIMIT_SATANG);
  // ยอดจัดตามใบจอง (ซื้อผ่อน) เป็นค่าเริ่มต้นของยอดที่ไฟแนนซ์โอน
  const suggested =
    method === 'FINANCE' && order.flow?.finance
      ? Math.min(maxAmount, toSatang(order.flow.finance.amount))
      : maxAmount;
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [message, run, , busy] = useAction();
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body =
      method === 'FINANCE'
        ? {
            amount: String(form.get('amount')),
            paymentMethod: 'FINANCE',
            paymentType: 'FINANCE_DISBURSEMENT',
            financeCompany: String(form.get('company')),
            transactionReference: String(form.get('contract')),
          }
        : {
            amount: isDown
              ? satangInput(fixedAmount)
              : String(form.get('amount')),
            paymentMethod: 'CASH',
            paymentType: type,
            ...(isDown ? { financeCompany: String(form.get('company')) } : {}),
          };
    const payment = await run(() =>
      createPayment(order.orderId, body, idempotencyKey),
    );
    if (payment)
      onDone(
        `บันทึก${paymentTypes[payment.paymentType]} ${money(payment.amount)} (${payment.transactionReference}) ของ ${order.orderNumber} แล้ว`,
      );
  }
  const nothing = !options.types.length && !options.finance;
  return (
    <Dialog title="บันทึกรับเงินที่โชว์รูม" onClose={onClose}>
      <p className="small">
        {order.customerName} · {order.orderNumber} · คงค้าง {baht(remaining)}
        {order.flow && <> · {flowWaitingText(order)}</>}
      </p>
      {nothing ? (
        <p className="empty-state">
          ขั้นนี้ยังรับเงินไม่ได้ (รอตรวจยอดที่แจ้งโอนไว้ก่อน)
        </p>
      ) : (
        <form className="s-form" onSubmit={submit}>
          <label className="s-fld">
            <span>รับเงินจาก *</span>
            <select
              className="s-in"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {options.types.length > 0 && (
                <option value="CASH">ลูกค้าจ่ายเงินสด</option>
              )}
              {options.finance && (
                <option value="FINANCE">บริษัทไฟแนนซ์โอนยอดจัด</option>
              )}
            </select>
          </label>
          {method === 'CASH' ? (
            <label className="s-fld">
              <span>ชำระเป็น *</span>
              <select
                className="s-in"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {options.types.map((key) => (
                  <option key={key} value={key}>
                    {paymentTypes[key]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="s-fld">
              <span>เลขที่สัญญาเช่าซื้อ *</span>
              <input
                className="s-in"
                name="contract"
                placeholder="เช่น HP-2569-000123"
                maxLength={150}
                required
              />
            </label>
          )}
          {(method === 'FINANCE' || isDown) && (
            <label className="s-fld wide">
              <span>
                {isDown ? 'บริษัทไฟแนนซ์ที่อนุมัติสินเชื่อ *' : 'บริษัทไฟแนนซ์ *'}
              </span>
              <input
                className="s-in"
                name="company"
                placeholder="เช่น โตโยตี้ ลีสซิ่ง"
                defaultValue={order.flow?.downPayment?.financeCompany ?? ''}
                maxLength={150}
                required
              />
            </label>
          )}
          {isDown ? (
            <div className="s-fld wide">
              <span className="lb">เงินดาวน์ (เต็มจำนวน หักเงินจองแล้ว)</span>
              <span className="pay-fixed">{baht(fixedAmount)}</span>
            </div>
          ) : (
            <label className="s-fld wide">
              <span>จำนวนเงินที่รับ (บาท) *</span>
              <input
                key={method + type}
                className="s-in"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                max={satangInput(maxAmount)}
                defaultValue={satangInput(suggested)}
                required
              />
            </label>
          )}
          <div className="s-form-f">
            <button className="s-btn pri" type="submit" disabled={busy}>
              บันทึกรับเงิน
            </button>
          </div>
          <FormMessage message={message} />
        </form>
      )}
    </Dialog>
  );
}

// ฝ่ายการเงินเปิดคำขอคืนเงินแทนลูกค้า แล้วไปอนุมัติที่แท็บ "คำขอคืนเงิน"
function RefundDialog({ payment, refundable, onClose, onDone }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [message, run, , busy] = useAction();
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const refund = await run(() =>
      requestRefund(
        payment.id,
        {
          amount: String(form.get('amount')),
          reason: String(form.get('reason')),
        },
        idempotencyKey,
      ),
    );
    if (refund)
      onDone(
        `สร้างคำขอคืนเงิน ${money(refund.amount)} แล้ว — อนุมัติได้ที่แท็บ "คำขอคืนเงิน"`,
      );
  }
  return (
    <Dialog title={'คืนเงิน ' + payment.transactionReference} onClose={onClose}>
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
            max={satangInput(refundable)}
            defaultValue={satangInput(refundable)}
            required
          />
        </label>
        <label className="s-fld wide">
          <span>เหตุผล *</span>
          <textarea
            className="s-in"
            name="reason"
            maxLength={500}
            required
            placeholder="เช่น ลูกค้ายกเลิกการจอง / ชำระซ้ำ"
          />
        </label>
        <div className="s-form-f">
          <button className="s-btn pri" type="submit" disabled={busy}>
            สร้างคำขอคืนเงิน
          </button>
        </div>
        <FormMessage message={message} />
      </form>
    </Dialog>
  );
}

function ReviewRefundDialog({ refund, approve, onClose, onDone }) {
  const [message, run, , busy] = useAction();
  async function submit(event) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('value'));
    const result = await run(() =>
      approve
        ? approveRefund(refund.id, value)
        : rejectRefund(refund.id, value),
    );
    if (result)
      onDone(
        approve
          ? `คืนเงิน ${money(refund.amount)} แล้ว (อ้างอิง ${value})`
          : `ไม่อนุมัติคำขอคืนเงิน ${money(refund.amount)}`,
      );
  }
  return (
    <Dialog
      title={approve ? 'อนุมัติคืนเงิน' : 'ไม่อนุมัติคืนเงิน'}
      onClose={onClose}
    >
      <p className="small">
        ยอด {money(refund.amount)} · เหตุผลลูกค้า: {refund.reason}
      </p>
      <form className="s-form" onSubmit={submit}>
        <label className="s-fld wide">
          <span>
            {approve ? 'เลขอ้างอิงการโอนคืน *' : 'เหตุผลที่ไม่อนุมัติ *'}
          </span>
          <input
            className="s-in"
            name="value"
            maxLength={approve ? 150 : 500}
            placeholder={approve ? 'เช่น RF-2569111301' : 'เช่น เอกสารไม่ครบ'}
            required
          />
        </label>
        <div className="s-form-f">
          <button
            className={'s-btn ' + (approve ? 'pri' : 'out')}
            type="submit"
            disabled={busy}
          >
            {approve ? 'ยืนยันคืนเงิน' : 'ยืนยันไม่อนุมัติ'}
          </button>
        </div>
        <FormMessage message={message} />
      </form>
    </Dialog>
  );
}
