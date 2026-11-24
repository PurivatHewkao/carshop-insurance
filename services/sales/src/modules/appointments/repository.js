import { randomUUID } from 'node:crypto';
import { getMysqlPool } from '../../config/mysql.js';
import { httpError } from '../../utils/httpError.js';

export const TYPE_LABELS = {
  VIEW_CAR: 'นัดดูรถ',
  TEST_DRIVE: 'ทดลองขับ (Test Drive)',
};

// The schema has 4 appointment statuses; the pages show more states, so the
// extra ones are derived from `seller_id`:
//   request page: no seller -> PENDING, seller set (PENDING/CONFIRMED) -> ASSIGNED
//   seller task : PENDING -> PENDING, CONFIRMED -> IN_PROGRESS, COMPLETED
function requestStatus(row) {
  if (row.status === 'CANCELLED' || row.status === 'COMPLETED') return row.status;
  return row.seller_id ? 'ASSIGNED' : 'PENDING';
}
const TASK_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export function toAppointment(row) {
  const time = String(row.appointment_time).slice(0, 5);
  const configuration = typeof row.vehicle_configuration === 'string' ? JSON.parse(row.vehicle_configuration) : row.vehicle_configuration || null;
  return {
    id: row.id,
    code: 'APT-' + row.id.slice(0, 8).toUpperCase(),
    customerId: row.customer_id,
    customerName: (row.c_first + ' ' + row.c_last).trim(),
    phone: row.phone_number || '',
    appointmentType: row.appointment_type,
    type: TYPE_LABELS[row.appointment_type],
    carId: row.car_id,
    carModel: configuration ? `${configuration.modelName} ${configuration.trimName} · ${configuration.colorName} · ${configuration.wheelName}` : `${row.brand} ${row.model_name} (${row.color})`,
    vehicleConfiguration: configuration,
    preferredDate: row.appointment_date,
    preferredTime: time,
    dueDate: row.appointment_date + ' ' + time,
    status: requestStatus(row),
    taskStatus: TASK_STATUS[row.status],
    dbStatus: row.status,
    sellerId: row.seller_id,
    assignedSeller: row.e_first ? (row.e_first + ' ' + row.e_last).trim() : null,
    note: row.note || '',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

const SELECT = `
  SELECT a.id, a.customer_id, a.car_id, a.seller_id, a.appointment_type,
         a.appointment_date, a.appointment_time, a.status, a.note, a.created_at, a.vehicle_configuration,
         c.first_name AS c_first, c.last_name AS c_last, c.phone_number,
         m.brand, m.model_name, car.color,
         e.first_name AS e_first, e.last_name AS e_last
    FROM appointments a
    JOIN customers c ON c.id = a.customer_id
    JOIN cars car ON car.id = a.car_id
    JOIN car_models m ON m.id = car.car_model_id
    LEFT JOIN employees e ON e.id = a.seller_id`;

export async function listAppointments({ customerId, sellerId, status }) {
  const where = [];
  const params = [];
  if (customerId) { where.push('a.customer_id = ?'); params.push(customerId); }
  if (sellerId) { where.push('a.seller_id = ?'); params.push(sellerId); }
  if (status) { where.push('a.status = ?'); params.push(status); }
  const [rows] = await getMysqlPool().query(
    SELECT + (where.length ? ' WHERE ' + where.join(' AND ') : '') +
      ' ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.created_at DESC LIMIT 500',
    params,
  );
  return rows.map(toAppointment);
}

export async function listBookedTimes(appointmentDate) {
  const [rows] = await getMysqlPool().query(
    `SELECT DISTINCT TIME_FORMAT(appointment_time, '%H:%i') AS appointment_time
       FROM appointments
      WHERE appointment_date = ? AND status <> 'CANCELLED'`,
    [appointmentDate],
  );
  return rows.map((row) => row.appointment_time);
}

async function getAppointment(db, id) {
  const [rows] = await db.query(SELECT + ' WHERE a.id = ?', [id]);
  if (!rows[0]) throw httpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
  return toAppointment(rows[0]);
}

export async function createAppointment(input) {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  // Serialize slot checks for the date so simultaneous requests cannot claim overlapping hours.
  const slotLock = `appointment-day:${input.appointmentDate}`;
  let lockAcquired = false;
  try {
    const [customers] = await conn.query('SELECT id FROM customers WHERE id = ?', [input.customerId]);
    if (!customers[0]) throw httpError(400, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    const [cars] = await conn.query('SELECT car_model_id, status FROM cars WHERE id = ?', [input.carId]);
    if (!cars[0]) throw httpError(400, 'CAR_NOT_FOUND', 'Car not found');
    if (cars[0].car_model_id !== input.vehicleConfiguration.modelId)
      throw httpError(400, 'CONFIGURATION_MISMATCH', 'รุ่นรถที่เลือกไม่ตรงกับรถสำหรับนัดหมาย');
    if (['SOLD', 'INACTIVE'].includes(cars[0].status))
      throw httpError(409, 'CAR_NOT_BOOKABLE', 'This car is no longer available for appointments');

    const [locks] = await conn.query('SELECT GET_LOCK(?, 10) AS acquired', [slotLock]);
    if (Number(locks[0]?.acquired) !== 1)
      throw httpError(409, 'APPOINTMENT_SLOT_UNAVAILABLE', 'ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาอื่น');
    lockAcquired = true;
    const [existing] = await conn.query(
      `SELECT id FROM appointments
        WHERE appointment_date = ? AND ABS(TIME_TO_SEC(appointment_time) - TIME_TO_SEC(?)) < 3600
          AND status <> 'CANCELLED'
        LIMIT 1`,
      [input.appointmentDate, input.appointmentTime],
    );
    if (existing[0])
      throw httpError(409, 'APPOINTMENT_SLOT_UNAVAILABLE', 'ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาอื่น');

    const id = randomUUID();
    await conn.query(
      `INSERT INTO appointments (id, customer_id, car_id, appointment_type, appointment_date, appointment_time, note, vehicle_configuration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.customerId, input.carId, input.appointmentType, input.appointmentDate, input.appointmentTime, input.note, JSON.stringify(input.vehicleConfiguration)],
    );
    return await getAppointment(conn, id);
  } finally {
    if (lockAcquired) await conn.query('SELECT RELEASE_LOCK(?)', [slotLock]);
    conn.release();
  }
}

export async function changeStatus(id, next, actor = {}) {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT id, customer_id, seller_id, status, appointment_date, appointment_time FROM appointments WHERE id = ?', [id]);
  const current = rows[0];
  if (!current) throw httpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
  const allowedNext = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };
  if (current.status === next) return getAppointment(pool, id);
  if (!allowedNext[current.status]?.includes(next))
    throw httpError(409, 'INVALID_TRANSITION', 'ไม่สามารถเปลี่ยนสถานะจากสถานะปัจจุบันได้');
  if (actor.role === 'customer' && current.customer_id !== actor.customerId)
    throw httpError(403, 'FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์แก้ไขคำขอนี้');
  if (actor.role === 'seller' && current.seller_id !== actor.employeeId)
    throw httpError(403, 'FORBIDDEN', 'งานนี้ไม่ได้มอบหมายให้บัญชีนี้');
  if (actor.role === 'customer' && (next !== 'CANCELLED' || current.status !== 'PENDING'))
    throw httpError(409, 'INVALID_TRANSITION', 'ลูกค้ายกเลิกได้เฉพาะคำขอที่ยังรอดำเนินการ');
  if (actor.role === 'seller' && !(
    (next === 'CONFIRMED' && current.status === 'PENDING') ||
    (next === 'COMPLETED' && current.status === 'CONFIRMED') ||
    (next === 'CANCELLED' && ['PENDING', 'CONFIRMED'].includes(current.status))
  )) throw httpError(409, 'INVALID_TRANSITION', 'ไม่สามารถเปลี่ยนสถานะจากสถานะปัจจุบันได้');
  if (next === 'CONFIRMED' && !current.seller_id)
    throw httpError(409, 'NO_SELLER', 'Assign a seller before accepting the job');
  const conn = await pool.getConnection();
  const slotLock = `appointment-day:${current.appointment_date}`;
  let lockAcquired = false;
  try {
    if (next !== 'CANCELLED') {
      const [locks] = await conn.query('SELECT GET_LOCK(?, 10) AS acquired', [slotLock]);
      if (Number(locks[0]?.acquired) !== 1)
        throw httpError(409, 'APPOINTMENT_SLOT_UNAVAILABLE', 'ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาอื่น');
      lockAcquired = true;
      const [conflicts] = await conn.query(
        `SELECT id FROM appointments
          WHERE appointment_date = ? AND ABS(TIME_TO_SEC(appointment_time) - TIME_TO_SEC(?)) < 3600
            AND status <> 'CANCELLED' AND id <> ?
          LIMIT 1`,
        [current.appointment_date, current.appointment_time, id],
      );
      if (conflicts[0])
        throw httpError(409, 'APPOINTMENT_SLOT_UNAVAILABLE', 'ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาอื่น');
    }
    await conn.query(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [next, id],
    );
  } finally {
    if (lockAcquired) await conn.query('SELECT RELEASE_LOCK(?)', [slotLock]);
    conn.release();
  }
  return getAppointment(pool, id);
}

export async function assignSeller(id, { sellerId, assignedBy, note }) {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT customer_id, seller_id, status, appointment_date, appointment_time FROM appointments WHERE id = ? FOR UPDATE',
      [id],
    );
    const appt = rows[0];
    if (!appt) throw httpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
    if (appt.status !== 'PENDING')
      throw httpError(409, 'INVALID_TRANSITION', 'Only a PENDING appointment can be (re)assigned');

    const [sellers] = await conn.query(
      `SELECT e.id FROM employees e JOIN users u ON u.id = e.user_id
        WHERE e.id = ? AND u.role = 'SELLER' AND u.status = 'ACTIVE'`,
      [sellerId],
    );
    if (!sellers[0]) throw httpError(400, 'SELLER_NOT_FOUND', 'Seller not found or inactive');
    const [managers] = await conn.query(
      `SELECT e.id FROM employees e JOIN users u ON u.id = e.user_id
        WHERE e.id = ? AND u.role IN ('MANAGER','ADMIN') AND u.status = 'ACTIVE'`,
      [assignedBy],
    );
    if (!managers[0]) throw httpError(400, 'MANAGER_NOT_FOUND', 'assignedBy must be an active manager');

    const [busy] = await conn.query(
      `SELECT id FROM appointments
        WHERE seller_id = ? AND appointment_date = ? AND appointment_time = ?
          AND status IN ('PENDING','CONFIRMED') AND id <> ? LIMIT 1`,
      [sellerId, appt.appointment_date, appt.appointment_time, id],
    );
    if (busy[0]) throw httpError(409, 'SELLER_BUSY', 'This seller already has an appointment at that time');

    if (appt.seller_id) {
      await conn.query(
        `UPDATE assignments SET status = 'CANCELLED'
          WHERE customer_id = ? AND seller_id = ? AND status = 'ACTIVE'`,
        [appt.customer_id, appt.seller_id],
      );
    }
    await conn.query(
      `INSERT INTO assignments (id, customer_id, seller_id, assigned_by, note) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), appt.customer_id, sellerId, assignedBy, note],
    );
    await conn.query('UPDATE appointments SET seller_id = ? WHERE id = ?', [sellerId, id]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
  return getAppointment(pool, id);
}

export async function deleteAppointment(id) {
  const [result] = await getMysqlPool().query('DELETE FROM appointments WHERE id = ?', [id]);
  if (result.affectedRows === 0)
    throw httpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
}
