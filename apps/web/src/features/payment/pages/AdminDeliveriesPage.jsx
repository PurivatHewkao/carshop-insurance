import { useState } from 'react';
import { changeProduction } from '../../catalog/api/productionApi.js';
import { apiErrorMessage } from '../../catalog/api/catalogApi.js';
import DeliveryStatus from '../components/DeliveryStatus.jsx';
import {
  Dialog,
  FormMessage,
  Kpis,
  LoadState,
  PageHeader,
  StatusPill,
  Tabs,
} from '../components/FinanceUi.jsx';
import { usePaymentData } from '../hooks/usePaymentData.js';
import { carLabel, netPaid } from '../utils/finance.js';
import { baht, money, toSatang } from '../utils/format.js';

function canDeliver(order) {
  return (
    Boolean(order.car.id) &&
    order.orderStatus === 'PAID' &&
    netPaid(order) >= toSatang(order.totalAmount) &&
    (!order.production || order.production.status === 'READY')
  );
}

export default function AdminDeliveriesPage() {
  const { data, error, loading, reload } = usePaymentData({
    refreshMs: 30000,
    ordersOnly: true,
  });
  const [filter, setFilter] = useState('ready');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function confirmDelivery() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await changeProduction(selected.car.id, {
        action: 'DELIVER',
        orderId: selected.orderId,
      });
      setMessage({
        ok: true,
        text: `ยืนยันส่งมอบ ${selected.orderNumber} แล้ว ลูกค้าดูสถานะได้ในประวัติธุรกรรม`,
      });
      setSelected(null);
      reload();
    } catch (error) {
      setMessage({ ok: false, text: apiErrorMessage(error) });
      reload();
    } finally {
      setBusy(false);
    }
  }

  const orders = data?.orders ?? [];
  const ready = orders.filter(canDeliver);
  const delivered = orders.filter((order) => order.orderStatus === 'COMPLETED');
  const rows =
    filter === 'ready' ? ready : filter === 'delivered' ? delivered : orders;

  return (
    <div className="page-content">
      <PageHeader
        crumb="ผู้ดูแลระบบ / ส่งมอบรถ"
        title="ยืนยันส่งมอบรถ"
        sub="ตรวจสอบออเดอร์และยืนยันเมื่อลูกค้ารับรถแล้ว ต้องชำระเงินครบและรถพร้อมส่งมอบ"
      >
        <button
          type="button"
          className="s-btn"
          onClick={reload}
          disabled={busy}
        >
          รีเฟรชข้อมูล
        </button>
      </PageHeader>
      <LoadState loading={loading} error={error} onRetry={reload} />
      {!selected && <FormMessage message={message} />}
      {data && (
        <>
          <Kpis
            items={[
              { l: 'พร้อมยืนยันส่งมอบ', v: ready.length + ' ออเดอร์' },
              { l: 'ส่งมอบแล้ว', v: delivered.length + ' ออเดอร์' },
            ]}
          />
          <Tabs
            value={filter}
            onChange={setFilter}
            tabs={[
              ['ready', 'พร้อมส่งมอบ', ready.length],
              ['delivered', 'ส่งมอบแล้ว', delivered.length],
              ['all', 'ทั้งหมด', orders.length],
            ]}
          />
          <section className="s-card flush">
            <div className="s-tw">
              <table className="s-tbl">
                <thead>
                  <tr>
                    <th scope="col">ออเดอร์ / ลูกค้า</th>
                    <th scope="col">รถ</th>
                    <th scope="col" className="num">
                      ราคาสุทธิ / ชำระแล้ว
                    </th>
                    <th scope="col">สถานะออเดอร์</th>
                    <th scope="col">การส่งมอบ</th>
                    <th scope="col">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr key={order.orderId}>
                      <td>
                        {order.orderNumber}
                        <span className="pay-sub">{order.customerName}</span>
                      </td>
                      <td>{carLabel(order)}</td>
                      <td className="num">
                        {money(order.totalAmount)}
                        <span className="pay-sub">
                          ชำระแล้ว {baht(netPaid(order))}
                        </span>
                      </td>
                      <td>
                        <StatusPill kind="order" status={order.orderStatus} />
                      </td>
                      <td>
                        <DeliveryStatus order={order} />
                      </td>
                      <td>
                        {canDeliver(order) ? (
                          <button
                            type="button"
                            className="s-btn pri"
                            disabled={busy || !!error}
                            onClick={() => {
                              setMessage(null);
                              setSelected(order);
                            }}
                          >
                            ยืนยันส่งมอบรถ
                          </button>
                        ) : (
                          <span className="small">
                            {order.orderStatus === 'COMPLETED'
                              ? 'ดำเนินการแล้ว'
                              : order.orderStatus === 'CANCELLED'
                                ? 'ยกเลิกแล้ว'
                                : 'ยังไม่พร้อมส่งมอบ'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="empty-state">ไม่มีออเดอร์ในรายการนี้</p>
              )}
            </div>
          </section>
        </>
      )}
      {selected && (
        <Dialog
          title={'ยืนยันส่งมอบ ' + selected.orderNumber}
          onClose={() => {
            if (!busy) {
              setSelected(null);
              setMessage(null);
            }
          }}
        >
          <p>ลูกค้า: {selected.customerName}</p>
          <p>รถ: {carLabel(selected)}</p>
          <p>
            ยืนยันว่าลูกค้ารับรถแล้ว ระบบจะบันทึกออเดอร์เป็น “ส่งมอบแล้ว”
            และแสดงในประวัติธุรกรรมของลูกค้า
          </p>
          <FormMessage message={message} />
          <div className="s-btns">
            <button
              type="button"
              className="s-btn pri"
              disabled={busy}
              onClick={confirmDelivery}
            >
              {busy ? 'กำลังบันทึก…' : 'ยืนยันการส่งมอบ'}
            </button>
            <button
              type="button"
              className="s-btn"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setMessage(null);
              }}
            >
              ยกเลิก
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
