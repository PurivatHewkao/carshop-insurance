import { formatMoney, toSatang } from '../../utils/money.js';

/** Money totals of one order, in satang. */
export async function orderBalance(connection, order) {
  const [[payments]] = await connection.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status IN ('SUCCESS','REFUNDED') THEN amount END), 0) AS paid,
       COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount END), 0) AS pending
     FROM payments WHERE order_id = ?`,
    [order.id],
  );
  const [[refunds]] = await connection.query(
    "SELECT COALESCE(SUM(amount), 0) AS refunded FROM refunds WHERE order_id = ? AND status = 'REFUNDED'",
    [order.id],
  );
  const total = toSatang(order.total_amount);
  const paid = toSatang(payments.paid);
  const pending = toSatang(payments.pending);
  const refunded = toSatang(refunds.refunded);
  const netPaid = paid - refunded;
  return {
    total,
    paid,
    pending,
    refunded,
    netPaid,
    outstanding: Math.max(0, total - netPaid - pending),
  };
}

export function balanceToApi(order, balance) {
  return {
    orderId: order.id,
    orderStatus: order.status,
    totalAmount: formatMoney(balance.total),
    paidAmount: formatMoney(balance.paid),
    pendingAmount: formatMoney(balance.pending),
    refundedAmount: formatMoney(balance.refunded),
    outstandingAmount: formatMoney(balance.outstanding),
    currency: 'THB',
  };
}
