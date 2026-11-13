import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../../db/transaction.js';
import { claimKey, hashRequest, saveResponse } from '../../db/idempotency.js';
import {
  cancelOrderAfterFullRefund,
  findOrder,
  lockOrder,
} from '../../clients/orders.js';
import { httpError } from '../../utils/httpError.js';
import { formatMoney, parseAmount, toSatang } from '../../utils/money.js';
import {
  readDate,
  readEnum,
  readText,
  requireBody,
} from '../../utils/validate.js';
import { lockPayment } from '../payments/service.js';
import { orderBalance } from '../payments/balance.js';
import { assertOrderAccess, orderScope } from '../../middleware/auth.js';

export const REFUND_STATUSES = ['REQUESTED', 'REFUNDED', 'REJECTED'];
const SCOPE = 'refunds.create';
const COLUMNS =
  'id, payment_id, order_id, amount, reason, status, requested_by, reviewed_by, review_note, refund_reference, reviewed_at, created_at, updated_at';

export function refundToApi(row) {
  return {
    id: row.id,
    paymentId: row.payment_id,
    orderId: row.order_id,
    amount: row.amount,
    reason: row.reason,
    status: row.status,
    requestedBy: row.requested_by,
    reviewedBy: row.reviewed_by,
    reviewNote: row.review_note,
    refundReference: row.refund_reference,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function refundedForPayment(connection, paymentId) {
  const [[row]] = await connection.query(
    "SELECT COALESCE(SUM(amount), 0) AS refunded FROM refunds WHERE payment_id = ? AND status = 'REFUNDED'",
    [paymentId],
  );
  return toSatang(row.refunded);
}

async function lockRefund(connection, refundId) {
  const [rows] = await connection.query(
    'SELECT ' + COLUMNS + ' FROM refunds WHERE id = ? FOR UPDATE',
    [refundId],
  );
  return rows[0] || null;
}

/** POST /payments/{paymentId}/refunds — request a refund (status REQUESTED). */
export async function requestRefund(actor, paymentId, rawBody, idempotencyKey) {
  const body = requireBody(rawBody);
  const amount = parseAmount(body.amount);
  const reason = readText(body, 'reason', { max: 500, required: true });
  const requestHash = hashRequest({
    userId: actor.userId,
    paymentId,
    amount,
    reason,
  });
  const paymentNotFound = () =>
    httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');

  return withTransaction(async (connection) => {
    const replay = await claimKey(
      connection,
      SCOPE,
      idempotencyKey,
      requestHash,
    );
    if (replay) return { ...replay, replayed: true };

    const [found] = await connection.query(
      'SELECT order_id FROM payments WHERE id = ?',
      [paymentId],
    );
    if (!found.length) throw paymentNotFound();
    const order = await lockOrder(connection, found[0].order_id);
    assertOrderAccess(actor, order, paymentNotFound);
    const payment = await lockPayment(connection, paymentId);
    if (payment.status !== 'SUCCESS') {
      throw httpError(
        409,
        'PAYMENT_NOT_REFUNDABLE',
        'Only SUCCESS payments can be refunded (current: ' +
          payment.status +
          ')',
      );
    }
    const refundable =
      toSatang(payment.amount) -
      (await refundedForPayment(connection, paymentId));
    if (amount > refundable) {
      throw httpError(
        422,
        'AMOUNT_EXCEEDS_REFUNDABLE',
        'amount is more than the refundable balance ' + formatMoney(refundable),
        [{ field: 'amount', issue: 'exceeds_refundable' }],
      );
    }
    const id = randomUUID();
    try {
      await connection.query(
        'INSERT INTO refunds (id, payment_id, order_id, amount, reason, requested_by) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          paymentId,
          payment.order_id,
          formatMoney(amount),
          reason,
          actor.userId,
        ],
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw httpError(
          409,
          'REFUND_ALREADY_REQUESTED',
          'This payment already has a refund request waiting for review',
        );
      }
      throw error;
    }
    const response = { data: refundToApi(await lockRefund(connection, id)) };
    await saveResponse(connection, SCOPE, idempotencyKey, {
      resourceId: id,
      statusCode: 201,
      body: response,
    });
    return { statusCode: 201, body: response, replayed: false };
  });
}

/** Shared start of approve/reject: lock order -> payment -> refund, must be REQUESTED. */
async function lockForReview(connection, refundId) {
  const [found] = await connection.query(
    'SELECT order_id, payment_id FROM refunds WHERE id = ?',
    [refundId],
  );
  if (!found.length)
    throw httpError(404, 'REFUND_NOT_FOUND', 'Refund not found');
  const order = await lockOrder(connection, found[0].order_id);
  const payment = await lockPayment(connection, found[0].payment_id);
  const refund = await lockRefund(connection, refundId);
  if (refund.status !== 'REQUESTED') {
    throw httpError(
      409,
      'REFUND_ALREADY_REVIEWED',
      'Only REQUESTED refunds can be reviewed (current: ' + refund.status + ')',
    );
  }
  return { order, payment, refund };
}

/** POST /refunds/{id}/approve — Admin records the payout reference. */
export async function approveRefund(actor, refundId, rawBody) {
  const body = requireBody(rawBody);
  const refundReference = readText(body, 'refundReference', {
    max: 150,
    required: true,
  });

  return withTransaction(async (connection) => {
    const { order, payment } = await lockForReview(connection, refundId);
    try {
      await connection.query(
        "UPDATE refunds SET status = 'REFUNDED', refund_reference = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
        [refundReference, actor.userId, new Date(), refundId],
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw httpError(
          409,
          'DUPLICATE_REFERENCE',
          'refundReference was already used',
        );
      }
      throw error;
    }
    // Payment fully returned -> REFUNDED.
    if (
      (await refundedForPayment(connection, payment.id)) >=
      toSatang(payment.amount)
    ) {
      await connection.query(
        "UPDATE payments SET status = 'REFUNDED' WHERE id = ?",
        [payment.id],
      );
    }
    // Refunds cover the whole order -> order cancelled, car available, invoices cancelled.
    const balance = await orderBalance(connection, order);
    if (balance.refunded >= balance.total) {
      await cancelOrderAfterFullRefund(connection, order);
      await connection.query(
        "UPDATE invoices SET status = 'CANCELLED' WHERE order_id = ? AND status <> 'CANCELLED'",
        [order.id],
      );
    }
    return refundToApi(await lockRefund(connection, refundId));
  });
}

/** POST /refunds/{id}/reject — reason is required; payment and order stay unchanged. */
export async function rejectRefund(actor, refundId, rawBody) {
  const body = requireBody(rawBody);
  const reason = readText(body, 'reason', { max: 500, required: true });
  return withTransaction(async (connection) => {
    await lockForReview(connection, refundId);
    await connection.query(
      "UPDATE refunds SET status = 'REJECTED', review_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
      [reason, actor.userId, new Date(), refundId],
    );
    return refundToApi(await lockRefund(connection, refundId));
  });
}

export async function getRefund(actor, refundId) {
  const scope = orderScope(actor);
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM refunds WHERE id = ?' +
      (scope.sql ? ' AND ' + scope.sql : ''),
    [refundId, ...scope.params],
  );
  if (!rows.length)
    throw httpError(404, 'REFUND_NOT_FOUND', 'Refund not found');
  return refundToApi(rows[0]);
}

