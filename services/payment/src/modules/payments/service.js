import { randomBytes, randomUUID } from 'node:crypto';
import { query, withTransaction } from '../../db/transaction.js';
import { claimKey, hashRequest, saveResponse } from '../../db/idempotency.js';
import {
  carIsReady,
  findCarProduction,
  findOrder,
  lockOrder,
  markOrderPaid,
} from '../../clients/orders.js';
import { httpError } from '../../utils/httpError.js';
import { formatMoney, parseAmount, toSatang } from '../../utils/money.js';
import { env } from '../../config/env.js';
import {
  readDate,
  readEnum,
  readText,
  requireBody,
} from '../../utils/validate.js';
import { balanceToApi, orderBalance } from './balance.js';
import { flowToApi, loadFlow } from './flow.js';
import {
  assertOrderAccess,
  FINANCE,
  orderScope,
} from '../../middleware/auth.js';

export const PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'CREDIT_CARD',
  'FINANCE',
];
// What the money is for. A cash buyer: BOOKING_DEPOSIT -> BALANCE.
// A hire-purchase buyer: BOOKING_DEPOSIT -> DOWN_PAYMENT -> FINANCE_DISBURSEMENT
// (the finance company transfers the loan amount to the showroom).
export const PAYMENT_TYPES = [
  'BOOKING_DEPOSIT',
  'DOWN_PAYMENT',
  'BALANCE',
  'FINANCE_DISBURSEMENT',
];
export const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
const SCOPE = 'payments.create';

