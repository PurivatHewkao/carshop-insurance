import { randomBytes, randomUUID } from 'node:crypto';
import { query, withTransaction } from '../../db/transaction.js';
import { claimKey, hashRequest, saveResponse } from '../../db/idempotency.js';
import { findOrder, lockOrder, markOrderPaid } from '../../clients/orders.js';
import { httpError } from '../../utils/httpError.js';
import { formatMoney, parseAmount } from '../../utils/money.js';
import {
  readDate,
  readEnum,
  readText,
  requireBody,
} from '../../utils/validate.js';
import { balanceToApi, orderBalance } from './balance.js';
import {
  assertOrderAccess,
  FINANCE,
  orderScope,
} from '../../middleware/auth.js';

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD'];
export const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
const SCOPE = 'payments.create';

export function paymentToApi(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    amount: row.amount,
    paymentMethod: row.payment_method,
    paymentDate: row.payment_date,
    status: row.status,
    transactionReference: row.transaction_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  'id, order_id, amount, payment_method, payment_date, status, transaction_reference, created_at, updated_at';

export async function lockPayment(connection, paymentId) {
  const [rows] = await connection.query(
    'SELECT ' + COLUMNS + ' FROM payments WHERE id = ? FOR UPDATE',
    [paymentId],
  );
  return rows[0] || null;
}

function orderNotFound() {
  return httpError(404, 'ORDER_NOT_FOUND', 'Order not found');
}

/** Marks ISSUED invoices of the order as PAID once the order is paid. */
async function markInvoicesPaid(connection, orderId) {
  await connection.query(
    "UPDATE invoices SET status = 'PAID' WHERE order_id = ? AND status = 'ISSUED'",
    [orderId],
  );
}

async function settleIfFullyPaid(connection, order) {
  const balance = await orderBalance(connection, order);
  if (order.status === 'CONFIRMED' && balance.netPaid >= balance.total) {
    await markOrderPaid(connection, order.id);
    await markInvoicesPaid(connection, order.id);
  }
}

/**
 * POST /orders/{orderId}/payments
 * CREDIT_CARD is a simulated gateway: SUCCESS immediately.
 * BANK_TRANSFER stays PENDING until Finance confirms (PATCH /payments/{id}).
 * CASH is recorded by Finance at the showroom, so it is SUCCESS immediately;
 * a customer cannot record CASH.
 */
export async function createPayment(actor, orderId, rawBody, idempotencyKey) {
  const body = requireBody(rawBody);
  const amount = parseAmount(body.amount);
  const paymentMethod = readEnum(
    body.paymentMethod,
    'paymentMethod',
    PAYMENT_METHODS,
  );
  if (paymentMethod === 'CASH' && !FINANCE.includes(actor.role)) {
    throw httpError(
      403,
      'PAYMENT_METHOD_NOT_ALLOWED',
      'Only Finance can record CASH payments',
    );
  }
  let reference = readText(body, 'transactionReference', { max: 150 });
  if (paymentMethod === 'BANK_TRANSFER' && !reference) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      'transactionReference is required for BANK_TRANSFER',
      [{ field: 'transactionReference', issue: 'required' }],
    );
  }
  // userId in the hash: the same key from another user is a mismatch (422), not a replay.
  const requestHash = hashRequest({
    userId: actor.userId,
    orderId,
    amount,
    paymentMethod,
    reference,
  });

  return withTransaction(async (connection) => {
    const replay = await claimKey(
      connection,
      SCOPE,
      idempotencyKey,
      requestHash,
    );
    if (replay) return { ...replay, replayed: true };

    const order = await lockOrder(connection, orderId);
    assertOrderAccess(actor, order, orderNotFound);
    if (order.status !== 'CONFIRMED') {
      throw httpError(
        409,
        'ORDER_NOT_PAYABLE',
        'Payments are accepted only for CONFIRMED orders (current: ' +
          order.status +
          ')',
      );
    }
    const balance = await orderBalance(connection, order);
    if (amount > balance.outstanding) {
      throw httpError(
        422,
        'AMOUNT_EXCEEDS_BALANCE',
        'amount is more than the outstanding balance ' +
          formatMoney(balance.outstanding),
        [{ field: 'amount', issue: 'exceeds_outstanding' }],
      );
    }

    const simulatedSuccess =
      paymentMethod === 'CREDIT_CARD' || paymentMethod === 'CASH';
    if (simulatedSuccess && !reference) {
      reference =
        (paymentMethod === 'CASH' ? 'CASH-' : 'SIM-CC-') +
        randomBytes(6).toString('hex').toUpperCase();
    }
    const id = randomUUID();
    try {
      await connection.query(
        `INSERT INTO payments (id, order_id, amount, payment_method, payment_date, status, transaction_reference)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          order.id,
          formatMoney(amount),
          paymentMethod,
          simulatedSuccess ? new Date() : null,
          simulatedSuccess ? 'SUCCESS' : 'PENDING',
          reference,
        ],
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw httpError(
          409,
          'DUPLICATE_REFERENCE',
          'transactionReference was already used',
        );
      }
      throw error;
    }
    if (simulatedSuccess) await settleIfFullyPaid(connection, order);

    const payment = await lockPayment(connection, id);
    const response = { data: paymentToApi(payment) };
    await saveResponse(connection, SCOPE, idempotencyKey, {
      resourceId: id,
      statusCode: 201,
      body: response,
    });
    return { statusCode: 201, body: response, replayed: false };
  });
}

/** PATCH /payments/{id} — Admin confirms (SUCCESS) or rejects (FAILED) a PENDING payment. */
export async function reviewPayment(paymentId, rawBody) {
  const body = requireBody(rawBody);
  const status = readEnum(body.status, 'status', ['SUCCESS', 'FAILED']);

  return withTransaction(async (connection) => {
    const [found] = await connection.query(
      'SELECT order_id FROM payments WHERE id = ?',
      [paymentId],
    );
    if (!found.length)
      throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    // Lock order before payment (same order as createPayment) to avoid deadlocks.
    const order = await lockOrder(connection, found[0].order_id);
    const payment = await lockPayment(connection, paymentId);
    if (payment.status !== 'PENDING') {
      throw httpError(
        409,
        'PAYMENT_ALREADY_REVIEWED',
        'Only PENDING payments can be reviewed (current: ' +
          payment.status +
          ')',
      );
    }
    if (status === 'SUCCESS' && !['CONFIRMED', 'PAID'].includes(order.status)) {
      throw httpError(
        409,
        'ORDER_NOT_PAYABLE',
        'Cannot confirm a payment for a ' +
          order.status +
          ' order; reject it instead',
      );
    }
    await connection.query(
      'UPDATE payments SET status = ?, payment_date = ? WHERE id = ?',
      [status, status === 'SUCCESS' ? new Date() : null, paymentId],
    );
    if (status === 'SUCCESS') await settleIfFullyPaid(connection, order);
    return paymentToApi(await lockPayment(connection, paymentId));
  });
}

export async function getPayment(actor, paymentId) {
  const scope = orderScope(actor);
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM payments WHERE id = ?' +
      (scope.sql ? ' AND ' + scope.sql : ''),
    [paymentId, ...scope.params],
  );
  if (!rows.length)
    throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
  return paymentToApi(rows[0]);
}

/** GET /orders/{orderId}/payments — history + money summary of one order. */
export async function listOrderPayments(actor, orderId) {
  const pool = { query };
  const order = await findOrder(pool, orderId);
  assertOrderAccess(actor, order, orderNotFound);
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM payments WHERE order_id = ? ORDER BY created_at, id',
    [orderId],
  );
  const balance = await orderBalance(pool, order);
  return {
    data: rows.map(paymentToApi),
    summary: balanceToApi(order, balance),
  };
}

/** GET /payments — staff see all; customer/seller see only their orders. */
export async function listPayments(actor, queryString, paging) {
  const where = [];
  const params = [];
  const scope = orderScope(actor);
  if (scope.sql) {
    where.push(scope.sql);
    params.push(...scope.params);
  }
  const status = readEnum(queryString.status, 'status', PAYMENT_STATUSES, {
    required: false,
  });
  const method = readEnum(
    queryString.paymentMethod,
    'paymentMethod',
    PAYMENT_METHODS,
    {
      required: false,
    },
  );
  const dateFrom = readDate(queryString.dateFrom, 'dateFrom');
  const dateTo = readDate(queryString.dateTo, 'dateTo');
  const add = (sql, value) => {
    where.push(sql);
    params.push(value);
  };
  if (status) add('status = ?', status);
  if (method) add('payment_method = ?', method);
  if (dateFrom) add('created_at >= ?', dateFrom + ' 00:00:00');
  if (dateTo) add('created_at < ? + INTERVAL 1 DAY', dateTo + ' 00:00:00');
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

  const [[{ total }]] = await query(
    'SELECT COUNT(*) AS total FROM payments' + whereSql,
    params,
  );
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM payments' +
      whereSql +
      ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
    [...params, paging.limit, paging.offset],
  );
  return {
    data: rows.map(paymentToApi),
    meta: { page: paging.page, limit: paging.limit, total: Number(total) },
  };
}
