import { useState } from 'react';
import { createPayment, requestRefund } from '../api/paymentApi.js';
import {
  Dialog,
  FormMessage,
  InvoiceDialog,
  Kpis,
  LoadState,
  PageHeader,
  Progress,
  SimNote,
  StatusPill,
} from '../components/FinanceUi.jsx';
import { useAction, usePaymentData } from '../hooks/usePaymentData.js';
import {
  activeInvoice,
  canPay,
  carLabel,
  invoiceStatus,
  netPaid,
  openRefund,
  orderOf,
  outstanding,
  refundableSatang,
} from '../utils/finance.js';
import {
  baht,
  money,
  paymentMethods,
  satangInput,
  thDate,
  thDateTime,
  toSatang,
} from '../utils/format.js';

// backend ส่งเฉพาะออเดอร์ของลูกค้าที่ login อยู่
export default function CustomerTransactionsPage() {
  const { data, error, loading, reload } = usePaymentData();
  const [dialog, setDialog] = useState(null);
  const [message, , setMessage] = useAction();

  function done(text) {
    setDialog(null);
    setMessage({ ok: true, text });
    reload();
  }

  const header = (
    <PageHeader
      crumb="บัญชีลูกค้า / ประวัติธุรกรรม"
      title="ประวัติธุรกรรม"
      sub="ดูยอดที่ต้องชำระ ชำระเงิน ขอคืนเงิน และย้อนดูการชำระทั้งหมดของคุณ"
    />
  );
  if (!data)
    return (
      <div className="page-content">
        {header}
        <LoadState loading={loading} error={error} onRetry={reload} />
      </div>
    );

  const toPay = data.orders.filter(canPay);
  const waiting = data.orders.filter((o) => o.orderStatus === 'PENDING');
  const history = [
    ...data.payments.map((p) => ({
      kind: 'payment',
      at: p.paymentDate ?? p.createdAt,
      item: p,
    })),
    ...data.refunds.map((r) => ({
      kind: 'refund',
      at: r.reviewedAt ?? r.createdAt,
      item: r,
    })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));

  const sum = (pick) => data.orders.reduce((s, o) => s + pick(o), 0);
  const due = toPay.reduce((s, o) => s + outstanding(o), 0);

  return (
    <div className="page-content">
      {header}
      <SimNote />
      <LoadState error={error} onRetry={reload} />
      <Kpis
        items={[
          { l: 'ยอดที่ต้องชำระ', v: baht(due), d: toPay.length + ' ออเดอร์' },
          {
            l: 'รอฝ่ายการเงินตรวจสอบ',
            v: baht(sum((o) => toSatang(o.pendingAmount))),
          },
          { l: 'ชำระแล้วสุทธิ', v: baht(sum(netPaid)) },
        ]}
      />
      <FormMessage message={message} />

      <section>
        <div className="s-sec-h">
          <h2>ออเดอร์ที่ต้องชำระ</h2>
          <span className="cnt">{toPay.length} รายการ</span>
        </div>
        {toPay.length === 0 ? (
          <p className="empty-state">
            ไม่มียอดค้างชำระ
            {waiting.length > 0 &&
              ` · มี ${waiting.length} ออเดอร์รอผู้จัดการอนุมัติก่อนชำระ`}
          </p>
        ) : (
          <div className="pay-bills">
            {toPay.map((order) => {
              const invoice = activeInvoice(data, order.orderId);
              const pending = toSatang(order.pendingAmount);
              return (
                <article className="s-card pay-bill" key={order.orderId}>
                  <div className="top">
                    <div>
                      <b>{carLabel(order)}</b>
                      <span className="pay-sub">
                        {order.orderNumber}
                        {invoice && ' · ' + invoice.invoiceNumber}
                      </span>
                    </div>
                    {invoice ? (
                      <StatusPill
                        kind="invoice"
                        status={invoiceStatus(invoice)}
                      />
                    ) : (
                      <StatusPill kind="order" status={order.orderStatus} />
                    )}
                  </div>
                  <span className="amt">{baht(outstanding(order))}</span>
                  <span className="small">
                    {invoice?.dueDate
                      ? 'ครบกำหนด ' + thDate(invoice.dueDate)
                      : 'ราคาสุทธิ ' + money(order.totalAmount)}
                    {pending > 0 && ` · รอตรวจสอบ ${baht(pending)}`}
                  </span>
                  <div className="s-btns">
                    <button
                      className="s-btn pri"
                      onClick={() => {
                        setMessage(null);
                        setDialog({ type: 'pay', order });
                      }}
                    >
                      ชำระเงิน
                    </button>
                    {invoice && (
                      <button
                        className="s-act"
                        onClick={() => setDialog({ type: 'invoice', invoice })}
                      >
                        ดูใบแจ้งหนี้
                      </button>
                    )}
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
                <th scope="col">เอกสาร</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => {
                const invoice = activeInvoice(data, o.orderId);
                return (
                  <tr key={o.orderId}>
                    <td>{o.orderNumber}</td>
                    <td>{carLabel(o)}</td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td className="num">{baht(netPaid(o))}</td>
                    <td>
                      <Progress
                        value={netPaid(o)}
                        total={toSatang(o.totalAmount)}
                      />
                    </td>
                    <td>
                      <StatusPill kind="order" status={o.orderStatus} />
                    </td>
                    <td>
                      {invoice ? (
                        <button
                          className="s-act"
                          onClick={() =>
                            setDialog({ type: 'invoice', invoice })
                          }
                        >
                          {invoice.invoiceNumber}
                        </button>
                      ) : (
                        <span className="small">ยังไม่ออกบิล</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.orders.length === 0 && (
            <p className="empty-state">ยังไม่มีออเดอร์</p>
          )}
        </div>
      </section>

      <section className="s-card flush">
        <div className="s-card-h">
          <h2>ประวัติการชำระเงินและคืนเงิน</h2>
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
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {history.map(({ kind, at, item }) => {
                const order = orderOf(data, item.orderId);
                const refundable =
                  kind === 'payment' && item.status === 'SUCCESS'
                    ? refundableSatang(data, item)
                    : 0;
                return (
                  <tr key={kind + item.id}>
                    <td>{thDateTime(at)}</td>
                    <td>
                      {kind === 'payment'
                        ? 'ชำระค่ารถ'
                        : 'คืนเงิน: ' + item.reason}
                      <span className="pay-sub">
                        {order?.orderNumber} {order && carLabel(order)}
                      </span>
                      {kind === 'refund' && item.reviewNote && (
                        <span className="pay-sub">
                          การเงิน: {item.reviewNote}
                        </span>
                      )}
                    </td>
                    <td>
                      {kind === 'payment'
                        ? paymentMethods[item.paymentMethod]
                        : 'คืนเข้าช่องทางเดิม'}
                      <span className="pay-sub">
                        {kind === 'payment'
                          ? item.transactionReference
                          : item.refundReference}
                      </span>
                    </td>
                    <td className="num">
                      {kind === 'refund' && '−'}
                      {money(item.amount)}
                    </td>
                    <td>
                      <StatusPill kind={kind} status={item.status} />
                    </td>
                    <td className="acts">
                      {refundable > 0 &&
                        (openRefund(data, item.id) ? (
                          <span className="small">มีคำขอคืนเงินรออยู่</span>
                        ) : (
                          <button
                            className="s-act del"
                            onClick={() => {
                              setMessage(null);
                              setDialog({
                                type: 'refund',
                                payment: item,
                                refundable,
                              });
                            }}
                          >
                            ขอคืนเงิน
                          </button>
                        ))}
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

      {dialog?.type === 'pay' && (
        <PayDialog
          order={dialog.order}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog?.type === 'refund' && (
        <RefundRequestDialog
          payment={dialog.payment}
          refundable={dialog.refundable}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog?.type === 'invoice' && (
        <InvoiceDialog
          data={data}
          invoice={dialog.invoice}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function PayDialog({ order, onClose, onDone }) {
  const remaining = outstanding(order);
  const [method, setMethod] = useState('BANK_TRANSFER');
  // หนึ่ง dialog = หนึ่ง Idempotency-Key กดซ้ำไม่เกิดรายการซ้ำ
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [message, run, , busy] = useAction();

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await run(() =>
      createPayment(
        order.orderId,
        {
          amount: String(form.get('amount')),
          paymentMethod: method,
          ...(method === 'BANK_TRANSFER'
            ? { transactionReference: String(form.get('reference')) }
            : {}),
        },
        idempotencyKey,
      ),
    );
    if (created)
      onDone(
        created.status === 'SUCCESS'
          ? `ชำระเงิน ${money(created.amount)} สำเร็จ (${created.transactionReference}) — ระบบจำลองอนุมัติบัตรทันที`
          : `แจ้งโอน ${money(created.amount)} แล้ว (${created.transactionReference}) รอฝ่ายการเงินตรวจสอบยอด`,
      );
  }

  return (
    <Dialog title={'ชำระเงิน ' + order.orderNumber} onClose={onClose}>
      <p className="small">
        {carLabel(order)} · ยอดคงค้าง {baht(remaining)}
      </p>
      <form className="s-form" onSubmit={submit}>
        <fieldset className="s-fld wide pay-methods">
          <legend className="lb">ช่องทางชำระ *</legend>
          {['BANK_TRANSFER', 'CREDIT_CARD'].map((key) => (
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
                  {key === 'BANK_TRANSFER'
                    ? 'โอนแล้วกรอกเลขอ้างอิง ฝ่ายการเงินจะตรวจยอดภายใน 1 วันทำการ'
                    : 'จำลองการตัดบัตร อนุมัติทันที ไม่ต้องกรอกข้อมูลบัตรจริง'}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
        {method === 'BANK_TRANSFER' && (
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
            max={satangInput(remaining)}
            defaultValue={satangInput(remaining)}
            required
          />
        </label>
        {method === 'BANK_TRANSFER' && (
          <label className="s-fld">
            <span>เลขอ้างอิงการโอน *</span>
            <input
              className="s-in"
              name="reference"
              placeholder="เช่น KBANK-2569101301"
              maxLength={150}
              required
            />
          </label>
        )}
        <div className="s-form-f">
          <button className="s-btn pri" type="submit" disabled={busy}>
            {method === 'CREDIT_CARD' ? 'ชำระด้วยบัตร (จำลอง)' : 'แจ้งโอนเงิน'}
          </button>
        </div>
        <FormMessage message={message} />
      </form>
    </Dialog>
  );
}

function RefundRequestDialog({ payment, refundable, onClose, onDone }) {
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
        `ส่งคำขอคืนเงิน ${money(refund.amount)} แล้ว รอฝ่ายการเงินพิจารณา`,
      );
  }
  return (
    <Dialog title="ขอคืนเงิน" onClose={onClose}>
      <p className="small">
        ชำระ {money(payment.amount)} ผ่าน{' '}
        {paymentMethods[payment.paymentMethod]} · ขอคืนได้สูงสุด{' '}
        {baht(refundable)}
      </p>
      <form className="s-form" onSubmit={submit}>
        <label className="s-fld">
          <span>ยอดที่ขอคืน (บาท) *</span>
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
            placeholder="เช่น ยกเลิกการซื้อ / ชำระซ้ำ"
          />
        </label>
        <div className="s-form-f">
          <button className="s-btn pri" type="submit" disabled={busy}>
            ส่งคำขอคืนเงิน
          </button>
        </div>
        <FormMessage message={message} />
      </form>
    </Dialog>
  );
}
