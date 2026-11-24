// Insurance: authenticated carshop integration and immutable quotes.
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { ApiError } from '../errors.js';
import { serializePlan } from './plans.js';
import { ratedPlan } from './quotes.js';
import {
  coverageDates,
  digest,
  secretMatches,
  signQuote,
  verifyQuote,
  uuidPattern,
} from '../../../../packages/insurance/index.js';

export const jsonValue = (value) =>
  typeof value === 'string' ? JSON.parse(value) : value;
export function partnerResult(row) {
  return {
    requestId: row.id,
    orderId: row.order_id,
    status: row.status,
    plan: jsonValue(row.plan_snapshot),
    customer: jsonValue(row.customer),
    vehicle: jsonValue(row.vehicle),
    deliveryDate: row.delivery_date,
    policyNumber: row.policy_number,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    approvedAt: row.approved_at,
  };
}
export function requirePartner(req, res, next) {
  if (
    !secretMatches(
      req.get('authorization'),
      `Bearer ${process.env.NOVA_PARTNER_KEY || ''}`,
    ) ||
    !process.env.NOVA_PARTNER_KEY ||
    process.env.NOVA_PARTNER_KEY.length < 32
  )
    throw new ApiError(
      401,
      'PARTNER_UNAUTHORIZED',
      'ไม่อนุญาตให้เชื่อมต่อระบบ',
    );
  res.set('Cache-Control', 'no-store');
  next();
}
export function validatePartnerRequest(body) {
  if (!body || !uuidPattern.test(body.orderId || ''))
    throw new ApiError(400, 'INVALID_REQUEST', 'รหัสคำสั่งซื้อไม่ถูกต้อง');
  let plan, dates;
  try {
    plan = verifyQuote(body.quoteToken, process.env.NOVA_PARTNER_KEY);
    dates = coverageDates(body.deliveryDate);
    if (
      !uuidPattern.test(plan.id) ||
      !Number.isSafeInteger(Math.round(plan.finalAmount * 100)) ||
      plan.finalAmount <= 0
    )
      throw new Error('Invalid quote');
  } catch {
    throw new ApiError(
      400,
      'INVALID_QUOTE_OR_DATE',
      'ราคาอ้างอิงหรือวันส่งมอบไม่ถูกต้อง',
    );
  }
  const text = (value, max, required = true) => {
    if (
      typeof value !== 'string' ||
      value.length > max ||
      (required && !value.trim())
    )
      throw new ApiError(
        400,
        'INVALID_REQUEST',
        'ข้อมูลลูกค้าหรือรถไม่ครบถ้วน',
      );
    return value.trim();
  };
  const customer = {
    fullName: text(body.customer?.fullName, 201),
    phone: text(body.customer?.phone, 30, false),
    email: text(body.customer?.email, 254),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
    throw new ApiError(400, 'INVALID_REQUEST', 'อีเมลไม่ถูกต้อง');
  const vehicle = {
    brand: text(body.vehicle?.brand, 100),
    model: text(body.vehicle?.model, 150),
    vin: text(body.vehicle?.vin, 17),
    registrationNumber: text(body.vehicle?.registrationNumber || '', 30, false),
    year: body.vehicle?.year,
  };
  if (
    !Number.isInteger(vehicle.year) ||
    vehicle.year < 1886 ||
    vehicle.year > 9999
  )
    throw new ApiError(400, 'INVALID_REQUEST', 'ปีรถไม่ถูกต้อง');
  if (
    plan.ratingVersion &&
    (plan.vehicle?.vin !== vehicle.vin ||
      plan.vehicle?.year !== vehicle.year ||
      plan.vehicle?.modelName !== vehicle.model)
  )
    throw new ApiError(
      400,
      'QUOTE_VEHICLE_MISMATCH',
      'ราคาอ้างอิงไม่ตรงกับรถที่ขอทำประกัน',
    );
  return {
    orderId: body.orderId.toLowerCase(),
    plan,
    customer,
    vehicle,
    deliveryDate: body.deliveryDate,
    ...dates,
  };
}
export async function savePartnerRequest(pool, input) {
  const hash = digest(JSON.stringify(input));
  try {
    await pool.execute(
      `INSERT INTO nova_partner_requests
      (id, order_id, payload_hash, plan_snapshot, customer, vehicle, delivery_date, starts_on, ends_on)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.orderId,
        hash,
        JSON.stringify(input.plan),
        JSON.stringify(input.customer),
        JSON.stringify(input.vehicle),
        input.deliveryDate,
        input.startsOn,
        input.endsOn,
      ],
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error;
  }
  const [rows] = await pool.execute(
    'SELECT * FROM nova_partner_requests WHERE order_id = ?',
    [input.orderId],
  );
  if (!rows[0] || rows[0].payload_hash !== hash)
    throw new ApiError(
      409,
      'ORDER_CONFLICT',
      'คำสั่งซื้อนี้ถูกส่งด้วยข้อมูลอื่นแล้ว',
    );
  return partnerResult(rows[0]);
}
export function partnerRouter(pool) {
  const router = Router();
  router.use(requirePartner);
  router.get('/plans', async (_req, res) => {
    const [rows] = await pool().execute(
      'SELECT * FROM insurance_plans WHERE is_active = 1 ORDER BY premium_amount',
    );
    res.json({
      data: rows.map((row) => {
        const plan = serializePlan(row, 'toyoty');
        return {
          ...plan,
          quoteToken: signQuote(plan, process.env.NOVA_PARTNER_KEY),
        };
      }),
    });
  });
  router.post('/quotes', async (req, res) => {
    const v = req.body?.vehicle;
    if (
      !v ||
      !uuidPattern.test(v.carId || '') ||
      typeof v.vin !== 'string' ||
      v.vin.length !== 17 ||
      typeof v.modelName !== 'string' ||
      v.modelName.length > 150
    )
      throw new ApiError(
        400,
        'INVALID_INSURANCE_VEHICLE',
        'ข้อมูลรถสำหรับคำนวณราคาไม่ถูกต้อง',
      );
    const vehicle = {
      carId: v.carId,
      modelSlug: v.modelSlug,
      modelName: v.modelName,
      trimCode: v.trimCode,
      vehicleValue: v.vehicleValue,
      year: v.year,
      vin: v.vin,
    };
    const [rows] = await pool().execute(
      'SELECT * FROM insurance_plans WHERE is_active = 1 ORDER BY premium_amount',
    );
    res.json({
      data: rows.map((row) => {
        const plan = ratedPlan(row, vehicle, 'toyoty');
        return {
          ...plan,
          quoteToken: signQuote(plan, process.env.NOVA_PARTNER_KEY),
        };
      }),
    });
  });
  router.post('/requests', async (req, res) => {
    res.status(200).json({
      data: await savePartnerRequest(pool(), validatePartnerRequest(req.body)),
    });
  });
  router.get('/requests/:orderId', async (req, res) => {
    if (!uuidPattern.test(req.params.orderId))
      throw new ApiError(400, 'INVALID_REQUEST', 'รหัสคำสั่งซื้อไม่ถูกต้อง');
    const [rows] = await pool().execute(
      'SELECT * FROM nova_partner_requests WHERE order_id = ?',
      [req.params.orderId],
    );
    if (!rows[0]) throw new ApiError(404, 'REQUEST_NOT_FOUND', 'ไม่พบคำขอ');
    res.json({ data: partnerResult(rows[0]) });
  });
  return router;
}
