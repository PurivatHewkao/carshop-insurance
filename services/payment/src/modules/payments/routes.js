import { Router } from 'express';
import { readIdempotencyKey } from '../../db/idempotency.js';
import { FINANCE, requireRoles } from '../../middleware/auth.js';
import { readPaging, requireUuid } from '../../utils/validate.js';
import {
  createPayment,
  getPayment,
  listOrderPayments,
  listPayments,
  reviewPayment,
} from './service.js';

// Mounted at /api/v1 after requireSession + loadActor (src/app.js).
// Customers and sellers only reach their own orders (checked in service.js).
const router = Router();

router.post(
  '/orders/:orderId/payments',
  requireRoles('customer', ...FINANCE),
  async (req, res) => {
    const orderId = requireUuid(req.params.orderId, 'orderId');
    const key = readIdempotencyKey(req);
    const result = await createPayment(req.actor, orderId, req.body, key);
    if (result.replayed) res.set('Idempotent-Replayed', 'true');
    res.status(result.statusCode).json(result.body);
  },
);

router.get('/orders/:orderId/payments', async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'orderId');
  res
    .set('Cache-Control', 'no-store')
    .json(await listOrderPayments(req.actor, orderId));
});

router.get('/payments', async (req, res) => {
  const result = await listPayments(
    req.actor,
    req.query,
    readPaging(req.query),
  );
  res.set('Cache-Control', 'no-store').json(result);
});

router.get('/payments/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  res
    .set('Cache-Control', 'no-store')
    .json({ data: await getPayment(req.actor, id) });
});

router.patch('/payments/:id', requireRoles(...FINANCE), async (req, res) => {
  const id = requireUuid(req.params.id);
  res.json({ data: await reviewPayment(id, req.body) });
});

export default router;