export function paymentToApi(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    amount: row.amount,
    paymentMethod: row.payment_method,
    paymentType: row.payment_type,
    financeCompany: row.finance_company,
    paymentDate: row.payment_date,
    status: row.status,
    transactionReference: row.transaction_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  'id, order_id, amount, payment_method, payment_type, payment_date, status, transaction_reference, finance_company, created_at, updated_at';
const CARD_LIMIT = toSatang(env.creditCardMaxPerOrder);
const DEPOSIT_LIMIT = toSatang(env.bookingDepositMax);

/** Order-level rules for the kind of payment (runs with the order row locked). */
async function assertPaymentPlan(
  connection,
  orderId,
  { paymentMethod, paymentType, amount },
) {
  const [[stats]] = await connection.query(
    `SELECT
       COUNT(*) AS live_count,
       COALESCE(SUM(payment_type = 'BOOKING_DEPOSIT'), 0) AS deposits,
       COALESCE(SUM(payment_type = 'FINANCE_DISBURSEMENT'), 0) AS disbursements,
       COALESCE(SUM(CASE WHEN payment_method = 'CREDIT_CARD' THEN amount ELSE 0 END), 0) AS card_total
     FROM payments WHERE order_id = ? AND status IN ('PENDING', 'SUCCESS')`,
    [orderId],
  );
  if (paymentType === 'BOOKING_DEPOSIT') {
    if (amount > DEPOSIT_LIMIT) {
      throw httpError(
        422,
        'DEPOSIT_TOO_HIGH',
        'A booking deposit is at most ' + formatMoney(DEPOSIT_LIMIT),
        [{ field: 'amount', issue: 'deposit_limit' }],
      );
    }
    if (Number(stats.deposits) > 0) {
      throw httpError(
        409,
        'BOOKING_DEPOSIT_EXISTS',
        'This order already has a booking deposit',
      );
    }
    if (Number(stats.live_count) > 0) {
      throw httpError(
        409,
        'BOOKING_DEPOSIT_NOT_FIRST',
        'The booking deposit must be the first payment of the order',
      );
    }
  }
  if (
    paymentType === 'FINANCE_DISBURSEMENT' &&
    Number(stats.disbursements) > 0
  ) {
    throw httpError(
      409,
      'FINANCE_ALREADY_DISBURSED',
      'The finance company has already paid this order',
    );
  }
  if (paymentMethod === 'CREDIT_CARD') {
    const used = toSatang(stats.card_total);
    if (used + amount > CARD_LIMIT) {
      throw httpError(
        422,
        'CARD_LIMIT_EXCEEDED',
        'Credit card payments are limited to ' +
          formatMoney(CARD_LIMIT) +
          ' per order (remaining ' +
          formatMoney(Math.max(0, CARD_LIMIT - used)) +
          '); pay the rest by bank transfer or finance',
        [{ field: 'amount', issue: 'card_limit' }],
      );
    }
  }
}

/**
 * Step order of the purchase flow (payments/flow.js). A hire-purchase order:
 * deposit first → down payment in full, once → finance loan / rest.
 * A cash order may not pay DOWN_PAYMENT (there is no loan to put it against).
 */
function assertFlowStep(flow, { paymentType, amount }) {
  if (flow.plan === 'CASH') {
    if (paymentType === 'DOWN_PAYMENT') {
      throw httpError(
        422,
        'DOWN_PAYMENT_NOT_IN_PLAN',
        'This order is paid in cash: use BALANCE instead of DOWN_PAYMENT',
        [{ field: 'paymentType', issue: 'not_in_plan' }],
      );
    }
    return;
  }
  if (paymentType === 'BOOKING_DEPOSIT') return; // first-payment rules: assertPaymentPlan
  if (flow.depositStatus !== 'PAID') {
    throw httpError(
      409,
      flow.depositStatus === 'PENDING'
        ? 'BOOKING_DEPOSIT_NOT_CONFIRMED'
        : 'BOOKING_DEPOSIT_REQUIRED',
      flow.depositStatus === 'PENDING'
        ? 'Finance has not confirmed the booking deposit yet'
        : 'Pay the booking deposit first (step 1)',
    );
  }
  if (paymentType === 'DOWN_PAYMENT') {
    if (flow.downStatus === 'NOT_REQUIRED') {
      throw httpError(
        409,
        'DOWN_PAYMENT_NOT_REQUIRED',
        'The booking deposit already covers the down payment of this order',
      );
    }
    if (flow.downStatus === 'PAID' || flow.downStatus === 'PENDING') {
      throw httpError(
        409,
        'DOWN_PAYMENT_EXISTS',
        'The down payment of this order was already paid',
      );
    }
    if (amount !== flow.downDue) {
      throw httpError(
        422,
        'DOWN_PAYMENT_MUST_BE_FULL',
        'The down payment is paid in full in one payment: ' +
          formatMoney(flow.downDue) +
          ' (agreed ' +
          formatMoney(flow.agreedDown) +
          ' minus the booking deposit ' +
          formatMoney(flow.deposit) +
          ')',
        [
          {
            field: 'amount',
            issue: 'must_equal',
            expected: formatMoney(flow.downDue),
          },
        ],
      );
    }
    return;
  }
  // FINANCE_DISBURSEMENT / BALANCE come after the customer paid the down payment.
  if (!['PAID', 'NOT_REQUIRED'].includes(flow.downStatus)) {
    throw httpError(
      409,
      'DOWN_PAYMENT_REQUIRED',
      flow.downStatus === 'PENDING'
        ? 'Finance has not confirmed the down payment yet'
        : 'The customer pays the down payment first (step 3)',
    );
  }
}

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
 * FINANCE is the loan amount a finance company transferred to the showroom:
 * Finance records it (SUCCESS) with the contract number and company name.
 * CREDIT_CARD is capped per order (CREDIT_CARD_MAX_PER_ORDER, default 100,000).
 * paymentType says what the money is for (default BALANCE; FINANCE -> FINANCE_DISBURSEMENT).
 */
export async function createPayment(actor, orderId, rawBody, idempotencyKey) {
  const body = requireBody(rawBody);
  const amount = parseAmount(body.amount);
  const paymentMethod = readEnum(
    body.paymentMethod,
    'paymentMethod',
    PAYMENT_METHODS,
  );
  const paymentType =
    readEnum(body.paymentType, 'paymentType', PAYMENT_TYPES, {
      required: false,
    }) || (paymentMethod === 'FINANCE' ? 'FINANCE_DISBURSEMENT' : 'BALANCE');
  if (
    (paymentMethod === 'CASH' || paymentMethod === 'FINANCE') &&
    !FINANCE.includes(actor.role)
  ) {
    throw httpError(
      403,
      'PAYMENT_METHOD_NOT_ALLOWED',
      'Only Finance can record ' + paymentMethod + ' payments',
    );
  }
  if (
    (paymentMethod === 'FINANCE') !==
    (paymentType === 'FINANCE_DISBURSEMENT')
  ) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      'paymentType FINANCE_DISBURSEMENT goes only with paymentMethod FINANCE',
      [{ field: 'paymentType', issue: 'method_mismatch' }],
    );
  }
  let reference = readText(body, 'transactionReference', { max: 150 });
  if (
    (paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'FINANCE') &&
    !reference
  ) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      'transactionReference is required for ' + paymentMethod,
      [{ field: 'transactionReference', issue: 'required' }],
    );
  }
  // FINANCE: the company that sent the loan. DOWN_PAYMENT: the company that approved
  // the customer's loan (step 3 of the purchase flow), printed on the receipt.
  const financeCompany =
    paymentMethod === 'FINANCE' || paymentType === 'DOWN_PAYMENT'
      ? readText(body, 'financeCompany', { max: 150, required: true }).trim()
      : null;
  // userId in the hash: the same key from another user is a mismatch (422), not a replay.
  const requestHash = hashRequest({
    userId: actor.userId,
    orderId,
    amount,
    paymentMethod,
    paymentType,
    reference,
    financeCompany,
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
    // Nothing is paid before the manager approves the order (step 1 starts after approval).
    if (order.status !== 'CONFIRMED') {
      throw httpError(
        409,
        'ORDER_NOT_PAYABLE',
        order.status === 'PENDING'
          ? 'This order is waiting for the manager: the booking deposit can be paid after approval'
          : 'Payments are accepted only for CONFIRMED orders (current: ' +
              order.status +
              ')',
      );
    }
    assertFlowStep(await loadFlow(connection, order), {
      paymentType,
      amount,
    });
    // A made-to-order car is paid off (cash balance or finance loan) once it has arrived.
    if (paymentType === 'BALANCE' || paymentType === 'FINANCE_DISBURSEMENT') {
      const production = await findCarProduction(connection, order.car_id);
      if (!carIsReady(production)) {
        throw httpError(
          409,
          'CAR_NOT_READY',
          'The final payment of a made-to-order car is due when the car has arrived (production: ' +
            production.status +
            ')',
        );
      }
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
    await assertPaymentPlan(connection, order.id, {
      paymentMethod,
      paymentType,
      amount,
    });

    // Only BANK_TRANSFER waits for Finance to check the slip.
    const simulatedSuccess = paymentMethod !== 'BANK_TRANSFER';
    if (simulatedSuccess && !reference) {
      reference =
        (paymentMethod === 'CASH' ? 'CASH-' : 'SIM-CC-') +
        randomBytes(6).toString('hex').toUpperCase();
    }
    const id = randomUUID();
    try {
      await connection.query(
        `INSERT INTO payments (id, order_id, amount, payment_method, payment_type, payment_date, status,
                               transaction_reference, finance_company)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          order.id,
          formatMoney(amount),
          paymentMethod,
          paymentType,
          simulatedSuccess ? new Date() : null,
          simulatedSuccess ? 'SUCCESS' : 'PENDING',
          reference,
          financeCompany,
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
    flow: flowToApi(await loadFlow(pool, order)),
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
  const type = readEnum(
    queryString.paymentType,
    'paymentType',
    PAYMENT_TYPES,
    { required: false },
  );
  const dateFrom = readDate(queryString.dateFrom, 'dateFrom');
  const dateTo = readDate(queryString.dateTo, 'dateTo');
  const add = (sql, value) => {
    where.push(sql);
    params.push(value);
  };
  if (status) add('status = ?', status);
  if (method) add('payment_method = ?', method);
  if (type) add('payment_type = ?', type);
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