export async function listOrderRefunds(actor, orderId) {
  const order = await findOrder({ query }, orderId);
  assertOrderAccess(actor, order, () =>
    httpError(404, 'ORDER_NOT_FOUND', 'Order not found'),
  );
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM refunds WHERE order_id = ? ORDER BY created_at, id',
    [orderId],
  );
  return { data: rows.map(refundToApi) };
}

export async function listRefunds(actor, queryString, paging) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    where.push(sql);
    params.push(value);
  };
  const scope = orderScope(actor);
  if (scope.sql) {
    where.push(scope.sql);
    params.push(...scope.params);
  }
  const status = readEnum(queryString.status, 'status', REFUND_STATUSES, {
    required: false,
  });
  const dateFrom = readDate(queryString.dateFrom, 'dateFrom');
  const dateTo = readDate(queryString.dateTo, 'dateTo');
  if (status) add('status = ?', status);
  if (dateFrom) add('created_at >= ?', dateFrom + ' 00:00:00');
  if (dateTo) add('created_at < ? + INTERVAL 1 DAY', dateTo + ' 00:00:00');
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await query(
    'SELECT COUNT(*) AS total FROM refunds' + whereSql,
    params,
  );
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM refunds' +
      whereSql +
      ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
    [...params, paging.limit, paging.offset],
  );
  return {
    data: rows.map(refundToApi),
    meta: { page: paging.page, limit: paging.limit, total: Number(total) },
  };
}
