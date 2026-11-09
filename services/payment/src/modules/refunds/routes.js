import { Router } from 'express';
import { readIdempotencyKey } from '../../db/idempotency.js';
import { readPaging, requireUuid } from '../../utils/validate.js';
import {
  approveRefund,
  getRefund,
  listOrderRefunds,
  listRefunds,
  rejectRefund,
  requestRefund,
} from './service.js';

// Mounted at /api/v1. GET /me/refunds waits for Identity (needs the logged-in customer).
const router = Router();

router.post('/payments/:paymentId/refunds', async (req, res) => {
  const paymentId = requireUuid(req.params.paymentId, 'paymentId');
  const key = readIdempotencyKey(req);
  const result = await requestRefund(paymentId, req.body, key);
  if (result.replayed) res.set('Idempotent-Replayed', 'true');
  res.status(result.statusCode).json(result.body);
});

router.get('/orders/:orderId/refunds', async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'orderId');
  res.set('Cache-Control', 'no-store').json(await listOrderRefunds(orderId));
});

router.get('/refunds', async (req, res) => {
  res
    .set('Cache-Control', 'no-store')
    .json(await listRefunds(req.query, readPaging(req.query)));
});

router.get('/refunds/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  res.set('Cache-Control', 'no-store').json({ data: await getRefund(id) });
});

router.post('/refunds/:id/approve', async (req, res) => {
  const id = requireUuid(req.params.id);
  res.json({ data: await approveRefund(id, req.body) });
});

router.post('/refunds/:id/reject', async (req, res) => {
  const id = requireUuid(req.params.id);
  res.json({ data: await rejectRefund(id, req.body) });
});

export default router;
