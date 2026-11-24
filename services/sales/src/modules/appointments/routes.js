import { Router } from 'express';
import {
  httpError, readOptionalText, requireBody, requireEnum, requireUuid,
} from '../../utils/httpError.js';
import {
  assignSeller, changeStatus, createAppointment, deleteAppointment, listAppointments, listBookedTimes,
} from './repository.js';
import { requireRoles } from '../../../../../packages/auth/index.js';
import { requireCustomer, requireEmployee } from '../../middleware/actor.js';
import { getMysqlPool } from '../../config/mysql.js';

const router = Router();
const TYPES = ['VIEW_CAR', 'TEST_DRIVE'];
const DB_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const customerOnly = requireRoles('customer');
const managementOnly = requireRoles('manager', 'admin');
const signedIn = requireRoles('customer', 'seller', 'manager', 'admin');

const bangkokToday = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

function readDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw httpError(400, 'INVALID_DATE', 'appointmentDate must be YYYY-MM-DD');
  const parsed = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw httpError(400, 'INVALID_DATE', 'appointmentDate is not a real date');
  if (value < bangkokToday())
    throw httpError(400, 'DATE_IN_PAST', 'appointmentDate must be today or later');
  return value;
}

function readTime(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw httpError(400, 'INVALID_TIME', 'appointmentTime must be HH:MM');
  return value + ':00';
}

router.get('/', signedIn, async (req, res) => {
  const filters = {};
  if (req.user.role === 'customer') filters.customerId = await actorId(req, 'customer');
  else if (req.user.role === 'seller') filters.sellerId = await actorId(req, 'employee');
  else {
    if (req.query.customerId) filters.customerId = requireUuid(req.query.customerId, 'customerId');
    if (req.query.sellerId) filters.sellerId = requireUuid(req.query.sellerId, 'sellerId');
  }
  if (req.query.status) filters.status = requireEnum(String(req.query.status), DB_STATUSES, 'status');
  res.json({ data: await listAppointments(filters) });
});

router.get('/availability', customerOnly, async (req, res) => {
  const date = readDate(String(req.query.date || ''));
  res.json({ data: { bookedTimes: await listBookedTimes(date) } });
});

router.post('/', customerOnly, requireCustomer, async (req, res) => {
  const body = requireBody(req.body);
  const config = body.vehicleConfiguration;
  if (!config || typeof config !== 'object' || Array.isArray(config))
    throw httpError(400, 'INVALID_CONFIGURATION', 'เลือกสเปกรถให้ครบก่อนส่งคำขอนัด');
  for (const field of ['modelSlug', 'modelName', 'trim', 'trimName', 'colorId', 'colorName', 'wheelId', 'wheelName']) {
    if (typeof config[field] !== 'string' || !config[field].trim() || config[field].length > 150)
      throw httpError(400, 'INVALID_CONFIGURATION', 'ข้อมูลรุ่นรถไม่ครบ (' + field + ')');
  }
  config.modelId = requireUuid(config.modelId, 'vehicleConfiguration.modelId');
  const appointment = await createAppointment({
    customerId: req.salesActor.customerId,
    carId: requireUuid(body.carId, 'carId'),
    appointmentType: requireEnum(body.appointmentType, TYPES, 'appointmentType'),
    appointmentDate: readDate(body.appointmentDate),
    appointmentTime: readTime(body.appointmentTime),
    note: readOptionalText(body.note, 'note', 2000),
    vehicleConfiguration: config,
  });
  res.status(201).json({ data: appointment });
});

// Sellers update their assigned work; customers can cancel their own pending request.
router.patch('/:id/status', signedIn, async (req, res) => {
  const id = requireUuid(req.params.id);
  const { status } = requireBody(req.body);
  requireEnum(status, DB_STATUSES, 'status');
  let actor = {};
  if (req.user.role === 'customer') {
    if (status !== 'CANCELLED') throw httpError(403, 'FORBIDDEN', 'Customers may only cancel their own requests');
    actor = { role: 'customer', customerId: await actorId(req, 'customer') };
  } else if (req.user.role === 'seller') {
    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) throw httpError(403, 'FORBIDDEN', 'Invalid seller status transition');
    actor = { role: 'seller', employeeId: await actorId(req, 'employee') };
  } else if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    throw httpError(403, 'FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์ดำเนินการ');
  }
  res.json({ data: await changeStatus(id, status, actor) });
});

// Manager hands the appointment to a seller (creates an `assignments` row).
router.patch('/:id/assign', managementOnly, requireEmployee, async (req, res) => {
  const id = requireUuid(req.params.id);
  const body = requireBody(req.body);
  res.json({
    data: await assignSeller(id, {
      sellerId: requireUuid(body.sellerId, 'sellerId'),
      assignedBy: req.salesActor.employeeId,
      note: readOptionalText(body.note, 'note', 2000),
    }),
  });
});

router.delete('/:id', requireRoles('admin'), async (req, res) => {
  await deleteAppointment(requireUuid(req.params.id));
  res.status(204).end();
});

async function actorId(req, kind) {
  const [rows] = await getMysqlPool().query(
    `SELECT id FROM ${kind === 'customer' ? 'customers' : 'employees'} WHERE user_id = ? LIMIT 1`,
    [req.user.id],
  );
  if (!rows[0]) throw httpError(403, 'SALES_PROFILE_NOT_LINKED', 'บัญชีนี้ยังไม่มีข้อมูลในระบบขาย');
  return rows[0].id;
}

export default router;
