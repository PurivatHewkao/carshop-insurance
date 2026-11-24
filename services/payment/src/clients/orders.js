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

// ---------- made-to-order cars (Catalog database/09_production_queue.sql) ----------
// A car is made-to-order when cars.production_status IS NOT NULL. Databases that do
// not have the production columns yet behave as if every car were a stock car.
const MISSING_SCHEMA = new Set(['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR']);
const DAY_MS = 86_400_000;
const dateOnly = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : (value ?? null);
// After production starts the deposit is kept, unless the car is this many days late.
export const FREE_CANCEL_DELAY_DAYS = 30;
export const PRODUCTION_STARTED = [
  'IN_PRODUCTION',
  'IN_TRANSIT',
  'READY',
  'DELIVERED',
];
export const carIsReady = (production) =>
  !production || ['READY', 'DELIVERED'].includes(production.status);

export function productionInfo(row) {
  if (!row || !row.production_status) return null;
  const etaTo = dateOnly(row.eta_to);
  const firstEtaTo = dateOnly(row.first_eta_to);
  return {
    status: row.production_status,
    etaFrom: dateOnly(row.eta_from),
    etaTo,
    readyDate: dateOnly(row.ready_date),
    delayDays:
      etaTo && firstEtaTo
        ? Math.max(
            0,
            Math.round((Date.parse(etaTo) - Date.parse(firstEtaTo)) / DAY_MS),
          )
        : 0,
  };
}

/** Production state of a car, or null for a stock car. */
export async function findCarProduction(connection, carId) {
  try {
    const [rows] = await connection.query(
      'SELECT production_status, eta_from, eta_to, first_eta_to, ready_date FROM cars WHERE id = ?',
      [carId],
    );
    return productionInfo(rows[0]);
  } catch (error) {
    if (MISSING_SCHEMA.has(error.code)) return null;
    throw error;
  }
}

/**
 * Full refund: order -> cancelled. A stock car goes back to AVAILABLE; a made-to-order
 * car is not resold as stock: it becomes INACTIVE and its production CANCELLED.
 */
export async function cancelOrderAfterFullRefund(connection, order) {
  await connection.query(
    "UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND status IN ('CONFIRMED','PAID')",
    [order.id],
  );
  if (await findCarProduction(connection, order.car_id)) {
    await connection.query(
      "UPDATE cars SET status = 'INACTIVE', production_status = 'CANCELLED' WHERE id = ? AND status = 'RESERVED'",
      [order.car_id],
    );
    return;
  }
  await connection.query(
    "UPDATE cars SET status = 'AVAILABLE' WHERE id = ? AND status = 'RESERVED'",
    [order.car_id],
  );
}

/**
 * Trim and wheel of a configured car (Catalog 07_toyoty_configurator.sql), or null
 * when the car has none or the configurator tables are not there yet.
 */
const TRIM_LABELS = {
  ECO: 'Eco',
  BALANCED: 'Balanced',
  HIGH_PERFORMANCE: 'High Performance',
};
export async function findCarSpec(connection, carId) {
  try {
    const [rows] = await connection.query(
      `SELECT t.code AS trim_code, w.name AS wheel_name
       FROM cars c
       LEFT JOIN car_trims t ON t.id = c.trim_id
       LEFT JOIN wheel_options w ON w.id = c.wheel_id
       WHERE c.id = ?`,
      [carId],
    );
    const row = rows[0];
    if (!row || (!row.trim_code && !row.wheel_name)) return null;
    return {
      trim: TRIM_LABELS[row.trim_code] || row.trim_code || null,
      wheel: row.wheel_name || null,
    };
  } catch (error) {
    if (MISSING_SCHEMA.has(error.code)) return null;
    throw error;
  }
}

/** "TOYOTY Khon Balanced ปี 2026 สี ขาวมุก · ล้อ 18" สปอร์ต" for PDFs. */
export function carDescription(context) {
  if (!context) return 'รถยนต์ตามออเดอร์';
  const spec = context.spec;
  return (
    `${context.brand} ${context.model_name}` +
    (spec?.trim ? ' ' + spec.trim : '') +
    ` ปี ${context.manufacture_year} สี ${context.color}` +
    (spec?.wheel ? ' · ล้อ ' + spec.wheel : '')
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
  // Production columns exist only after Catalog 09_production_queue.sql.
  const select = (production) =>
    connection.query(
      `SELECT o.id, o.status, o.total_amount, o.created_at, o.vehicle_configuration,
       o.down_payment, o.down_payment_percent, o.interest_rate, o.installment_count, o.installment_years, ${production}
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
  let rows;
  try {
    [rows] = await select(
      'car.production_status, car.eta_from, car.eta_to, car.first_eta_to, car.ready_date,',
    );
  } catch (error) {
    if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
    [rows] = await select('NULL AS production_status,');
  }
  return { rows, total: Number(total) };
}

/**
 * Everything printed on an invoice PDF besides the invoice row itself:
 * customer, seller, car and the employee who issued it. Null if the order is missing.
 */
export async function findInvoiceContext(connection, orderId, issuedBy) {
  const [rows] = await connection.query(
    `SELECT o.id, o.status, o.total_amount, o.customer_id, o.seller_id,
       TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS customer_name,
       c.phone_number AS customer_phone, c.email AS customer_email,
       TRIM(CONCAT(e.first_name, ' ', e.last_name)) AS seller_name,
       (SELECT TRIM(CONCAT(i.first_name, ' ', i.last_name)) FROM employees i
         WHERE i.id = ?) AS issuer_name,
       m.brand, m.model_name, car.id AS car_id, car.color, car.manufacture_year, car.vin,
       car.license_plate
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN employees e ON e.id = o.seller_id
     JOIN cars car ON car.id = o.car_id
     JOIN car_models m ON m.id = car.car_model_id
     WHERE o.id = ?`,
    [issuedBy, orderId],
  );
  if (!rows[0]) return null;
  return { ...rows[0], spec: await findCarSpec(connection, rows[0].car_id) };
}

/**
 * Price lines of an order for the invoice PDF: subtotal (car + insurance), discount,
 * insurance premium. insurance_premium is added by Sales migration 03; databases
 * without it (e.g. the payment test DB) get 0.
 */
export async function findOrderLines(connection, orderId) {
  const sql = (premium) =>
    `SELECT subtotal, discount, ${premium} AS insurance_premium FROM orders WHERE id = ?`;
  try {
    const [rows] = await connection.query(sql('insurance_premium'), [orderId]);
    return rows[0] || null;
  } catch (error) {
    if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
    const [rows] = await connection.query(sql('0'), [orderId]);
    return rows[0] || null;
  }
}
