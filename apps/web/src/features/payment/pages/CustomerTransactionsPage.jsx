import { useState } from 'react';
import {
  createPayment,
  downloadBookingPdf,
  requestRefund,
} from '../api/paymentApi.js';
import {
  Dialog,
  FlowSteps,
  FormMessage,
  InvoiceDialog,
  Kpis,
  LoadState,
  PageHeader,
  Progress,
  ReceiptButton,
  SimNote,
  StatusPill,
} from '../components/FinanceUi.jsx';
import InstallmentCalculator from '../components/InstallmentCalculator.jsx';
import DeliveryStatus from '../components/DeliveryStatus.jsx';
import { useAction, usePaymentData } from '../hooks/usePaymentData.js';
import {
  activeInvoice,
  canPay,
  carLabel,
  customerNextPayment,
  flowWaitingText,
  inProgress,
  netPaid,
  openRefund,
  orderOf,
  outstanding,
  refundableSatang,
} from '../utils/finance.js';
import {
  baht,
  CARD_LIMIT_SATANG,
  DEPOSIT_LIMIT_SATANG,
  money,
  paymentMethods,
  paymentTypes,
  satangInput,
  thDateTime,
  toSatang,
} from '../utils/format.js';

// backend ส่งเฉพาะออเดอร์ของลูกค้าที่ login อยู่
export default function CustomerTransactionsPage() {
  const { data, error, loading, reload } = usePaymentData({ refreshMs: 30000 });
  const [dialog, setDialog] = useState(null);
  const [message, run, setMessage] = useAction();

  function done(text) {
    setDialog(null);
    setMessage({ ok: true, text });
    reload();
  }

  const header = (
    <PageHeader
      crumb="บัญชีลูกค้า / ประวัติธุรกรรม"
      title="ประวัติธุรกรรม"
      sub="ดูยอดที่ต้องชำระ ชำระเงิน ขอคืนเงิน และติดตามสถานะส่งมอบรถของคุณ"
    >
      <button type="button" className="s-btn" onClick={reload}>
        รีเฟรชข้อมูล
      </button>
    </PageHeader>
  );
  if (!data)
    return (
      <div className="page-content">
        {header}
        <LoadState loading={loading} error={error} onRetry={reload} />
      </div>
    );

  const toPay = data.orders.filter(canPay);
  // ทุกออเดอร์ที่ยังไม่ได้รับรถ: รออนุมัติ → จอง → ยื่นไฟแนนซ์ → ดาวน์ → รับรถ
  const bills = data.orders.filter(inProgress);
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
          <h2>ออเดอร์ที่กำลังดำเนินการ</h2>
          <span className="cnt">{bills.length} รายการ</span>
        </div>
        {bills.length === 0 ? (
          <p className="empty-state">ไม่มีออเดอร์ที่ต้องดำเนินการ</p>
        ) : (
          <div className="pay-bills">
            {bills.map((order) => {
              const invoice = activeInvoice(data, order.orderId);
              const flow = order.flow;
              const next = customerNextPayment(order);
              const due =
                next === 'DOWN_PAYMENT'
                  ? toSatang(flow.downPayment.dueAmount)
                  : outstanding(order);
              return (
                <article className="s-card pay-bill" key={order.orderId}>
                  <div className="top">
                    <div>
                      <b>{carLabel(order)}</b>
                      <span className="pay-sub">
                        {order.orderNumber}
                        {invoice && ' · ' + invoice.invoiceNumber}
                        {' · '}
                        {flow.plan === 'FINANCE' ? 'ซื้อผ่อน' : 'ซื้อเงินสด'}
                      </span>
                      {order.car.configuration && (
                        <span className="pay-sub">
                          {order.car.configuration.trimName} ·{' '}
                          {order.car.configuration.colorName} ·{' '}
                          {order.car.configuration.wheelName}
                        </span>
                      )}
                      {order.installmentCount && (
                        <span className="pay-sub">
                          ดาวน์ {order.downPaymentPercent}% (
                          {money(order.downPayment)}) · ดอกเบี้ย{' '}
                          {order.interestRate}% · {order.installmentCount} งวด /{' '}
                          {order.installmentYears} ปี
                        </span>
                      )}
                    </div>
                    <StatusPill kind="order" status={order.orderStatus} />
                  </div>
                  <FlowSteps flow={flow} />
                  {next && (
                    <>
                      <span className="amt">{baht(due)}</span>
                      <span className="small">
                        {next === 'BOOKING_DEPOSIT'
                          ? `ขั้นที่ 1: ชำระเงินจอง ไม่เกิน ${baht(DEPOSIT_LIMIT_SATANG)} (หักเป็นส่วนหนึ่งของเงินดาวน์)`
                          : next === 'DOWN_PAYMENT'
                            ? `เงินดาวน์ ${money(flow.downPayment.agreedAmount)} หักเงินจอง ${money(flow.downPayment.depositDeducted)} · ชำระเต็มจำนวนครั้งเดียว`
                            : 'ราคาสุทธิ ' + money(order.totalAmount)}
                      </span>
                    </>
                  )}
                  <span className="pay-wait">{flowWaitingText(order)}</span>
                  <div className="s-btns">
                    {next && (
                      <button
                        className="s-btn pri"
                        onClick={() => {
                          setMessage(null);
                          setDialog({ type: 'pay', order, paymentType: next });
                        }}
                      >
                        {next === 'BOOKING_DEPOSIT'
                          ? 'ชำระเงินจอง'
                          : next === 'DOWN_PAYMENT'
                            ? 'ไฟแนนซ์อนุมัติแล้ว — ชำระเงินดาวน์'
                            : 'ชำระเงิน'}
                      </button>
                    )}
                    {flow.bookingDocumentAvailable && (
                      <button
                        className={
                          flow.plan === 'FINANCE' && flow.currentStep === 2
                            ? 's-btn'
                            : 's-act'
                        }
                        onClick={() =>
                          run(() => downloadBookingPdf(order), null)
                        }
                      >
                        ดาวน์โหลดใบจอง
                      </button>
                    )}
                    {flow.plan === 'FINANCE' && (
                      <button
                        className="s-act"
                        onClick={() => setDialog({ type: 'loan', order })}
                      >
                        คำนวณค่างวดผ่อน
                      </button>
                    )}
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
                <th scope="col">การส่งมอบรถ</th>
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
                      <DeliveryStatus order={o} />
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
                        ? `${paymentTypes[item.paymentType] ?? 'ชำระยอด'} · ${paymentMethods[item.paymentMethod]}`
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
                      {kind === 'payment' && <ReceiptButton payment={item} />}
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
          paymentType={dialog.paymentType}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog?.type === 'loan' && (
        <Dialog
          title={'คำนวณค่างวดผ่อน ' + dialog.order.orderNumber}
          onClose={() => setDialog(null)}
        >
          <p className="small">
            {carLabel(dialog.order)} · ราคาสุทธิ{' '}
            {money(dialog.order.totalAmount)}
          </p>
          <InstallmentCalculator price={dialog.order.totalAmount} />
        </Dialog>
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

// ชนิดยอดมาจากขั้นตอนปัจจุบัน (customerNextPayment): ลูกค้าไม่ต้องเลือกเอง
function PayDialog({ order, paymentType: type, onClose, onDone }) {
  const flow = order.flow;
  const remaining = outstanding(order);
  const isDown = type === 'DOWN_PAYMENT';
  // เงินดาวน์ = ยอดตายตัว (ดาวน์ตามสัญญา − เงินจอง) ต้องจ่ายครบในครั้งเดียว
  const fixedAmount = isDown ? toSatang(flow.downPayment.dueAmount) : null;
  const [method, setMethod] = useState('BANK_TRANSFER');
  let maxAmount = remaining;
  if (method === 'CREDIT_CARD')
    maxAmount = Math.min(maxAmount, CARD_LIMIT_SATANG);
  if (type === 'BOOKING_DEPOSIT')
    maxAmount = Math.min(maxAmount, DEPOSIT_LIMIT_SATANG);
  // เงินจองที่โชว์รูมทั่วไปเรียก ~20,000 บาท
  const suggested =
    type === 'BOOKING_DEPOSIT' ? Math.min(maxAmount, 20000 * 100) : maxAmount;
  const cardTooSmall =
    isDown && method === 'CREDIT_CARD' && fixedAmount > CARD_LIMIT_SATANG;
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
          amount: isDown
            ? satangInput(fixedAmount)
            : String(form.get('amount')),
          paymentMethod: method,
          paymentType: type,
          ...(isDown
            ? { financeCompany: String(form.get('financeCompany')) }
            : {}),
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
          ? `ชำระ${paymentTypes[type]} ${money(created.amount)} สำเร็จ (${created.transactionReference}) — ระบบจำลองอนุมัติบัตรทันที`
          : `แจ้งโอน${paymentTypes[type]} ${money(created.amount)} แล้ว (${created.transactionReference}) รอฝ่ายการเงินตรวจสอบยอด`,
      );
  }

  return (
    <Dialog
      title={'ชำระ' + paymentTypes[type] + ' ' + order.orderNumber}
      onClose={onClose}
    >
      <p className="small">
        {carLabel(order)} · ราคาสุทธิ {money(order.totalAmount)}
        {type === 'BOOKING_DEPOSIT' &&
          flow.plan === 'FINANCE' &&
          ' · จ่ายแล้วดาวน์โหลดใบจองไปยื่นไฟแนนซ์ได้ทันที'}
      </p>
      <form className="s-form" onSubmit={submit}>
        {isDown && (
          <div className="s-fld wide">
            <span className="lb">ยอดเงินดาวน์ที่ต้องชำระ (เต็มจำนวน)</span>
            <span className="pay-fixed">{baht(fixedAmount)}</span>
            <span className="pay-sub">
              ดาวน์ตามสัญญา {money(flow.downPayment.agreedAmount)} − เงินจอง{' '}
              {money(flow.downPayment.depositDeducted)} · ยอดจัดไฟแนนซ์{' '}
              {money(flow.finance.amount)} บริษัทไฟแนนซ์จะโอนให้ศูนย์เอง
            </span>
          </div>
        )}
        {isDown && (
          <label className="s-fld wide">
            <span>บริษัทไฟแนนซ์ที่อนุมัติสินเชื่อ *</span>
            <input
              className="s-in"
              name="financeCompany"
              placeholder="เช่น โตโยตี้ ลีสซิ่ง"
              maxLength={150}
              required
            />
          </label>
        )}
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
                    : `จำลองการตัดบัตร อนุมัติทันที · รวมไม่เกิน ${baht(CARD_LIMIT_SATANG)} ต่อออเดอร์`}
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
        {cardTooSmall && (
          <p className="s-fld wide small pay-error">
            เงินดาวน์เกินวงเงินบัตร {baht(CARD_LIMIT_SATANG)} ต่อออเดอร์
            กรุณาเลือกโอนเงิน
          </p>
        )}
        {!isDown && (
          <label className="s-fld">
            <span>จำนวนเงิน (บาท) *</span>
            <input
              key={method}
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
        {type === 'DOWN_PAYMENT' && (
          <p className="s-fld wide small">
            ยอดจัดไฟแนนซ์ไม่ต้องจ่ายเอง
            ฝ่ายการเงินจะบันทึกให้เมื่อบริษัทไฟแนนซ์โอนเงินเข้าโชว์รูม
          </p>
        )}
        <div className="s-form-f">
          <button
            className="s-btn pri"
            type="submit"
            disabled={busy || cardTooSmall}
          >
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
