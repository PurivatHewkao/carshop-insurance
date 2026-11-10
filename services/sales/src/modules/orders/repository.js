import { randomUUID } from 'node:crypto';
import { getMysqlPool } from '../../config/mysql.js';
import { httpError } from '../../utils/httpError.js';
import { fromSatang, toNumber, toSatang } from '../../utils/money.js';

const MYSQL_BAD_FIELD = 1054;
const MYSQL_DUPLICATE = 1062;

// `orders` needs the columns from database/03_sales_columns.sql.
function hintMigration(error) {
  if (error?.errno === MYSQL_BAD_FIELD)
    console.error('orders is missing columns: run services/sales/database/03_sales_columns.sql');
  return error;
}

const bangkokDate = (value) =>
  new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

export function toOrder(row) {
  const premium = toNumber(row.insurance_premium);
  return {
    id: row.id,
    code: 'ORD-' + row.id.slice(0, 8).toUpperCase(),
    customerId: row.customer_id,
    customerName: (row.c_first + ' ' + row.c_last).trim(),
    phone: row.phone_number || '',
    carId: row.car_id,
    carModel: `${row.brand} ${row.model_name} (${row.color})`,
    insuranceId: row.insurance_id,
    insurancePlan: row.insurance_name
      ? `${row.insurance_name} (${row.insurance_company})`
      : 'ไม่รับประกันภัยเพิ่มเติม',
    carPrice: toNumber(row.subtotal) - premium,
    insurancePrice: premium,
    discount: toNumber(row.discount),
    totalAmount: toNumber(row.total_amount),
    sellerId: row.seller_id,
    sellerName: (row.e_first + ' ' + row.e_last).trim(),
    createdAt: bangkokDate(row.created_at),
    status: row.approval_status, // PENDING_APPROVAL | APPROVED | REJECTED
    orderStatus: row.status, // PENDING | CONFIRMED | PAID | COMPLETED | CANCELLED
    managerComment: row.manager_comment || '',
    note: row.note || '',
  };
}

const SELECT = `
  SELECT o.id, o.customer_id, o.seller_id, o.car_id, o.insurance_id, o.insurance_premium,
         o.subtotal, o.discount, o.total_amount, o.status, o.approval_status,
         o.manager_comment, o.note, o.created_at,
         c.first_name AS c_first, c.last_name AS c_last, c.phone_number,
         m.brand, m.model_name, car.color,
         i.insurance_name, i.insurance_company,
         e.first_name AS e_first, e.last_name AS e_last
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN cars car ON car.id = o.car_id
    JOIN car_models m ON m.id = car.car_model_id
    JOIN employees e ON e.id = o.seller_id
    LEFT JOIN insurances i ON i.id = o.insurance_id`;

export async function listOrders({ customerId, sellerId, approvalStatus }) {
  const where = [];
  const params = [];
  if (customerId) { where.push('o.customer_id = ?'); params.push(customerId); }
  if (sellerId) { where.push('o.seller_id = ?'); params.push(sellerId); }
  if (approvalStatus) { where.push('o.approval_status = ?'); params.push(approvalStatus); }
  try {
    const [rows] = await getMysqlPool().query(
      SELECT + (where.length ? ' WHERE ' + where.join(' AND ') : '') +
        ' ORDER BY o.created_at DESC, o.id LIMIT 500',
      params,
    );
    return rows.map(toOrder);
  } catch (error) {
    throw hintMigration(error);
  }
}

async function getOrder(db, id) {
  const [rows] = await db.query(SELECT + ' WHERE o.id = ?', [id]);
  if (!rows[0]) throw httpError(404, 'ORDER_NOT_FOUND', 'Order not found');
  return toOrder(rows[0]);
}

// Price snapshot: the car price and insurance premium are read from the database
// inside the transaction, never trusted from the browser.
export async function createOrder(input) {
  const conn = await getMysqlPool().getConnection();
  const id = randomUUID();
  try {
    await conn.beginTransaction();
    const [cars] = await conn.query('SELECT price, status FROM cars WHERE id = ? FOR UPDATE', [input.carId]);
    if (!cars[0]) throw httpError(400, 'CAR_NOT_FOUND', 'Car not found');
    if (cars[0].status !== 'AVAILABLE')
      throw httpError(409, 'CAR_NOT_AVAILABLE', 'This car is not available for sale');

    const [customers] = await conn.query('SELECT id FROM customers WHERE id = ?', [input.customerId]);
    if (!customers[0]) throw httpError(400, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    const [sellers] = await conn.query(
      `SELECT e.id FROM employees e JOIN users u ON u.id = e.user_id
        WHERE e.id = ? AND u.role = 'SELLER' AND u.status = 'ACTIVE'`,
      [input.sellerId],
    );
    if (!sellers[0]) throw httpError(400, 'SELLER_NOT_FOUND', 'Seller not found or inactive');

    let premium = 0n;
    if (input.insuranceId) {
      const [plans] = await conn.query(
        "SELECT premium FROM insurances WHERE id = ? AND status = 'ACTIVE'",
        [input.insuranceId],
      );
      if (!plans[0]) throw httpError(400, 'INSURANCE_NOT_FOUND', 'Insurance plan not found or inactive');
      premium = toSatang(plans[0].premium);
    }
    const subtotal = toSatang(cars[0].price) + premium;
    const discount = toSatang(input.discount);
    if (discount > subtotal)
      throw httpError(400, 'DISCOUNT_TOO_HIGH', 'Discount cannot be more than the subtotal');

    await conn.query(
      `INSERT INTO orders (id, customer_id, seller_id, car_id, insurance_id, insurance_premium,
                           subtotal, discount, total_amount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.customerId, input.sellerId, input.carId, input.insuranceId,
        fromSatang(premium), fromSatang(subtotal), fromSatang(discount),
        fromSatang(subtotal - discount), input.note,
      ],
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    // uq_orders_active_car: another non-cancelled order already holds this car.
    if (error?.errno === MYSQL_DUPLICATE)
      throw httpError(409, 'CAR_ALREADY_ORDERED', 'This car already has an active order');
    throw hintMigration(error);
  } finally {
    conn.release();
  }
  return getOrder(getMysqlPool(), id);
}

// Manager decision. APPROVED -> order CONFIRMED and the car RESERVED.
// REJECTED -> order CANCELLED (the unique "active car" key is released).
export async function decideOrder(id, { decision, comment }) {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT car_id, approval_status FROM orders WHERE id = ? FOR UPDATE',
      [id],
    );
    if (!rows[0]) throw httpError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (rows[0].approval_status !== 'PENDING_APPROVAL')
      throw httpError(409, 'ALREADY_DECIDED', 'This order has already been decided');

    if (decision === 'APPROVED') {
      const [reserved] = await conn.query(
        "UPDATE cars SET status = 'RESERVED' WHERE id = ? AND status = 'AVAILABLE'",
        [rows[0].car_id],
      );
      if (reserved.affectedRows === 0)
        throw httpError(409, 'CAR_NOT_AVAILABLE', 'The car is no longer available');
    }
    await conn.query(
      'UPDATE orders SET approval_status = ?, status = ?, manager_comment = ? WHERE id = ?',
      [decision, decision === 'APPROVED' ? 'CONFIRMED' : 'CANCELLED', comment, id],
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw hintMigration(error);
  } finally {
    conn.release();
  }
  return getOrder(pool, id);
}
