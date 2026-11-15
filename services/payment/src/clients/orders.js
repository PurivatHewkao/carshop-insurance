// TEMPORARY order access.
// `orders` belongs to Sales (เฟียร์) and `cars` to Catalog (กร). Until the Sales
// service has an order API, Payment reads/updates them directly in the shared
// carshop_sql database (see db schema/01_mysql_schema.sql). Every cross-service
// touch is in this file, so switching to HTTP calls later only changes this file.
// The rules follow "Order status และกฎทางธุรกิจ" in the API tab of the Car Shop Doc.

/** Locks the order row for the rest of the transaction. Returns null if missing. */
export async function lockOrder(connection, orderId) {
  const [rows] = await connection.query(
    'SELECT id, customer_id, seller_id, car_id, total_amount, status FROM orders WHERE id = ? FOR UPDATE',
    [orderId],
  );
  return rows[0] || null;
}

export async function findOrder(connection, orderId) {
  const [rows] = await connection.query(
    'SELECT id, customer_id, seller_id, car_id, total_amount, status FROM orders WHERE id = ?',
    [orderId],
  );
  return rows[0] || null;
}

/** confirmed -> paid when confirmed payments cover total_amount. */
export async function markOrderPaid(connection, orderId) {
  await connection.query(
    "UPDATE orders SET status = 'PAID' WHERE id = ? AND status = 'CONFIRMED'",
    [orderId],
  );
}

/** Full refund: order -> cancelled and the car goes back to available. */
export async function cancelOrderAfterFullRefund(connection, order) {
  await connection.query(
    "UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND status IN ('CONFIRMED','PAID')",
    [order.id],
  );
  await connection.query(
    "UPDATE cars SET status = 'AVAILABLE' WHERE id = ? AND status = 'RESERVED'",
    [order.car_id],
  );
}

/**
 * Read-only order list for the finance pages: order + customer/seller names +
 * car + money sums from payments/refunds. `scope` comes from orderScope(actor, 'o.id').
 */
export async function listOrderOverview(connection, { scope, status, paging }) {
  const where = [];
  const params = [];
  if (scope.sql) {
    where.push(scope.sql);
    params.push(...scope.params);
  }
  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await connection.query(
    'SELECT COUNT(*) AS total FROM orders o' + whereSql,
    params,
  );
  const [rows] = await connection.query(
    `SELECT o.id, o.status, o.total_amount, o.created_at,
       o.customer_id, TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS customer_name,
       o.seller_id, TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS seller_name,
       m.brand, m.model_name, car.color, car.manufacture_year,
       (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         WHERE p.order_id = o.id AND p.status IN ('SUCCESS','REFUNDED')) AS paid,
       (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
         WHERE p.order_id = o.id AND p.status = 'PENDING') AS pending,
       (SELECT COALESCE(SUM(r.amount), 0) FROM refunds r
         WHERE r.order_id = o.id AND r.status = 'REFUNDED') AS refunded
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN employees e ON e.id = o.seller_id
     JOIN cars car ON car.id = o.car_id
     JOIN car_models m ON m.id = car.car_model_id` +
      whereSql +
      ' ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?',
    [...params, paging.limit, paging.offset],
  );
  return { rows, total: Number(total) };
}
