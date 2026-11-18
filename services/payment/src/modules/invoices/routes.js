import { Router } from 'express';
import { FINANCE, requireRoles } from '../../middleware/auth.js';
import { readPaging, requireUuid } from '../../utils/validate.js';
import {
  cancelInvoice,
  createInvoice,
  getInvoice,
  listInvoices,
  listOrderInvoices,
} from './service.js';
import { renderInvoicePdf } from './pdf.js';

// Mounted at /api/v1 after requireSession + loadActor (src/app.js).
// Issue: seller (own orders), manager, finance. Cancel: manager, finance.
const router = Router();

router.post(
  '/orders/:orderId/invoices',
  requireRoles('seller', 'manager', ...FINANCE),
  async (req, res) => {
    const orderId = requireUuid(req.params.orderId, 'orderId');
    res
      .status(201)
      .json({ data: await createInvoice(req.actor, orderId, req.body) });
  },
);

router.get('/orders/:orderId/invoices', async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'orderId');
  res
    .set('Cache-Control', 'no-store')
    .json(await listOrderInvoices(req.actor, orderId));
});

router.get('/invoices', async (req, res) => {
  res
    .set('Cache-Control', 'no-store')
    .json(await listInvoices(req.actor, req.query, readPaging(req.query)));
});

// The logged-in customer's own invoices (same data as GET /invoices for a customer).
router.get('/me/invoices', requireRoles('customer'), async (req, res) => {
  res
    .set('Cache-Control', 'no-store')
    .json(await listInvoices(req.actor, req.query, readPaging(req.query)));
});

router.get('/invoices/:id/pdf', async (req, res) => {
  const id = requireUuid(req.params.id);
  const { fileName, buffer } = await renderInvoicePdf(req.actor, id);
  res
    .set({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="' + fileName + '"',
    })
    .send(buffer);
});

router.get('/invoices/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  res
    .set('Cache-Control', 'no-store')
    .json({ data: await getInvoice(req.actor, id) });
});

router.post(
  '/invoices/:id/cancel',
  requireRoles('manager', ...FINANCE),
  async (req, res) => {
    const id = requireUuid(req.params.id);
    res.json({ data: await cancelInvoice(id) });
  },
);

export default router;
