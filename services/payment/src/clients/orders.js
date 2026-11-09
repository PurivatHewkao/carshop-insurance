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

export async function employeeExists(connection, employeeId) {
  const [rows] = await connection.query(
    'SELECT id FROM employees WHERE id = ?',
    [employeeId],
  );
  return rows.length > 0;
}
