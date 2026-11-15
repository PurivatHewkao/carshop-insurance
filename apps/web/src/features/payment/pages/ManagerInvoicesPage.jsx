import { useState } from 'react';
import { cancelInvoice, createInvoice } from '../api/paymentApi.js';
import {
  FormMessage,
  InvoiceDialog,
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
} from '../utils/finance.js';
import { baht, dateInput, money, thDate, toSatang } from '../utils/format.js';

// ใบแจ้งหนี้ 1 ใบต่อออเดอร์ = ราคาสุทธิทั้งหมด (ลูกค้าแบ่งจ่ายหลายครั้งได้)
export default function ManagerInvoicesPage() {
  const { data, error, loading, reload } = usePaymentData();
  const [orderId, setOrderId] = useState('');
  const [viewing, setViewing] = useState(null);
  const [message, run, , busy] = useAction();

  const header = (
    <PageHeader
      crumb="Workspace / ออกบิลส่งการเงิน"
      title="ออกบิลส่งการเงิน"
      sub="ออกใบแจ้งหนี้จากออเดอร์ที่อนุมัติแล้ว ลูกค้าเห็นบิลในหน้าประวัติธุรกรรม และฝ่ายการเงินติดตามยอดต่อ"
    />
  );
  if (!data)
    return (
      <main className="page-content admin-content">
        {header}
        <LoadState loading={loading} error={error} onRetry={reload} />
      </main>
    );

  const orders = data.orders.filter((o) => o.orderStatus !== 'CANCELLED');
  const billable = orders.filter((o) => canInvoice(data, o));
  const selected = billable.find((o) => o.orderId === orderId);
  const issued = [...data.invoices].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  );
  const statusCount = (status) =>
    issued.filter((i) => invoiceStatus(i) === status).length;

  async function submit(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const dueDate = String(new FormData(formEl).get('dueDate'));
    const invoice = await run(
      () => createInvoice(orderId, dueDate),
      (inv) =>
        `ออกใบแจ้งหนี้ ${inv.invoiceNumber} ${money(inv.amount)} แล้ว ลูกค้าและฝ่ายการเงินเห็นในระบบทันที`,
    );
    if (invoice) {
      formEl.reset();
      setOrderId('');
      reload();
    }
  }

  async function cancel(invoice) {
    const done = await run(
      () => cancelInvoice(invoice.id),
      () => `ยกเลิกใบแจ้งหนี้ ${invoice.invoiceNumber} แล้ว ออกใบใหม่ได้`,
    );
    if (done) reload();
  }

  function pick(id) {
    setOrderId(id);
    document
      .getElementById('invoice-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="page-content admin-content">
      {header}
      <LoadState error={error} onRetry={reload} />
      <Kpis
        items={[
          { l: 'ออเดอร์รอออกบิล', v: billable.length },
          { l: 'บิลรอชำระ', v: statusCount('ISSUED') },
          { l: 'บิลเกินกำหนด', v: statusCount('OVERDUE') },
          { l: 'บิลชำระครบ', v: statusCount('PAID') },
        ]}
      />
      <FormMessage message={message} />

      <section className="s-card flush">
        <div className="s-card-h">
          <h2>ออเดอร์และใบแจ้งหนี้</h2>
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
                <th scope="col">ใบแจ้งหนี้</th>
                <th scope="col">สถานะออเดอร์</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const invoice = activeInvoice(data, o.orderId);
                return (
                  <tr key={o.orderId}>
                    <td>{o.orderNumber}</td>
                    <td>
                      {o.customerName}
                      <span className="pay-sub">
                        {carLabel(o)} · ฝ่ายขาย {o.sellerName}
                      </span>
                    </td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td>
                      <Progress
                        value={netPaid(o)}
                        total={toSatang(o.totalAmount)}
                      />
                      <span className="pay-sub">{baht(netPaid(o))}</span>
                    </td>
                    <td>
                      {invoice ? (
                        <button
                          className="s-act"
                          onClick={() => setViewing(invoice)}
                        >
                          {invoice.invoiceNumber}
                        </button>
                      ) : (
                        <span className="small">–</span>
                      )}
                    </td>
                    <td>
                      <StatusPill kind="order" status={o.orderStatus} />
                    </td>
                    <td className="acts">
                      {o.orderStatus === 'PENDING' ? (
                        <span className="small">รออนุมัติก่อน</span>
                      ) : canInvoice(data, o) ? (
                        <button
                          className="s-act"
                          onClick={() => pick(o.orderId)}
                        >
                          ออกบิล
                        </button>
                      ) : (
                        <span className="small">ออกบิลแล้ว</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="empty-state">ยังไม่มีออเดอร์</p>
          )}
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
                    {o.orderNumber} · {o.customerName} · {o.car.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="s-fld">
              <span>ยอดบิล (ราคาสุทธิของออเดอร์)</span>
              <input
                className="s-in"
                value={selected ? money(selected.totalAmount) : ''}
                readOnly
                disabled={!selected}
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
            <div className="s-form-f">
              <button
                className="s-btn pri"
                type="submit"
                disabled={!selected || busy}
              >
                ออกบิลและส่งการเงิน
              </button>
            </div>
          </form>
        </section>

        <section className="s-card s-list">
          <h3>ใบแจ้งหนี้ที่ออกแล้ว</h3>
          {issued.length === 0 && <p className="empty-state">ยังไม่มีบิล</p>}
          {issued.map((inv) => {
            const order = orderOf(data, inv.orderId);
            const status = invoiceStatus(inv);
            return (
              <div className="it" key={inv.id}>
                <div className="grow">
                  <b>
                    <button className="s-act" onClick={() => setViewing(inv)}>
                      {inv.invoiceNumber}
                    </button>{' '}
                    {money(inv.amount)}
                  </b>
                  <span>
                    {order?.orderNumber} {order?.customerName} · ครบกำหนด{' '}
                    {thDate(inv.dueDate)}
                  </span>
                </div>
                <StatusPill kind="invoice" status={status} />
                {inv.status === 'ISSUED' && (
                  <button
                    className="s-act del"
                    disabled={busy}
                    onClick={() => cancel(inv)}
                  >
                    ยกเลิก
                  </button>
                )}
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
