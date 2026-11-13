import { Router } from 'express';
import { readIdempotencyKey } from '../../db/idempotency.js';
import { FINANCE, requireRoles } from '../../middleware/auth.js';
import { readPaging, requireUuid } from '../../utils/validate.js';
import {
  approveRefund,
  getRefund,
  listOrderRefunds,
  listRefunds,
  rejectRefund,
  requestRefund,
} from './service.js';

// Mounted at /api/v1 after requireSession + loadActor (src/app.js).
// A customer requests a refund of their own payment; Finance approves/rejects.
const router = Router();

router.post(
  '/payments/:paymentId/refunds',
  requireRoles('customer', ...FINANCE),
  async (req, res) => {
    const paymentId = requireUuid(req.params.paymentId, 'paymentId');
    const key = readIdempotencyKey(req);
    const result = await requestRefund(req.actor, paymentId, req.body, key);
    if (result.replayed) res.set('Idempotent-Replayed', 'true');
    res.status(result.statusCode).json(result.body);
  },
);

router.get('/orders/:orderId/refunds', async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'orderId');
  res
    .set('Cache-Control', 'no-store')
    .json(await listOrderRefunds(req.actor, orderId));
});

router.get('/refunds', async (req, res) => {
  res
    .set('Cache-Control', 'no-store')
    .json(await listRefunds(req.actor, req.query, readPaging(req.query)));
});

router.get('/refunds/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  res
    .set('Cache-Control', 'no-store')
    .json({ data: await getRefund(req.actor, id) });
});

router.post(
  '/refunds/:id/approve',
  requireRoles(...FINANCE),
  async (req, res) => {
    const id = requireUuid(req.params.id);
    res.json({ data: await approveRefund(req.actor, id, req.body) });
  },
);

router.post(
  '/refunds/:id/reject',
  requireRoles(...FINANCE),
  async (req, res) => {
    const id = requireUuid(req.params.id);
    res.json({ data: await rejectRefund(req.actor, id, req.body) });
  },
);

export default router;
