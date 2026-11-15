// Login + role + ownership for every Payment route (except /health).
// Session is verified by Identity through the shared packages/auth middleware;
// this file only maps the logged-in users.id to customers.id / employees.id.
import {
  createRequireSession,
  requireRoles,
} from '../../../../packages/auth/index.js';
import { env } from '../config/env.js';
import { query } from '../db/transaction.js';
import { httpError } from '../utils/httpError.js';

export { requireRoles };

// Admin does finance work (team decision 13 Oct); the FINANCE role does the same.
export const FINANCE = ['admin', 'finance'];
// Can see every order's money (no ownership filter).
export const STAFF_VIEW = ['admin', 'finance', 'manager'];

export const requireSession = createRequireSession({
  identityBaseUrl: env.identityApiUrl,
  allowedOrigins: env.corsOrigins,
  timeoutMs: 3000,
});

/**
 * After requireSession: req.actor = { userId, role, customerId, employeeId }.
 * customerId / employeeId are null when the user has no such profile row.
 */
export async function loadActor(req, _res, next) {
  const [[row]] = await query(
    `SELECT
       (SELECT id FROM customers WHERE user_id = ?) AS customer_id,
       (SELECT id FROM employees WHERE user_id = ?) AS employee_id`,
    [req.user.id, req.user.id],
  );
  req.actor = Object.freeze({
    userId: req.user.id,
    role: req.user.role,
    customerId: row?.customer_id ?? null,
    employeeId: row?.employee_id ?? null,
  });
  next();
}

export const seesAllOrders = (actor) => STAFF_VIEW.includes(actor.role);

/**
 * SQL that limits rows to orders the actor may see.
 * `column` is the order id column of the queried table (e.g. 'order_id').
 * Returns { sql, params }; sql is '' for staff (no filter).
 */
export function orderScope(actor, column = 'order_id') {
  if (seesAllOrders(actor)) return { sql: '', params: [] };
  if (actor.role === 'customer')
    return {
      sql: column + ' IN (SELECT id FROM orders WHERE customer_id = ?)',
      params: [actor.customerId],
    };
  if (actor.role === 'seller')
    return {
      sql: column + ' IN (SELECT id FROM orders WHERE seller_id = ?)',
      params: [actor.employeeId],
    };
  return { sql: '1 = 0', params: [] };
}

/** True when the actor may see this order row ({ customer_id, seller_id }). */
export function canSeeOrder(actor, order) {
  if (seesAllOrders(actor)) return true;
  if (actor.role === 'customer')
    return !!actor.customerId && order.customer_id === actor.customerId;
  if (actor.role === 'seller')
    return !!actor.employeeId && order.seller_id === actor.employeeId;
  return false;
}

/**
 * Throws 404 (same as a missing order, so ids of other customers are not
 * confirmed) when the actor may not see the order.
 */
export function assertOrderAccess(actor, order, notFound) {
  if (!order || !canSeeOrder(actor, order)) throw notFound();
}

export function requireEmployee(actor) {
  if (!actor.employeeId) {
    throw httpError(
      403,
      'EMPLOYEE_PROFILE_REQUIRED',
      'This account has no employee profile',
    );
  }
  return actor.employeeId;
}
