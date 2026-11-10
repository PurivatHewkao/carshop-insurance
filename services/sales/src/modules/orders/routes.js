import { Router } from 'express';
import {
  readOptionalText, requireBody, requireEnum, requireUuid,
} from '../../utils/httpError.js';
import { createOrder, decideOrder, listOrders } from './repository.js';

const router = Router();
const APPROVALS = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

router.get('/', async (req, res) => {
  const filters = {};
  if (req.query.customerId) filters.customerId = requireUuid(req.query.customerId, 'customerId');
  if (req.query.sellerId) filters.sellerId = requireUuid(req.query.sellerId, 'sellerId');
  if (req.query.status)
    filters.approvalStatus = requireEnum(String(req.query.status), APPROVALS, 'status');
  res.json({ data: await listOrders(filters) });
});

// Price and premium come from the database; only ids and the discount are sent.
router.post('/', async (req, res) => {
  const body = requireBody(req.body);
  const order = await createOrder({
    customerId: requireUuid(body.customerId, 'customerId'),
    sellerId: requireUuid(body.sellerId, 'sellerId'),
    carId: requireUuid(body.carId, 'carId'),
    insuranceId: body.insuranceId ? requireUuid(body.insuranceId, 'insuranceId') : null,
    discount: body.discount === undefined || body.discount === '' ? '0' : body.discount,
    note: readOptionalText(body.note, 'note', 2000),
  });
  res.status(201).json({ data: order });
});

router.patch('/:id/decision', async (req, res) => {
  const id = requireUuid(req.params.id);
  const body = requireBody(req.body);
  const decision = requireEnum(body.decision, ['APPROVED', 'REJECTED'], 'decision');
  res.json({
    data: await decideOrder(id, {
      decision,
      comment: readOptionalText(body.comment, 'comment', 1000),
    }),
  });
});

export default router;
