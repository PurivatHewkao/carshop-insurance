import { randomBytes, randomUUID } from 'node:crypto';
import { query, withTransaction } from '../../db/transaction.js';
import { employeeExists, findOrder, lockOrder } from '../../clients/orders.js';
import { httpError } from '../../utils/httpError.js';
import {
  optionalUuid,
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

/**
 * POST /orders/{orderId}/invoices — Seller/Admin issues an invoice for the full order total.
 * issuedBy (employee id) comes from the body until Identity provides the logged-in user.
 */
export async function createInvoice(orderId, rawBody) {
  const body = requireBody(rawBody);
  const issuedBy = optionalUuid(body.issuedBy, 'issuedBy');
  if (!issuedBy) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      'issuedBy (employee id) is required',
      [{ field: 'issuedBy', issue: 'required' }],
    );
  }
  const today = todayUtc();
  const dueDate = readDate(body.dueDate, 'dueDate');
  if (dueDate && dueDate < today) {
    throw httpError(400, 'VALIDATION_ERROR', 'dueDate cannot be in the past', [
      { field: 'dueDate', issue: 'past_date' },
    ]);
  }

  return withTransaction(async (connection) => {
    const order = await lockOrder(connection, orderId);
    if (!order) throw httpError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!['CONFIRMED', 'PAID'].includes(order.status)) {
      throw httpError(
        409,
        'ORDER_NOT_INVOICEABLE',
        'Invoices can be issued only for CONFIRMED or PAID orders (current: ' +
          order.status +
          ')',
      );
    }
    if (!(await employeeExists(connection, issuedBy))) {
      throw httpError(
        422,
        'EMPLOYEE_NOT_FOUND',
        'issuedBy is not an employee',
        [{ field: 'issuedBy', issue: 'not_found' }],
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

export async function getInvoice(invoiceId) {
  const [rows] = await query(
    'SELECT ' + COLUMNS + ' FROM invoices WHERE id = ?',
    [invoiceId],
  );
  if (!rows.length)
    throw httpError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
  return invoiceToApi(rows[0]);
}

export async function listOrderInvoices(orderId) {
  const order = await findOrder({ query }, orderId);
  if (!order) throw httpError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const [rows] = await query(
    'SELECT ' +
      COLUMNS +
      ' FROM invoices WHERE order_id = ? ORDER BY created_at, id',
    [orderId],
  );
  return { data: rows.map(invoiceToApi) };
}

export async function listInvoices(queryString, paging) {
  const where = [];
  const params = [];
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
