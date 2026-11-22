import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from 'node:crypto';
import { Router } from 'express';
import { ApiError, notFound } from '../errors.js';
import { pricing } from './plans.js';
import { validatePurchase } from './validation.js';
export const tokenHash = (token) =>
  createHash('sha256').update(token).digest('hex');
export function tokenMatches(token, hash) {
  return (
    typeof token === 'string' &&
    /^[a-f0-9]{64}$/.test(hash || '') &&
    timingSafeEqual(
      Buffer.from(tokenHash(token), 'hex'),
      Buffer.from(hash, 'hex'),
    )
  );
}
const duplicate = () =>
  new ApiError(
    409,
    'DUPLICATE_REQUEST',
    'คำขอนี้ถูกบันทึกแล้ว กรุณาเปิดใบรับรายการเดิมในแท็บนี้ ไม่ต้องส่งคำขอใหม่',
  );

export async function createPurchase(pool, input) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      'SELECT id FROM insurance_purchases WHERE client_request_id = ?',
      [input.clientRequestId],
    );
    if (existing.length) throw duplicate();
    const [plans] = await connection.execute(
      'SELECT * FROM insurance_plans WHERE id = ? AND is_active = 1 FOR SHARE',
      [input.planId],
    );
    if (!plans[0]) throw notFound();
    const price = pricing(plans[0].premium_amount, input.source);
    const purchaseId = randomUUID();
    const policyId = randomUUID();
    // Full random UUID makes the number unique without a shared in-memory counter.
    const policyNumber = `NOVA-${new Date().getUTCFullYear()}-${randomUUID().replaceAll('-', '').toUpperCase()}`;
    const receiptToken = randomBytes(32).toString('base64url');
    await connection.execute(
      `INSERT INTO insurance_purchases
      (id, plan_id, customer_name, customer_email, customer_phone, car_brand, car_model, car_year, registration_number, source, client_request_id, original_amount, discount_amount, final_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED_DEMO')`,
      [
        purchaseId,
        input.planId,
        input.fullName,
        input.email,
        input.phone,
        input.brand,
        input.model,
        input.year,
        input.registrationNumber || null,
        input.source,
        input.clientRequestId,
        price.originalAmount,
        price.discountAmount,
        price.finalAmount,
      ],
    );
    await connection.execute(
      `INSERT INTO insurance_policies (id, purchase_id, policy_number, receipt_token_hash, status) VALUES (?, ?, ?, ?, 'ISSUED_DEMO')`,
      [policyId, purchaseId, policyNumber, tokenHash(receiptToken)],
    );
    await connection.commit();
    return {
      purchaseId,
      policyId,
      policyNumber,
      status: 'ISSUED_DEMO',
      ...price,
      receiptToken,
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw duplicate();
    throw error;
  } finally {
    connection.release();
  }
}
export function purchasesRouter(pool) {
  const router = Router();
  router.post('/', async (req, res) => {
    const input = validatePurchase(req.body);
    const data = await createPurchase(pool(), input);
    res.status(201).json({ data, meta: { demo: true } });
  });
  return router;
}
