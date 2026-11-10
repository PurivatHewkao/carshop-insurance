import { Router } from 'express';
import { readPaging, requireUuid } from '../../utils/validate.js';
import {
  cancelInvoice,
  createInvoice,
  getInvoice,
  listInvoices,
  listOrderInvoices,
} from './service.js';

// Mounted at /api/v1. GET /me/invoices and /invoices/{id}/pdf are not done yet
// (/me needs Identity; PDF is a later step).
const router = Router();

router.post('/orders/:orderId/invoices', async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'orderId');
  res.status(201).json({ data: await createInvoice(orderId, req.body) });
});

router.get('/orders/:orderId/invoices', async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'orderId');
  res.set('Cache-Control', 'no-store').json(await listOrderInvoices(orderId));
});

router.get('/invoices', async (req, res) => {
  res
    .set('Cache-Control', 'no-store')
    .json(await listInvoices(req.query, readPaging(req.query)));
});

router.get('/invoices/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  res.set('Cache-Control', 'no-store').json({ data: await getInvoice(id) });
});

router.post('/invoices/:id/cancel', async (req, res) => {
  const id = requireUuid(req.params.id);
  res.json({ data: await cancelInvoice(id) });
});

export default router;
