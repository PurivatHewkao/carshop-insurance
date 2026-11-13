import { Router } from 'express';
import { query } from '../../db/transaction.js';
import { listOrderOverview } from '../../clients/orders.js';
import { orderScope } from '../../middleware/auth.js';
import { openForPayment } from '../payments/balance.js';
import { formatMoney, toSatang } from '../../utils/money.js';
import { readEnum, readPaging } from '../../utils/validate.js';

// GET /order-balances — one row per order with the money summary the finance
// pages need (customer, seller, car, paid / pending / refunded / outstanding).
// Customers see their own orders, sellers the orders they sold, staff all.
const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'COMPLETED',
  'CANCELLED',
];
const router = Router();

export function overviewToApi(row) {
  const total = toSatang(row.total_amount);
  const paid = toSatang(row.paid);
  const pending = toSatang(row.pending);
  const refunded = toSatang(row.refunded);
  return {
    orderId: row.id,
    orderNumber: 'ORD-' + row.id.slice(0, 8).toUpperCase(),
    orderStatus: row.status,
    createdAt: row.created_at,
    customerId: row.customer_id,
    customerName: row.customer_name,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    car: {
      name: (row.brand + ' ' + row.model_name).trim(),
      color: row.color,
      year: row.manufacture_year,
    },
    totalAmount: formatMoney(total),
    paidAmount: formatMoney(paid),
    pendingAmount: formatMoney(pending),
    refundedAmount: formatMoney(refunded),
    outstandingAmount: formatMoney(
      openForPayment(row.status)
        ? Math.max(0, total - (paid - refunded) - pending)
        : 0,
    ),
    currency: 'THB',
  };
}

router.get('/order-balances', async (req, res) => {
  const paging = readPaging(req.query);
  const status = readEnum(req.query.status, 'status', ORDER_STATUSES, {
    required: false,
  });
  const { rows, total } = await listOrderOverview(
    { query },
    { scope: orderScope(req.actor, 'o.id'), status, paging },
  );
  res.set('Cache-Control', 'no-store').json({
    data: rows.map(overviewToApi),
    meta: { page: paging.page, limit: paging.limit, total },
  });
});

export default router;
