// Insurance: isolated snapshots and customer ownership; legacy order rules stay in orders.
import { getMysqlPool } from '../../config/mysql.js';
import { httpError, requireUuid } from '../../utils/httpError.js';
import {
  coverageDates,
  verifyQuote,
} from '../../../../../packages/insurance/index.js';
import { novaPlans } from './client.js';
import { ratingModels } from '../../../../../packages/insurance/rating.js';

const jsonValue = (value) =>
  typeof value === 'string' ? JSON.parse(value) : value;
export async function insuranceVehicle(carId, db = getMysqlPool()) {
  requireUuid(carId, 'carId');
  const [rows] = await db.query(
    `SELECT c.price, c.manufacture_year, c.vin, m.slug, m.model_name
    FROM cars c JOIN car_models m ON m.id = c.car_model_id WHERE c.id = ?`,
    [carId],
  );
  const row = rows[0];
  if (!row) throw httpError(400, 'CAR_NOT_FOUND', 'ไม่พบรถที่เลือก');
  let trimCode = 'ECO';
  try {
    const [trims] = await db.query(
      'SELECT t.code FROM cars c JOIN car_trims t ON t.id = c.trim_id WHERE c.id = ?',
      [carId],
    );
    if (trims[0]) trimCode = trims[0].code;
  } catch (error) {
    if (!['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code))
      throw error;
  }
  return {
    carId,
    modelSlug: ratingModels.find(
      (model) => model.slug === row.slug || model.name === row.model_name,
    )?.slug,
    modelName: row.model_name,
    trimCode,
    vehicleValue: Number(row.price),
    year: Number(row.manufacture_year),
    vin: row.vin,
  };
}
export async function prepareInsurance(input) {
  if (!input.novaPlanId) return null;
  requireUuid(input.novaPlanId, 'novaPlanId');
  try {
    coverageDates(input.deliveryDate);
  } catch {
    throw httpError(
      400,
      'INVALID_DELIVERY_DATE',
      'กรุณาระบุวันส่งมอบรถที่ถูกต้อง',
    );
  }
  const vehicle = await insuranceVehicle(input.carId);
  const plans = await novaPlans(vehicle);
  const plan = plans.find((item) => item.id === input.novaPlanId);
  if (!plan)
    throw httpError(400, 'INSURANCE_NOT_FOUND', 'ไม่พบแพ็กเกจ NOVA ที่เปิดขาย');
  // Verify the signed, immutable price before using it in the order total.
  let snapshot;
  try {
    snapshot = verifyQuote(plan.quoteToken, process.env.NOVA_PARTNER_KEY);
  } catch {
    throw httpError(503, 'NOVA_INVALID_QUOTE', 'ตรวจสอบราคาจาก NOVA ไม่สำเร็จ');
  }
  if (
    snapshot.id !== input.novaPlanId ||
    JSON.stringify(snapshot.vehicle) !== JSON.stringify(vehicle) ||
    !Number.isFinite(snapshot.finalAmount) ||
    snapshot.finalAmount <= 0
  )
    throw httpError(503, 'NOVA_INVALID_QUOTE', 'ราคาประกันไม่ถูกต้อง');
  if (
    input.expectedPremium === undefined ||
    Math.round(Number(input.expectedPremium) * 100) !==
      Math.round(snapshot.finalAmount * 100)
  )
    throw httpError(
      409,
      'INSURANCE_PRICE_CHANGED',
      'ราคาประกันเปลี่ยนแปลง กรุณาโหลดแพ็กเกจใหม่แล้วตรวจสอบยอดอีกครั้ง',
    );
  return {
    snapshot,
    quoteToken: plan.quoteToken,
    deliveryDate: input.deliveryDate,
  };
}
export async function saveInsurance(connection, orderId, input, insurance) {
  if (!insurance) return;
  const [rows] = await connection.query(
    `SELECT c.first_name, c.last_name, c.phone_number, u.email,
    m.brand, m.model_name, car.manufacture_year, car.vin, car.license_plate
    FROM customers c JOIN users u ON u.id = c.user_id
    JOIN cars car ON car.id = ? JOIN car_models m ON m.id = car.car_model_id WHERE c.id = ?`,
    [input.carId, input.customerId],
  );
  const row = rows[0];
  if (!row || !row.email)
    throw httpError(
      400,
      'INSURANCE_CUSTOMER_INCOMPLETE',
      'ลูกค้าต้องมีอีเมลสำหรับประกัน',
    );
  await connection.query(
    `INSERT INTO order_nova_insurance
    (order_id, plan_id, quote_token, plan_snapshot, delivery_date, customer_snapshot, vehicle_snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      insurance.snapshot.id,
      insurance.quoteToken,
      JSON.stringify(insurance.snapshot),
      insurance.deliveryDate,
      JSON.stringify({
        fullName: `${row.first_name} ${row.last_name}`.trim(),
        email: row.email,
        phone: row.phone_number || '',
      }),
      JSON.stringify({
        brand: row.brand,
        model: row.model_name,
        year: Number(row.manufacture_year),
        vin: row.vin,
        registrationNumber: row.license_plate || '',
      }),
    ],
  );
}
export async function enrichOrders(orders, db = getMysqlPool()) {
  if (!orders.length) return orders;
  let rows;
  try {
    [rows] = await db.query(
      `SELECT order_id, plan_id, plan_snapshot, delivery_date FROM order_nova_insurance WHERE order_id IN (${orders.map(() => '?').join(',')})`,
      orders.map((order) => order.id),
    );
  } catch (error) {
    // Insurance: preserve historical/car-only order reads during additive rollout.
    // New insured orders still require the migration and never silently lose data.
    if (error.code === 'ER_NO_SUCH_TABLE') return orders;
    throw error;
  }
  const snapshots = new Map(rows.map((row) => [row.order_id, row]));
  return orders.map((order) => {
    const row = snapshots.get(order.id);
    if (!row) return order;
    const plan = jsonValue(row.plan_snapshot);
    return {
      ...order,
      novaPlanId: row.plan_id,
      insurancePlan: `${plan.name} (NOVA)`,
      deliveryDate: row.delivery_date,
    };
  });
}
export async function customerInsurance(userId) {
  const [rows] = await getMysqlPool().query(
    `SELECT n.*, o.status AS order_status, o.created_at AS ordered_at
    FROM order_nova_insurance n JOIN orders o ON o.id = n.order_id
    JOIN customers c ON c.id = o.customer_id WHERE c.user_id = ? ORDER BY n.created_at DESC`,
    [userId],
  );
  return rows.map((row) => ({
    orderId: row.order_id,
    status:
      row.order_status === 'CANCELLED'
        ? 'ORDER_CANCELLED'
        : ['PAID', 'COMPLETED'].includes(row.order_status) &&
            row.status === 'AWAITING_PAYMENT'
          ? 'QUEUED'
          : row.status,
    plan: jsonValue(row.plan_snapshot),
    vehicle: jsonValue(row.vehicle_snapshot),
    deliveryDate: row.delivery_date,
    policy: row.policy_snapshot ? jsonValue(row.policy_snapshot) : null,
  }));
}
