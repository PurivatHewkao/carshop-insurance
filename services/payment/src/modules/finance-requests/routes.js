import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { query, withTransaction } from '../../db/transaction.js';
import { findOrder } from '../../clients/orders.js';
import {
  assertOrderAccess,
  FINANCE,
  orderScope,
  requireRoles,
} from '../../middleware/auth.js';
import { httpError } from '../../utils/httpError.js';
import {
  readEnum,
  readPaging,
  readText,
  requireBody,
  requireUuid,
} from '../../utils/validate.js';

// "ติดต่อการเงิน" — seller -> Finance notes about an order (migration 002).
// Seller: create + list own. Finance (admin/finance): list all + reply. Manager: read.
const STATUSES = ['OPEN', 'DONE'];
const COLUMNS =
  'id, order_id, topic, message, status, created_by, reply, replied_by, replied_at, created_at, updated_at';
const router = Router();

function toApi(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    topic: row.topic,
    message: row.message,
    status: row.status,
    createdBy: row.created_by,
    reply: row.reply,
    repliedBy: row.replied_by,
    repliedAt: row.replied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.post('/finance-requests', requireRoles('seller'), async (req, res) => {
  const body = requireBody(req.body);
  const orderId = requireUuid(body.orderId, 'orderId');
  const topic = readText(body, 'topic', { max: 100, required: true });
  const message = readText(body, 'message', { max: 500, required: true });
  const order = await findOrder({ query }, orderId);
  assertOrderAccess(req.actor, order, () =>
    httpError(404, 'ORDER_NOT_FOUND', 'Order not found'),
  );
  const id = randomUUID();
  await query(
    'INSERT INTO finance_requests (id, order_id, topic, message, created_by) VALUES (?, ?, ?, ?, ?)',
    [id, orderId, topic, message, req.actor.userId],
  );
  const [rows] = await query(
    'SELECT ' + COLUMNS + ' FROM finance_requests WHERE id = ?',
    [id],
  );
  res.status(201).json({ data: toApi(rows[0]) });
});

router.get(
  '/finance-requests',
  requireRoles('seller', 'manager', ...FINANCE),
  async (req, res) => {
    const paging = readPaging(req.query);
    const status = readEnum(req.query.status, 'status', STATUSES, {
      required: false,
    });
    const where = [];
    const params = [];
    const scope = orderScope(req.actor);
    if (scope.sql) {
      where.push(scope.sql);
      params.push(...scope.params);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const [[{ total }]] = await query(
      'SELECT COUNT(*) AS total FROM finance_requests' + whereSql,
      params,
    );
    const [rows] = await query(
      'SELECT ' +
        COLUMNS +
        ' FROM finance_requests' +
        whereSql +
        ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
      [...params, paging.limit, paging.offset],
    );
    res.set('Cache-Control', 'no-store').json({
      data: rows.map(toApi),
      meta: { page: paging.page, limit: paging.limit, total: Number(total) },
    });
  },
);

router.post(
  '/finance-requests/:id/reply',
  requireRoles(...FINANCE),
  async (req, res) => {
    const id = requireUuid(req.params.id);
    const reply = readText(requireBody(req.body), 'reply', {
      max: 500,
      required: true,
    });
    const data = await withTransaction(async (connection) => {
      const [rows] = await connection.query(
        'SELECT ' + COLUMNS + ' FROM finance_requests WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!rows.length)
        throw httpError(404, 'REQUEST_NOT_FOUND', 'Request not found');
      if (rows[0].status !== 'OPEN')
        throw httpError(409, 'REQUEST_CLOSED', 'Request was already answered');
      await connection.query(
        "UPDATE finance_requests SET status = 'DONE', reply = ?, replied_by = ?, replied_at = ? WHERE id = ?",
        [reply, req.actor.userId, new Date(), id],
      );
      const [updated] = await connection.query(
        'SELECT ' + COLUMNS + ' FROM finance_requests WHERE id = ?',
        [id],
      );
      return toApi(updated[0]);
    });
    res.json({ data });
  },
);

export default router;
