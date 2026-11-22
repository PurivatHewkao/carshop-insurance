import { Router } from 'express';
import { getMysqlPool } from '../../config/mysql.js';
import { requireRoles } from '../../../../../packages/auth/index.js';
import { httpError, requireUuid } from '../../utils/httpError.js';

// Read-only lists that fill the dropdowns on the sales pages.
// The single local database (db schema/01_mysql_schema.sql) allows joins here.
const router = Router();
const fullName = (first, last) => (first + ' ' + last).trim();
const allowSales = requireRoles('seller', 'manager', 'admin');
const allowSignedIn = requireRoles('customer', 'seller', 'manager', 'admin');

router.get('/cars', allowSignedIn, async (req, res) => {
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

router.get('/customers', allowSales, async (_req, res) => {
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

router.get('/customers/:id', allowSales, async (req, res) => {
  const customerId = requireUuid(req.params.id, 'customerId');
  const pool = getMysqlPool();
  if (req.user.role === 'seller') {
    const [employees] = await pool.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [req.user.id],
    );
    const employeeId = employees[0]?.id;
    if (!employeeId) throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    const [related] = await pool.query(
      `SELECT 1 FROM appointments WHERE customer_id = ? AND seller_id = ?
       UNION ALL
       SELECT 1 FROM orders WHERE customer_id = ? AND seller_id = ?
       LIMIT 1`,
      [customerId, employeeId, customerId, employeeId],
    );
    if (!related[0]) throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  const [rows] = await pool.query(
    `SELECT c.id, c.first_name, c.last_name, c.phone_number, u.email
       FROM customers c JOIN users u ON u.id = c.user_id
      WHERE c.id = ? AND u.status = 'ACTIVE' LIMIT 1`,
    [customerId],
  );
  if (!rows[0]) throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  const customer = rows[0];
  res.json({
    data: {
      id: customer.id,
      name: fullName(customer.first_name, customer.last_name),
      phone: customer.phone_number || '',
      email: customer.email,
    },
  });
});

// Sellers with how many open (PENDING / CONFIRMED) appointments each one holds.
router.get('/sellers', allowSales, async (_req, res) => {
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

router.get('/insurances', allowSignedIn, async (_req, res) => {
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

// Resolve the authenticated session only; never accept a user id from query/body.
router.get('/actor', allowSignedIn, async (req, res) => {
  const { id: userId, role } = req.user;
  const [customers] = await getMysqlPool().query('SELECT id FROM customers WHERE user_id = ?', [userId]);
  const [employees] = await getMysqlPool().query('SELECT id FROM employees WHERE user_id = ?', [userId]);
  res.json({
    data: {
      userId,
      role,
      customerId: customers[0]?.id ?? null,
      employeeId: employees[0]?.id ?? null,
    },
  });
});

export default router;
