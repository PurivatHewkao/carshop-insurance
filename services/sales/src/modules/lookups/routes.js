import { Router } from 'express';
import { getMysqlPool } from '../../config/mysql.js';
import { httpError, requireUuid } from '../../utils/httpError.js';

// Read-only lists that fill the dropdowns on the sales pages.
// The single local database (db schema/01_mysql_schema.sql) allows joins here.
const router = Router();
const fullName = (first, last) => (first + ' ' + last).trim();

router.get('/cars', async (req, res) => {
  const onlyAvailable = req.query.status !== 'ALL';
  const [rows] = await getMysqlPool().query(
    `SELECT c.id, c.price, c.color, c.manufacture_year, c.status, c.vin,
            m.brand, m.model_name
       FROM cars c JOIN car_models m ON m.id = c.car_model_id
      WHERE c.status <> 'INACTIVE' ${
        onlyAvailable
          ? `AND c.status = 'AVAILABLE'
             AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.car_id = c.id AND o.status <> 'CANCELLED')`
          : ''
      }
      ORDER BY m.brand, m.model_name, c.color
      LIMIT 500`,
  );
  res.json({
    data: rows.map((r) => ({
      id: r.id,
      label: `${r.brand} ${r.model_name} (${r.color}, ${r.manufacture_year})`,
      vin: r.vin,
      price: Number(r.price),
      status: r.status,
    })),
  });
});

router.get('/customers', async (_req, res) => {
  const [rows] = await getMysqlPool().query(
    `SELECT c.id, c.first_name, c.last_name, c.phone_number
       FROM customers c JOIN users u ON u.id = c.user_id
      WHERE u.status = 'ACTIVE'
      ORDER BY c.first_name, c.last_name LIMIT 500`,
  );
  res.json({
    data: rows.map((r) => ({
      id: r.id,
      name: fullName(r.first_name, r.last_name),
      phone: r.phone_number || '',
    })),
  });
});

// Sellers with how many open (PENDING / CONFIRMED) appointments each one holds.
router.get('/sellers', async (_req, res) => {
  const [rows] = await getMysqlPool().query(
    `SELECT e.id, e.first_name, e.last_name, e.position_name, e.department_name,
            (SELECT COUNT(*) FROM appointments a
              WHERE a.seller_id = e.id AND a.status IN ('PENDING','CONFIRMED')) AS active_tasks
       FROM employees e JOIN users u ON u.id = e.user_id
      WHERE u.role = 'SELLER' AND u.status = 'ACTIVE'
      ORDER BY e.first_name, e.last_name`,
  );
  res.json({
    data: rows.map((r) => ({
      id: r.id,
      name: fullName(r.first_name, r.last_name),
      position: r.position_name || '',
      branch: r.department_name || '',
      activeTasks: Number(r.active_tasks),
    })),
  });
});

router.get('/insurances', async (_req, res) => {
  const [rows] = await getMysqlPool().query(
    `SELECT id, insurance_company, insurance_name, premium
       FROM insurances WHERE status = 'ACTIVE'
      ORDER BY insurance_company, insurance_name LIMIT 200`,
  );
  res.json({
    data: rows.map((r) => ({
      id: r.id,
      label: `${r.insurance_name} (${r.insurance_company})`,
      premium: Number(r.premium),
    })),
  });
});

// Who is this user? Maps an Identity user id to a customer or employee record.
// There is no login service yet, so this does NOT authenticate anyone: it only
// resolves ids once the web app has a real user id (UUID) from Identity.
router.get('/actor', async (req, res) => {
  const userId = requireUuid(req.query.userId, 'userId');
  const pool = getMysqlPool();
  const [users] = await pool.query(
    'SELECT id, role, status FROM users WHERE id = ?',
    [userId],
  );
  const user = users[0];
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found');
  const [customers] = await pool.query(
    'SELECT id FROM customers WHERE user_id = ?',
    [userId],
  );
  const [employees] = await pool.query(
    'SELECT id FROM employees WHERE user_id = ?',
    [userId],
  );
  res.json({
    data: {
      userId,
      role: user.role,
      customerId: customers[0]?.id ?? null,
      employeeId: employees[0]?.id ?? null,
    },
  });
});

// First active employee of a role (MANAGER / SELLER) — used only as a temporary
// stand-in for "the logged-in user" until Identity provides real sessions.
router.get('/employees', async (req, res) => {
  const role = String(req.query.role || '').toUpperCase();
  if (!['SELLER', 'MANAGER', 'ADMIN'].includes(role))
    throw httpError(400, 'INVALID_ROLE', 'role must be SELLER, MANAGER or ADMIN');
  const [rows] = await getMysqlPool().query(
    `SELECT e.id, e.first_name, e.last_name
       FROM employees e JOIN users u ON u.id = e.user_id
      WHERE u.role = ? AND u.status = 'ACTIVE'
      ORDER BY e.first_name, e.last_name LIMIT 100`,
    [role],
  );
  res.json({
    data: rows.map((r) => ({ id: r.id, name: fullName(r.first_name, r.last_name) })),
  });
});

export default router;
