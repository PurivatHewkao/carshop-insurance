import { randomBytes, randomUUID } from 'node:crypto';
import { query, withTransaction } from '../../db/transaction.js';
import { findOrder, lockOrder } from '../../clients/orders.js';
import {
  assertOrderAccess,
  orderScope,
  requireEmployee,
} from '../../middleware/auth.js';
import { httpError } from '../../utils/httpError.js';
import {
  readDate,
  readEnum,
  requireBody,
  todayUtc,
} from '../../utils/validate.js';

export const INVOICE_STATUSES = ['ISSUED', 'PAID', 'CANCELLED'];
const COLUMNS =
  'id, order_id, issued_by, invoice_number, issue_date, due_date, amount, status, created_at, updated_at';

// DATE columns come back as Date at UTC midnight (pool timezone 'Z').
const dateOnly = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value;

export function invoiceToApi(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    issuedBy: row.issued_by,
    invoiceNumber: row.invoice_number,
    issueDate: dateOnly(row.issue_date),
    dueDate: dateOnly(row.due_date),
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function newInvoiceNumber(today) {
  return (
    'INV-' +
    today.replaceAll('-', '') +
    '-' +
    randomBytes(3).toString('hex').toUpperCase()
  );
}

const orderNotFound = () =>
  httpError(404, 'ORDER_NOT_FOUND', 'Order not found');

/**
 * POST /orders/{orderId}/invoices — an employee issues an invoice for the full order total.
 * issued_by = the logged-in employee (a seller only for their own orders).
 */
export async function createInvoice(actor, orderId, rawBody) {
  const body = requireBody(rawBody);
  const issuedBy = requireEmployee(actor);
  const today = todayUtc();
  const dueDate = readDate(body.dueDate, 'dueDate');
  if (dueDate && dueDate < today) {
    throw httpError(400, 'VALIDATION_ERROR', 'dueDate cannot be in the past', [
      { field: 'dueDate', issue: 'past_date' },
    ]);
  }

  return withTransaction(async (connection) => {
    const order = await lockOrder(connection, orderId);
    assertOrderAccess(actor, order, orderNotFound);
    if (!['CONFIRMED', 'PAID'].includes(order.status)) {
      throw httpError(
        409,
        'ORDER_NOT_INVOICEABLE',
        'Invoices can be issued only for CONFIRMED or PAID orders (current: ' +
          order.status +
          ')',
      );
    }
    const [existing] = await connection.query(
      "SELECT invoice_number FROM invoices WHERE order_id = ? AND status <> 'CANCELLED' LIMIT 1",
      [orderId],
    );
    if (existing.length) {
      throw httpError(
        409,
        'INVOICE_EXISTS',
        'Order already has invoice ' +
          existing[0].invoice_number +
          '; cancel it first',
      );
    }
    const id = randomUUID();
    const status = order.status === 'PAID' ? 'PAID' : 'ISSUED';
    for (let attempt = 0; ; attempt += 1) {
      try {
        await connection.query(
          `INSERT INTO invoices (id, order_id, issued_by, invoice_number, issue_date, due_date, amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            orderId,
            issuedBy,
            newInvoiceNumber(today),
            today,
            dueDate,
            order.total_amount,
            status,
          ],
        );
        break;
      } catch (error) {
        // invoice_number collision: retry with a new random suffix.
        if (error.code !== 'ER_DUP_ENTRY' || attempt >= 4) throw error;
      }
    }
    const [rows] = await connection.query(
      'SELECT ' + COLUMNS + ' FROM invoices WHERE id = ?',
      [id],
    );
    return invoiceToApi(rows[0]);
  });
}

/** POST /invoices/{id}/cancel — only ISSUED (unpaid) invoices. */
export async function cancelInvoice(invoiceId) {
  return withTransaction(async (connection) => {
    const [rows] = await connection.query(
      'SELECT ' + COLUMNS + ' FROM invoices WHERE id = ? FOR UPDATE',
      [invoiceId],
    );
    if (!rows.length)
      throw httpError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    if (rows[0].status !== 'ISSUED') {
      throw httpError(
        409,
        'INVOICE_NOT_CANCELLABLE',
        'Only ISSUED invoices can be cancelled (current: ' +
          rows[0].status +
          ')',
      );
    }
    await connection.query(
      "UPDATE invoices SET status = 'CANCELLED' WHERE id = ?",
      [invoiceId],
    );
    const [updated] = await connection.query(
      'SELECT ' + COLUMNS + ' FROM invoices WHERE id = ?',
      [invoiceId],
    );
    return invoiceToApi(updated[0]);
  });
}

export async function getInvoice(actor, invoiceId) {
  const scope = orderScope(actor);
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM invoices WHERE id = ?' +
      (scope.sql ? ' AND ' + scope.sql : ''),
    [invoiceId, ...scope.params],
  );
  if (!rows.length)
    throw httpError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  return invoiceToApi(rows[0]);
}

export async function listOrderInvoices(actor, orderId) {
  const order = await findOrder({ query }, orderId);
  assertOrderAccess(actor, order, orderNotFound);
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM invoices WHERE order_id = ? ORDER BY created_at, id',
    [orderId],
  );
  return { data: rows.map(invoiceToApi) };
}

export async function listInvoices(actor, queryString, paging) {
  const where = [];
  const params = [];
  const scope = orderScope(actor);
  if (scope.sql) {
    where.push(scope.sql);
    params.push(...scope.params);
  }
  const status = readEnum(queryString.status, 'status', INVOICE_STATUSES, {
    required: false,
  });
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await query(
    'SELECT COUNT(*) AS total FROM invoices' + whereSql,
    params,
  );
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM invoices' +
      whereSql +
      ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
    [...params, paging.limit, paging.offset],
  );
  return {
    data: rows.map(invoiceToApi),
    meta: { page: paging.page, limit: paging.limit, total: Number(total) },
  };
}
