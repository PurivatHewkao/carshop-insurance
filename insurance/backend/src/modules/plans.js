import { Router } from 'express';
import { notFound } from '../errors.js';

export function pricing(amount, source) {
  const cents = Math.round(Number(amount) * 100);
  const discount =
    source === 'toyoty' ? Math.min(Math.round(cents * 0.05), 100000) : 0;
  return {
    originalAmount: cents / 100,
    discountAmount: discount / 100,
    finalAmount: (cents - discount) / 100,
  };
}
export function serializePlan(row, source) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    insuranceType: row.insurance_type,
    description: row.description,
    premiumAmount: Number(row.premium_amount),
    coverage:
      typeof row.coverage === 'string'
        ? JSON.parse(row.coverage)
        : row.coverage,
    isRecommended: Boolean(row.is_recommended),
    ...pricing(row.premium_amount, source),
  };
}
export function plansRouter(pool) {
  const router = Router();
  router.get('/', async (req, res) => {
    const [rows] = await pool().execute(
      'SELECT * FROM insurance_plans WHERE is_active = 1 ORDER BY premium_amount',
    );
    res.json({
      data: rows.map((row) => serializePlan(row, req.query.source)),
      meta: { demo: true },
    });
  });
  router.get('/:id', async (req, res) => {
    const [rows] = await pool().execute(
      'SELECT * FROM insurance_plans WHERE id = ? AND is_active = 1',
      [req.params.id],
    );
    if (!rows[0]) throw notFound();
    res.json({
      data: serializePlan(rows[0], req.query.source),
      meta: { demo: true },
    });
  });
  return router;
}
