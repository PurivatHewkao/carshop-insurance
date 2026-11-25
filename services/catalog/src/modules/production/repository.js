// Production queue for made-to-order cars (owner: ดิว). Tables: production_capacity +
// production columns on cars (database/09_production_queue.sql).
// A car is made-to-order when cars.production_status IS NOT NULL.
import { getMysqlPool } from '../../config/mysql.js';
import { httpError } from '../../utils/httpError.js';
import { completeDelivery } from './delivery.js';

export const TRIMS = ['ECO', 'BALANCED', 'HIGH_PERFORMANCE'];
// Days to collect the parts of a trim before the car can enter a build week.
export const PARTS_DAYS = { ECO: 14, BALANCED: 21, HIGH_PERFORMANCE: 35 };
export const DEFAULT_TRIM = 'BALANCED';
export const DEFAULT_CAPACITY = 5;
export const MAX_CAPACITY = 100;
// Window shown to the customer: build week Monday + 7 .. + 14 days (build, QC, transport).
const ETA_FROM_DAYS = 7;
const ETA_TO_DAYS = 14;
const MAX_WEEKS_AHEAD = 104;
// A delay longer than this lets the customer cancel with a full refund (Payment checks it).
export const FREE_CANCEL_DELAY_DAYS = 30;

export const STATUSES = [
  'WAITING',
  'SCHEDULED',
  'IN_PRODUCTION',
  'IN_TRANSIT',
  'READY',
  'DELIVERED',
  'CANCELLED',
];
// Statuses that hold a build-week slot.
const SLOT_STATUSES = [
  'SCHEDULED',
  'IN_PRODUCTION',
  'IN_TRANSIT',
  'READY',
  'DELIVERED',
];
const SLOT_SQL = SLOT_STATUSES.map((s) => `'${s}'`).join(',');

