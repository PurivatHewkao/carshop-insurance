import {
  PRODUCTION_STATUS,
  formatEtaWindow,
} from '../../catalog/api/productionApi.js';

export default function DeliveryStatus({ order }) {
  const production = order.production;
  const delivered =
    order.orderStatus === 'COMPLETED' || production?.status === 'DELIVERED';
  const cancelled = order.orderStatus === 'CANCELLED';
  const label = cancelled
    ? 'ยกเลิกการส่งมอบ'
    : delivered
      ? 'ส่งมอบแล้ว'
      : production?.status === 'READY' || !production
        ? order.orderStatus === 'PAID'
          ? 'รอผู้ดูแลยืนยันส่งมอบ'
          : 'รอชำระเงินครบก่อนส่งมอบ'
        : PRODUCTION_STATUS[production.status]?.label || 'รอเตรียมรถ';

  return (
    <>
      <span
        className={
          's-pill t-' + (cancelled ? 'mute' : delivered ? 'good' : 'info')
        }
      >
        {label}
      </span>
      {!cancelled && !delivered && production?.etaFrom && (
        <span className="pay-sub">
          กำหนดรับรถ {formatEtaWindow(production.etaFrom, production.etaTo)}
        </span>
      )}
    </>
  );
}
