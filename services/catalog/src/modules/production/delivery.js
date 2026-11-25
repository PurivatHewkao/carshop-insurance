import { httpError } from '../../utils/httpError.js';
import { toSatang } from '../configurator/schedule.js';

// Caller owns the transaction. Lock the order before the car, like Payment does,
// so delivery and payment/refund approval cannot change the same order together.
export async function completeDelivery(db, carId, expectedOrderId) {
  const [orders] = await db.query(
    "SELECT id, status, total_amount FROM orders WHERE car_id = ? AND status <> 'CANCELLED' LIMIT 1 FOR UPDATE",
    [carId],
  );
  const order = orders[0];
  if (!order || (expectedOrderId && order.id !== expectedOrderId)) {
    throw httpError(
      409,
      'DELIVERY_ORDER_NOT_FOUND',
      'ไม่พบออเดอร์ที่ใช้งานอยู่ของรถคันนี้ กรุณาโหลดข้อมูลใหม่',
    );
  }
  const [[car]] = await db.query(
    'SELECT status, production_status FROM cars WHERE id = ? FOR UPDATE',
    [carId],
  );
  if (!car) throw httpError(404, 'CAR_NOT_FOUND', 'Car not found');
  // Retrying a successful confirmation must not create another transition.
  if (order.status === 'COMPLETED' && car.status === 'SOLD') return;
  if (order.status !== 'PAID') {
    throw httpError(
      409,
      'DELIVERY_NOT_PAID',
      'ต้องชำระเงินครบและผ่านการตรวจสอบก่อนยืนยันส่งมอบรถ',
    );
  }
  if (
    car.status !== 'RESERVED' ||
    ![null, 'READY'].includes(car.production_status)
  ) {
    throw httpError(
      409,
      'INVALID_PRODUCTION_STEP',
      'รถยังไม่พร้อมส่งมอบ ต้องเป็นรถที่จองไว้และถึงศูนย์แล้ว',
    );
  }
  const [[balance]] = await db.query(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM payments
        WHERE order_id = ? AND status IN ('SUCCESS', 'REFUNDED')) AS paid,
       (SELECT COALESCE(SUM(amount), 0) FROM refunds
        WHERE order_id = ? AND status = 'REFUNDED') AS refunded`,
    [order.id, order.id],
  );
  if (
    toSatang(balance.paid) - toSatang(balance.refunded) <
    toSatang(order.total_amount)
  ) {
    throw httpError(
      409,
      'DELIVERY_NOT_PAID',
      'ยอดชำระสุทธิหลังหักเงินคืนยังไม่ครบ ไม่สามารถส่งมอบรถได้',
    );
  }
  await db.query("UPDATE orders SET status = 'COMPLETED' WHERE id = ?", [
    order.id,
  ]);
  await db.query(
    `UPDATE cars SET status = 'SOLD',
       production_status = CASE WHEN production_status IS NULL THEN NULL ELSE 'DELIVERED' END
     WHERE id = ?`,
    [carId],
  );
}