// ---------- dates (all UTC, 'YYYY-MM-DD') ----------
const DAY_MS = 86_400_000;
export const todayUtc = () => new Date().toISOString().slice(0, 10);
export const addDays = (date, days) =>
  new Date(Date.parse(date + 'T00:00:00Z') + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
const daysBetween = (from, to) =>
  Math.round(
    (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY_MS,
  );
/** Monday on or after `date`. */
export function mondayOnOrAfter(date) {
  const day = new Date(date + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
  return addDays(date, (8 - day) % 7);
}
/** Monday of the week that contains `date`. */
export const mondayOf = (date) =>
  addDays(date, -((new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7));
const isMonday = (date) => new Date(date + 'T00:00:00Z').getUTCDay() === 1;
// DATE columns come back as Date at UTC midnight (pool timezone 'Z').
const dateOnly = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : (value ?? null);

export const etaOfWeek = (week) => ({
  etaFrom: addDays(week, ETA_FROM_DAYS),
  etaTo: addDays(week, ETA_TO_DAYS),
});

// ---------- db helpers ----------
async function withTransaction(work) {
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

const MISSING_SCHEMA = new Set(['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR']);

/** Model by UUID or slug (slug exists after 03_catalog_columns.sql). */
async function findModel(db, ref) {
  const [byId] = await db.query(
    'SELECT id, brand, model_name FROM car_models WHERE id = ?',
    [ref],
  );
  if (byId.length) return byId[0];
  try {
    const [bySlug] = await db.query(
      'SELECT id, brand, model_name FROM car_models WHERE slug = ?',
      [ref],
    );
    return bySlug[0] || null;
  } catch (error) {
    if (MISSING_SCHEMA.has(error.code)) return null;
    throw error;
  }
}

async function capacityOf(db, modelId, { lock = false } = {}) {
  if (lock) {
    // Make sure the row exists so FOR UPDATE serialises scheduling per model.
    await db.query(
      'INSERT IGNORE INTO production_capacity (car_model_id, weekly_capacity) VALUES (?, ?)',
      [modelId, DEFAULT_CAPACITY],
    );
  }
  const [rows] = await db.query(
    'SELECT weekly_capacity FROM production_capacity WHERE car_model_id = ?' +
      (lock ? ' FOR UPDATE' : ''),
    [modelId],
  );
  return rows.length ? Number(rows[0].weekly_capacity) : DEFAULT_CAPACITY;
}

/** Map 'YYYY-MM-DD' (Monday) -> cars holding a slot that week. */
async function bookedWeeks(db, modelId, fromWeek, toWeek, exceptCarId = null) {
  const [rows] = await db.query(
    `SELECT build_week, COUNT(*) AS booked FROM cars
     WHERE car_model_id = ? AND build_week BETWEEN ? AND ?
       AND production_status IN (${SLOT_SQL})` +
      (exceptCarId ? ' AND id <> ?' : '') +
      ' GROUP BY build_week',
    exceptCarId
      ? [modelId, fromWeek, toWeek, exceptCarId]
      : [modelId, fromWeek, toWeek],
  );
  return new Map(rows.map((r) => [dateOnly(r.build_week), Number(r.booked)]));
}

/** First Monday >= today + parts days that still has a free slot. */
async function earliestWeek(db, modelId, trim, capacity) {
  const first = mondayOnOrAfter(addDays(todayUtc(), PARTS_DAYS[trim]));
  const last = addDays(first, 7 * MAX_WEEKS_AHEAD);
  if (capacity <= 0) return null;
  const booked = await bookedWeeks(db, modelId, first, last);
  for (let week = first; week <= last; week = addDays(week, 7)) {
    if ((booked.get(week) || 0) < capacity) return week;
  }
  return null;
}

function noSlot() {
  return httpError(
    409,
    'NO_PRODUCTION_SLOT',
    'No free production week in the next ' + MAX_WEEKS_AHEAD + ' weeks',
  );
}

/** Trim of a car from the configurator tables (07_toyoty_configurator.sql), if present. */
async function trimOfCar(db, carId) {
  try {
    const [rows] = await db.query(
      'SELECT t.code FROM cars c JOIN car_trims t ON t.id = c.trim_id WHERE c.id = ?',
      [carId],
    );
    return TRIMS.includes(rows[0]?.code) ? rows[0].code : null;
  } catch (error) {
    if (MISSING_SCHEMA.has(error.code)) return null;
    throw error;
  }
}

// ---------- API shapes ----------
const CAR_COLUMNS = `c.id, c.car_model_id, c.vin, c.color, c.status, c.production_status,
  c.build_week, c.eta_from, c.eta_to, c.first_eta_to, c.ready_date, c.production_note`;

export function productionToApi(row) {
  const etaTo = dateOnly(row.eta_to);
  const firstEtaTo = dateOnly(row.first_eta_to);
  return {
    carId: row.id,
    status: row.production_status,
    buildWeek: dateOnly(row.build_week),
    etaFrom: dateOnly(row.eta_from),
    etaTo,
    firstEtaTo,
    readyDate: dateOnly(row.ready_date),
    delayDays:
      etaTo && firstEtaTo ? Math.max(0, daysBetween(firstEtaTo, etaTo)) : 0,
    note: row.production_note ?? null,
  };
}

async function lockCar(db, carId) {
  const [rows] = await db.query(
    'SELECT ' + CAR_COLUMNS + ' FROM cars c WHERE c.id = ? FOR UPDATE',
    [carId],
  );
  if (!rows.length) throw httpError(404, 'CAR_NOT_FOUND', 'Car not found');
  return rows[0];
}

async function readCar(db, carId) {
  const [rows] = await db.query(
    'SELECT ' + CAR_COLUMNS + ' FROM cars c WHERE c.id = ?',
    [carId],
  );
  return rows[0] || null;
}

// ---------- public ----------

/** GET /production/eta?model=&trim= — estimate only, nothing is reserved. */
export async function getEta(modelRef, trim) {
  const db = getMysqlPool();
  const model = await findModel(db, modelRef);
  if (!model) throw httpError(404, 'CAR_NOT_FOUND', 'Car model not found');
  const capacity = await capacityOf(db, model.id);
  const week = await earliestWeek(db, model.id, trim, capacity);
  if (!week) throw noSlot();
  return {
    modelId: model.id,
    modelName: (model.brand + ' ' + model.model_name).trim(),
    trim,
    partsDays: PARTS_DAYS[trim],
    weeklyCapacity: capacity,
    buildWeek: week,
    ...etaOfWeek(week),
  };
}

/** GET /production/cars/:carId — production state of one car (null status = stock car). */
export async function getCarProduction(carId) {
  const row = await readCar(getMysqlPool(), carId);
  if (!row) throw httpError(404, 'CAR_NOT_FOUND', 'Car not found');
  return productionToApi(row);
}

/**
 * For Catalog `POST /cars/units` (กร): mark a freshly created made-to-order car as WAITING.
 * Call it inside the same transaction that inserts the car.
 */
export async function markMadeToOrder(connection, carId) {
  await connection.query(
    "UPDATE cars SET production_status = 'WAITING' WHERE id = ? AND production_status IS NULL",
    [carId],
  );
}

// ---------- staff ----------

/**
 * POST /production/cars/:carId/schedule — WAITING -> SCHEDULED in the earliest free week.
 * Needs an active order that is CONFIRMED/PAID and has at least one SUCCESS payment (the deposit).
 */
export async function scheduleCar(carId, requestedTrim) {
  return withTransaction(async (db) => {
    const car = await lockCar(db, carId);
    // QUOTED = a car the configurator (07, กร) created for an order: also waiting for a week.
    if (!['WAITING', 'QUOTED'].includes(car.production_status)) {
      throw httpError(
        409,
        'NOT_WAITING',
        'Only WAITING cars can be scheduled (current: ' +
          (car.production_status ?? 'stock car') +
          ')',
      );
    }
    const [orders] = await db.query(
      `SELECT o.id, o.status,
         (SELECT COUNT(*) FROM payments p WHERE p.order_id = o.id AND p.status = 'SUCCESS') AS paid_count
       FROM orders o WHERE o.car_id = ? AND o.status <> 'CANCELLED'
       ORDER BY o.created_at DESC LIMIT 1`,
      [carId],
    );
    const order = orders[0];
    if (!order || !['CONFIRMED', 'PAID'].includes(order.status)) {
      throw httpError(
        409,
        'ORDER_NOT_CONFIRMED',
        'The order of this car must be approved (CONFIRMED) first',
      );
    }
    if (Number(order.paid_count) === 0) {
      throw httpError(
        409,
        'DEPOSIT_NOT_PAID',
        'The booking deposit of this order has not been paid yet',
      );
    }
    const trim = (await trimOfCar(db, carId)) || requestedTrim || DEFAULT_TRIM;
    const capacity = await capacityOf(db, car.car_model_id, { lock: true });
    const week = await earliestWeek(db, car.car_model_id, trim, capacity);
    if (!week) throw noSlot();
    const eta = etaOfWeek(week);
    await db.query(
      `UPDATE cars SET production_status = 'SCHEDULED', build_week = ?, eta_from = ?, eta_to = ?,
         first_eta_to = COALESCE(first_eta_to, ?) WHERE id = ?`,
      [week, eta.etaFrom, eta.etaTo, eta.etaTo, carId],
    );
    return productionToApi(await readCar(db, carId));
  });
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

function readNote(note) {
  if (note === undefined || note === null || note === '') return undefined;
  if (typeof note !== 'string' || note.trim().length > 255) {
    throw httpError(
      400,
      'INVALID_PRODUCTION',
      'note must be text of at most 255 characters',
    );
  }
  return note.trim();
}

function readDate(value, field) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value + 'T00:00:00Z')) ||
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value
  ) {
    throw httpError(
      400,
      'INVALID_PRODUCTION',
      field + ' must be a date YYYY-MM-DD',
    );
  }
  return value;
}

function requireStatus(car, allowed, action) {
  if (!allowed.includes(car.production_status)) {
    throw httpError(
      409,
      'INVALID_PRODUCTION_STEP',
      action +
        ' is allowed only from ' +
        allowed.join('/') +
        ' (current: ' +
        (car.production_status ?? 'stock car') +
        ')',
    );
  }
}

export const ACTIONS = [
  'QUEUE',
  'RESCHEDULE',
  'START',
  'SHIP',
  'ARRIVE',
  'DELIVER',
];

/**
 * PATCH /production/cars/:carId  { action, ... }
 *   QUEUE                  stock car -> WAITING (turn an existing reserved car into made-to-order)
 *   RESCHEDULE {buildWeek} SCHEDULED/IN_PRODUCTION: move to another Monday (delay or earlier)
 *   START {vin}            SCHEDULED -> IN_PRODUCTION, the real VIN replaces the placeholder
 *   SHIP {arrivalDate}     IN_PRODUCTION -> IN_TRANSIT, the window becomes one day
 *   ARRIVE                 IN_TRANSIT -> READY (ready_date = today)
 *   DELIVER                paid order -> COMPLETED, car -> SOLD (READY -> DELIVERED)
 */
export async function changeProduction(carId, body) {
  const action = body.action;
  if (!ACTIONS.includes(action)) {
    throw httpError(
      400,
      'INVALID_PRODUCTION',
      'action must be one of ' + ACTIONS.join(', '),
    );
  }
  const note = readNote(body.note);
  return withTransaction(async (db) => {
    if (action === 'DELIVER') {
      await completeDelivery(db, carId, body.orderId);
      if (note !== undefined) {
        await db.query('UPDATE cars SET production_note = ? WHERE id = ?', [
          note,
          carId,
        ]);
      }
      return productionToApi(await readCar(db, carId));
    }
    const car = await lockCar(db, carId);
    const set = {};
    if (action === 'QUEUE') {
      if (car.production_status !== null) {
        throw httpError(
          409,
          'INVALID_PRODUCTION_STEP',
          'QUEUE is only for stock cars (current: ' +
            car.production_status +
            ')',
        );
      }
      if (car.status === 'SOLD') {
        throw httpError(
          409,
          'INVALID_PRODUCTION_STEP',
          'A sold car cannot be queued',
        );
      }
      set.production_status = 'WAITING';
    } else if (action === 'RESCHEDULE') {
      requireStatus(car, ['SCHEDULED', 'IN_PRODUCTION'], action);
      const week = readDate(body.buildWeek, 'buildWeek');
      if (!isMonday(week)) {
        throw httpError(
          400,
          'INVALID_PRODUCTION',
          'buildWeek must be a Monday',
        );
      }
      if (week < mondayOf(todayUtc())) {
        throw httpError(
          400,
          'INVALID_PRODUCTION',
          'buildWeek cannot be in the past',
        );
      }
      const capacity = await capacityOf(db, car.car_model_id, { lock: true });
      const booked = await bookedWeeks(db, car.car_model_id, week, week, carId);
      if ((booked.get(week) || 0) >= capacity) {
        throw httpError(409, 'WEEK_FULL', 'Week ' + week + ' is already full');
      }
      const eta = etaOfWeek(week);
      Object.assign(set, {
        build_week: week,
        eta_from: eta.etaFrom,
        eta_to: eta.etaTo,
      });
    } else if (action === 'START') {
      requireStatus(car, ['SCHEDULED'], action);
      const vin = String(body.vin ?? '')
        .trim()
        .toUpperCase();
      if (!VIN_PATTERN.test(vin)) {
        throw httpError(
          400,
          'INVALID_PRODUCTION',
          'vin must be 17 characters (A-Z without I, O, Q, and 0-9)',
        );
      }
      Object.assign(set, { production_status: 'IN_PRODUCTION', vin });
    } else if (action === 'SHIP') {
      requireStatus(car, ['IN_PRODUCTION'], action);
      const arrival = readDate(body.arrivalDate, 'arrivalDate');
      if (arrival < todayUtc()) {
        throw httpError(
          400,
          'INVALID_PRODUCTION',
          'arrivalDate cannot be in the past',
        );
      }
      Object.assign(set, {
        production_status: 'IN_TRANSIT',
        eta_from: arrival,
        eta_to: arrival,
      });
    } else if (action === 'ARRIVE') {
      requireStatus(car, ['IN_TRANSIT'], action);
      Object.assign(set, {
        production_status: 'READY',
        ready_date: todayUtc(),
      });
    }
    if (note !== undefined) set.production_note = note;
    const columns = Object.keys(set);
    try {
      await db.query(
        'UPDATE cars SET ' +
          columns.map((c) => c + ' = ?').join(', ') +
          ' WHERE id = ?',
        [...columns.map((c) => set[c]), carId],
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw httpError(
          409,
          'DUPLICATE_VIN',
          'This VIN is already used by another car',
        );
      }
      throw error;
    }
    return productionToApi(await readCar(db, carId));
  });
}

/** GET /production/queue?status= — made-to-order cars with their order and customer. */
export async function listQueue(status) {
  const params = [];
  let where = 'c.production_status IS NOT NULL';
  if (status) {
    where += ' AND c.production_status = ?';
    params.push(status);
  }
  const [rows] = await getMysqlPool().query(
    `SELECT ${CAR_COLUMNS}, m.brand, m.model_name,
       o.id AS order_id, o.status AS order_status,
       TRIM(CONCAT(cu.first_name, ' ', cu.last_name)) AS customer_name
     FROM cars c
     JOIN car_models m ON m.id = c.car_model_id
     LEFT JOIN orders o ON o.car_id = c.id AND o.status <> 'CANCELLED'
     LEFT JOIN customers cu ON cu.id = o.customer_id
     WHERE ${where}
     ORDER BY FIELD(c.production_status, ${STATUSES.map(() => '?').join(',')}),
       c.build_week IS NULL, c.build_week, c.created_at
     LIMIT 300`,
    [...params, ...STATUSES],
  );
  return rows.map((row) => ({
    ...productionToApi(row),
    vin: row.vin,
    color: row.color,
    carStatus: row.status,
    model: {
      id: row.car_model_id,
      name: (row.brand + ' ' + row.model_name).trim(),
    },
    order: row.order_id
      ? {
          id: row.order_id,
          status: row.order_status,
          customerName: row.customer_name,
        }
      : null,
  }));
}

/** GET /production/load?weeks=8 — booked/capacity per model for the coming weeks. */
export async function getLoad(weeks) {
  const db = getMysqlPool();
  const first = mondayOf(todayUtc());
  const last = addDays(first, 7 * (weeks - 1));
  const [models] = await db.query(
    `SELECT m.id, m.brand, m.model_name, COALESCE(pc.weekly_capacity, ?) AS capacity
     FROM car_models m LEFT JOIN production_capacity pc ON pc.car_model_id = m.id
     WHERE EXISTS (SELECT 1 FROM cars c WHERE c.car_model_id = m.id AND c.production_status IS NOT NULL)
        OR pc.car_model_id IS NOT NULL
     ORDER BY m.brand, m.model_name`,
    [DEFAULT_CAPACITY],
  );
  const result = [];
  for (const model of models) {
    const booked = await bookedWeeks(db, model.id, first, last);
    const weekRows = [];
    for (let week = first; week <= last; week = addDays(week, 7)) {
      weekRows.push({ week, booked: booked.get(week) || 0 });
    }
    result.push({
      modelId: model.id,
      modelName: (model.brand + ' ' + model.model_name).trim(),
      weeklyCapacity: Number(model.capacity),
      weeks: weekRows,
    });
  }
  return { fromWeek: first, toWeek: last, models: result };
}

/** PUT /production/capacity/:modelRef { weeklyCapacity } */
export async function setCapacity(modelRef, weeklyCapacity) {
  const db = getMysqlPool();
  const model = await findModel(db, modelRef);
  if (!model) throw httpError(404, 'CAR_NOT_FOUND', 'Car model not found');
  await db.query(
    `INSERT INTO production_capacity (car_model_id, weekly_capacity) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE weekly_capacity = VALUES(weekly_capacity)`,
    [model.id, weeklyCapacity],
  );
  return {
    modelId: model.id,
    modelName: (model.brand + ' ' + model.model_name).trim(),
    weeklyCapacity,
  };
}
