import { Router } from 'express';
import {
  httpError, readOptionalText, requireBody, requireEnum, requireUuid,
} from '../../utils/httpError.js';
import {
  assignSeller, changeStatus, createAppointment, deleteAppointment, listAppointments,
} from './repository.js';

const router = Router();
const TYPES = ['VIEW_CAR', 'TEST_DRIVE'];
const DB_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

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

router.get('/', async (req, res) => {
  const filters = {};
  if (req.query.customerId) filters.customerId = requireUuid(req.query.customerId, 'customerId');
  if (req.query.sellerId) filters.sellerId = requireUuid(req.query.sellerId, 'sellerId');
  if (req.query.status) filters.status = requireEnum(String(req.query.status), DB_STATUSES, 'status');
  res.json({ data: await listAppointments(filters) });
});

router.post('/', async (req, res) => {
  const body = requireBody(req.body);
  const appointment = await createAppointment({
    customerId: requireUuid(body.customerId, 'customerId'),
    carId: requireUuid(body.carId, 'carId'),
    appointmentType: requireEnum(body.appointmentType, TYPES, 'appointmentType'),
    appointmentDate: readDate(body.appointmentDate),
    appointmentTime: readTime(body.appointmentTime),
    note: readOptionalText(body.note, 'note', 2000),
  });
  res.status(201).json({ data: appointment });
});

// Seller accepts (CONFIRMED), finishes (COMPLETED) or anyone cancels (CANCELLED).
router.patch('/:id/status', async (req, res) => {
  const id = requireUuid(req.params.id);
  const { status } = requireBody(req.body);
  requireEnum(status, ['CONFIRMED', 'COMPLETED', 'CANCELLED'], 'status');
  res.json({ data: await changeStatus(id, status) });
});

// Manager hands the appointment to a seller (creates an `assignments` row).
router.patch('/:id/assign', async (req, res) => {
  const id = requireUuid(req.params.id);
  const body = requireBody(req.body);
  res.json({
    data: await assignSeller(id, {
      sellerId: requireUuid(body.sellerId, 'sellerId'),
      assignedBy: requireUuid(body.assignedBy, 'assignedBy'),
      note: readOptionalText(body.note, 'note', 2000),
    }),
  });
});

router.delete('/:id', async (req, res) => {
  await deleteAppointment(requireUuid(req.params.id));
  res.status(204).end();
});

export default router;
