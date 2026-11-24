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
    `SELECT c.id, c.car_model_id, c.price, c.color, c.manufacture_year, c.status, c.vin,
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
      modelId: r.car_model_id,
      brand: r.brand,
      modelName: r.model_name,
      modelLabel: `${r.brand} ${r.model_name}`,
      color: r.color,
      manufactureYear: r.manufacture_year,
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

router.get('/customers/pipeline', requireRoles('manager', 'admin'), async (_req, res) => {
  const [rows] = await getMysqlPool().query(
    `SELECT c.id, c.first_name, c.last_name, c.phone_number, u.email,
      (SELECT a.id FROM appointments a WHERE a.customer_id = c.id ORDER BY a.created_at DESC LIMIT 1) AS appointment_id,
      (SELECT a.created_at FROM appointments a WHERE a.customer_id = c.id ORDER BY a.created_at DESC LIMIT 1) AS appointment_created_at,
      (SELECT a.appointment_type FROM appointments a WHERE a.customer_id = c.id ORDER BY a.created_at DESC LIMIT 1) AS appointment_type,
      (SELECT a.status FROM appointments a WHERE a.customer_id = c.id ORDER BY a.created_at DESC LIMIT 1) AS appointment_status,
      (SELECT o.id FROM orders o WHERE o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 1) AS order_id,
      (SELECT o.created_at FROM orders o WHERE o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 1) AS order_created_at,
      (SELECT o.approval_status FROM orders o WHERE o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 1) AS approval_status,
      (SELECT o.status FROM orders o WHERE o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 1) AS order_status,
      (SELECT p.status FROM payments p WHERE p.order_id = (SELECT o.id FROM orders o WHERE o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 1) ORDER BY p.created_at DESC LIMIT 1) AS payment_status,
      (SELECT p.payment_type FROM payments p WHERE p.order_id = (SELECT o.id FROM orders o WHERE o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 1) ORDER BY p.created_at DESC LIMIT 1) AS payment_type,
      (SELECT e.first_name FROM employees e JOIN orders o ON o.seller_id=e.id WHERE o.customer_id=c.id ORDER BY o.created_at DESC LIMIT 1) AS seller_first,
      (SELECT e.last_name FROM employees e JOIN orders o ON o.seller_id=e.id WHERE o.customer_id=c.id ORDER BY o.created_at DESC LIMIT 1) AS seller_last
     FROM customers c JOIN users u ON u.id=c.user_id
     ORDER BY c.first_name,c.last_name LIMIT 500`,
  );
  res.json({ data: rows.map((r) => {
    const payment = r.payment_status === 'SUCCESS' ? (r.payment_type === 'BOOKING_DEPOSIT' ? 'ชำระเงินจองแล้ว' : 'ชำระเงินแล้ว') : r.payment_status === 'PENDING' ? 'รอตรวจการชำระ' : r.payment_status === 'REFUNDED' ? 'คืนเงินแล้ว' : null;
    const orderIsLatest = r.order_created_at && (!r.appointment_created_at || new Date(r.order_created_at) >= new Date(r.appointment_created_at));
    const orderStage = orderIsLatest && r.approval_status ? (r.approval_status === 'PENDING_APPROVAL' ? 'รอผู้จัดการอนุมัติ' : r.approval_status === 'APPROVED' ? 'รอชำระเงินจอง' : 'คำขอถูกปฏิเสธ') : null;
    const appointmentStage = r.appointment_status ? (r.appointment_status === 'PENDING' ? 'รอมอบหมายงานนัดหมาย' : r.appointment_status === 'CONFIRMED' ? 'นัดหมายยืนยันแล้ว' : r.appointment_status === 'COMPLETED' ? 'นัดหมายเสร็จสิ้น' : 'นัดหมายยกเลิก') : 'ยังไม่มีรายการ';
    const stage = orderIsLatest ? (payment || orderStage || appointmentStage) : appointmentStage;
    return { id: r.id, name: fullName(r.first_name, r.last_name), phone: r.phone_number || '', email: r.email || '', appointmentId: r.appointment_id, appointmentType: r.appointment_type || '', appointmentStatus: r.appointment_status || '', orderId: r.order_id, approvalStatus: r.approval_status || '', orderStatus: r.order_status || '', paymentStatus: r.payment_status || '', sellerName: r.seller_first ? fullName(r.seller_first, r.seller_last) : '', stage };
  }) });
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
