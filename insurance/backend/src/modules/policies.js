import { Router } from 'express';
import { ApiError } from '../errors.js';
import { tokenMatches } from './purchases.js';
export function policiesRouter(pool) {
  const router = Router();
  router.get('/:id', async (req, res) => {
    const token = req
      .get('authorization')
      ?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token)
      throw new ApiError(
        401,
        'UNAUTHORIZED',
        'กรุณาเปิดใบรับรายการจากแท็บที่ทำรายการสำเร็จ',
      );
    const [rows] = await pool().execute(
      `SELECT p.id, p.policy_number, p.receipt_token_hash, p.status, p.issued_at,
      b.customer_name, b.car_brand, b.car_model, b.car_year, b.registration_number, b.source,
      b.original_amount, b.discount_amount, b.final_amount, b.created_at, a.name, a.insurance_type
      FROM insurance_policies p JOIN insurance_purchases b ON b.id = p.purchase_id
      JOIN insurance_plans a ON a.id = b.plan_id WHERE p.id = ?`,
      [req.params.id],
    );
    const row = rows[0];
    if (!row || !tokenMatches(token, row.receipt_token_hash))
      throw new ApiError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์เข้าถึงใบรับรายการนี้');
    res.json({
      data: {
        id: row.id,
        policyNumber: row.policy_number,
        status: row.status,
        issuedAt: row.issued_at.replace(' ', 'T') + 'Z',
        createdAt: row.created_at.replace(' ', 'T') + 'Z',
        customerName: row.customer_name,
        vehicle: {
          brand: row.car_brand,
          model: row.car_model,
          year: row.car_year,
          registrationNumber: row.registration_number,
        },
        plan: { name: row.name, insuranceType: row.insurance_type },
        source: row.source,
        originalAmount: Number(row.original_amount),
        discountAmount: Number(row.discount_amount),
        finalAmount: Number(row.final_amount),
      },
      meta: { demo: true },
    });
  });
  return router;
}
