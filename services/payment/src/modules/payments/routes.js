import { Router } from 'express';
import { readIdempotencyKey } from '../../db/idempotency.js';
import { readPaging, requireUuid } from '../../utils/validate.js';
import {
  createPayment,
  getPayment,
  listOrderPayments,
  listPayments,
  reviewPayment,
} from './service.js';

// Mounted at /api/v1. Auth/role checks are not added yet (Identity has no
// token API); see services/payment/README.md.
const router = Router();

router.post('/orders/:orderId/payments', async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'orderId');
  const key = readIdempotencyKey(req);
  const result = await createPayment(orderId, req.body, key);
  if (result.replayed) res.set('Idempotent-Replayed', 'true');
  res.status(result.statusCode).json(result.body);
});

router.get('/orders/:orderId/payments', async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'orderId');
  res.set('Cache-Control', 'no-store').json(await listOrderPayments(orderId));
});

router.get('/payments', async (req, res) => {
  const result = await listPayments(req.query, readPaging(req.query));
  res.set('Cache-Control', 'no-store').json(result);
});

router.get('/payments/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  res.set('Cache-Control', 'no-store').json({ data: await getPayment(id) });
});

router.patch('/payments/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  res.json({ data: await reviewPayment(id, req.body) });
});

export default router;
