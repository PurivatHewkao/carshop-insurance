// TOYOTY configurator: trims, colours, wheels, quotes, made-to-order cars and the
// weekly production queue. Prices are worked out here only; the web page and
// Sales always ask Catalog for a price and never compute it themselves.
import { randomBytes, randomUUID } from 'node:crypto';
import { getMysqlPool } from '../../config/mysql.js';
import { httpError } from '../../utils/httpError.js';
import { getModel } from '../cars/repository.js';
import {
  PRODUCTION_STEPS,
  addDays,
  daysBetween,
  etaForWeek,
  firstFreeWeek,
  fromSatang,
  mondayOnOrBefore,
  toSatang,
  today,
} from './schedule.js';

const MYSQL_DUPLICATE = 1062;
const ACTIVE_UNIT = "c.status IN ('RESERVED','SOLD')";
const DATE = (column) => `DATE_FORMAT(${column}, '%Y-%m-%d')`;

function readJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function withTransaction(work) {
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function duplicate(error, message) {
  if (error?.errno === MYSQL_DUPLICATE)
    throw httpError(409, 'DUPLICATE', message);
  throw error;
}

function notAllowed(message) {
  return httpError(422, 'OPTION_NOT_ALLOWED', message);
}

// ---- Lookups ---------------------------------------------------------------

async function findModel(db, ref, { lock = false, activeOnly = true } = {}) {
  const [rows] = await db.query(
    `SELECT id, slug, brand, model_name, body_type, weekly_capacity, is_active
     FROM car_models WHERE (slug = ? OR id = ?)${activeOnly ? ' AND is_active = 1' : ''}
     ORDER BY (slug = ?) DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [ref, ref, ref],
  );
  return rows[0] ?? null;
}

async function requireModel(db, ref, options) {
  const model = await findModel(db, ref, options);
  if (!model) throw httpError(404, 'CAR_NOT_FOUND', 'Car model not found');
  return model;
}

const TRIM_COLUMNS = `t.id, t.car_model_id, t.code, t.name, t.tagline, t.price, t.engine, t.horsepower,
  t.fuel_economy_kml, t.transmission, t.fuel, t.features, t.parts_lead_days, t.default_wheel_id,
  t.sort_order, t.is_active`;

async function loadTrims(db, modelId, { includeInactive = false } = {}) {
  const [rows] = await db.query(
    `SELECT ${TRIM_COLUMNS} FROM car_trims t WHERE t.car_model_id = ?
     ${includeInactive ? '' : 'AND t.is_active = 1'} ORDER BY t.sort_order, t.price, t.code`,
    [modelId],
  );
  return rows;
}

/** Colours and wheels a list of trims may use, keyed by trim id. */
async function loadTrimOptions(db, trimIds, { includeInactive = false } = {}) {
  const byTrim = new Map(trimIds.map((id) => [id, { colors: [], wheels: [] }]));
  if (!trimIds.length) return byTrim;
  const active = includeInactive ? '' : ' AND x.is_active = 1';
  const [colors] = await db.query(
    `SELECT tc.trim_id, tc.image_path, x.id, x.code, x.name, x.hex, x.finish, x.price_extra, x.is_active
     FROM trim_colors tc JOIN paint_colors x ON x.id = tc.color_id
     WHERE tc.trim_id IN (?)${active} ORDER BY x.sort_order, x.name`,
    [trimIds],
  );
  const [wheels] = await db.query(
    `SELECT tw.trim_id, tw.price_extra, x.id, x.code, x.name, x.size_inch, x.image_path, x.is_active
     FROM trim_wheels tw JOIN wheel_options x ON x.id = tw.wheel_id
     WHERE tw.trim_id IN (?)${active} ORDER BY x.size_inch, x.sort_order`,
    [trimIds],
  );
  for (const row of colors) {
    byTrim.get(row.trim_id).colors.push({
      id: row.id,
      code: row.code,
      name: row.name,
      hex: row.hex,
      finish: row.finish,
      priceExtra: row.price_extra,
      imageUrl: row.image_path || null,
      active: Boolean(row.is_active),
    });
  }
  for (const row of wheels) {
    byTrim.get(row.trim_id).wheels.push({
      id: row.id,
      code: row.code,
      name: row.name,
      sizeInch: Number(row.size_inch),
      imageUrl: row.image_path || null,
      priceExtra: row.price_extra,
      active: Boolean(row.is_active),
    });
  }
  return byTrim;
}

function toTrim(row, options) {
  const wheels = options?.wheels ?? [];
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    tagline: row.tagline,
    price: row.price,
    engine: row.engine,
    horsepower: row.horsepower === null ? null : Number(row.horsepower),
    fuelEconomyKml:
      row.fuel_economy_kml === null ? null : Number(row.fuel_economy_kml),
    transmission: row.transmission,
    fuel: row.fuel,
    features: readJson(row.features, []),
    partsLeadDays: Number(row.parts_lead_days),
    defaultWheelId: row.default_wheel_id,
    defaultWheelSize:
      wheels.find((wheel) => wheel.id === row.default_wheel_id)?.sizeInch ??
      null,
    active: Boolean(row.is_active),
    colors: options?.colors ?? [],
    wheels: wheels.map((wheel) => ({
      ...wheel,
      isDefault: wheel.id === row.default_wheel_id,
    })),
  };
}

// ---- Production queue -------------------------------------------------------

async function loadSlots(db, modelId, fromWeek) {
  const [rows] = await db.query(
    `SELECT ${DATE('week_start')} AS week, capacity, booked FROM production_slots
     WHERE car_model_id = ? AND week_start >= ? ORDER BY week_start`,
    [modelId, fromWeek],
  );
  return new Map(
    rows.map((row) => [
      row.week,
      { capacity: Number(row.capacity), booked: Number(row.booked) },
    ]),
  );
}

/** Estimated pick-up window if this trim were ordered today (nothing is booked). */
async function estimate(db, model, leadDays, orderDate = today()) {
  const slots = await loadSlots(db, model.id, orderDate);
  const result = firstFreeWeek({
    orderDate,
    leadDays,
    slots,
    defaultCapacity: Number(model.weekly_capacity),
  });
  if (!result) {
    throw httpError(
      409,
      'QUEUE_FULL',
      'The production queue of this model is full for the next two years',
    );
  }
  return result;
}

/** Takes one place in a week. Returns false when the week is already full. */
async function bookWeek(connection, model, week) {
  await connection.query(
    `INSERT INTO production_slots (car_model_id, week_start, capacity, booked)
     VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE car_model_id = car_model_id`,
    [model.id, week, model.weekly_capacity],
  );
  const [[slot]] = await connection.query(
    'SELECT capacity, booked FROM production_slots WHERE car_model_id = ? AND week_start = ? FOR UPDATE',
    [model.id, week],
  );
  if (Number(slot.booked) >= Number(slot.capacity)) return false;
  await connection.query(
    'UPDATE production_slots SET booked = booked + 1 WHERE car_model_id = ? AND week_start = ?',
    [model.id, week],
  );
  return true;
}

async function freeWeek(connection, modelId, week) {
  if (!week) return;
  await connection.query(
    'UPDATE production_slots SET booked = booked - 1 WHERE car_model_id = ? AND week_start = ? AND booked > 0',
    [modelId, week],
  );
}

// ---- Configurator + quote ---------------------------------------------------

/** Model + its trims with the colours / wheels each trim may have, for the configurator page. */
export async function getConfigurator(ref) {
  const pool = getMysqlPool();
  const model = await requireModel(pool, ref);
  const trims = await loadTrims(pool, model.id);
  if (!trims.length) {
    throw httpError(
      404,
      'MODEL_NOT_CONFIGURABLE',
      'This model has no trims to choose from',
    );
  }
  const [details, options] = await Promise.all([
    getModel(model.id),
    loadTrimOptions(
      pool,
      trims.map((trim) => trim.id),
    ),
  ]);
  const orderDate = today();
  const slots = await loadSlots(pool, model.id, orderDate);
  return {
    model: details,
    trims: trims.map((row) => {
      const eta = firstFreeWeek({
        orderDate,
        leadDays: Number(row.parts_lead_days),
        slots,
        defaultCapacity: Number(model.weekly_capacity),
      });
      return {
        ...toTrim(row, options.get(row.id)),
        estimatedReady: eta ? { from: eta.from, to: eta.to } : null,
      };
    }),
  };
}

/**
 * Checks that the chosen trim / colour / wheel go together and prices them.
 * selection: { model, trim, color, wheel? } — each by code (slug for the model) or UUID.
 * The wheel defaults to the trim's standard wheel.
 */
async function priceSelection(db, selection) {
  const model = await requireModel(db, selection.model);
  const [trims] = await db.query(
    `SELECT ${TRIM_COLUMNS} FROM car_trims t
     WHERE t.car_model_id = ? AND (t.code = ? OR t.id = ?) LIMIT 1`,
    [model.id, selection.trim, selection.trim],
  );
  const trim = trims[0];
  if (!trim)
    throw httpError(404, 'TRIM_NOT_FOUND', 'Trim not found for this model');
  if (!trim.is_active) throw notAllowed('This trim is not on sale');
  const options = (await loadTrimOptions(db, [trim.id])).get(trim.id);
  const color = options.colors.find(
    (item) => item.code === selection.color || item.id === selection.color,
  );
  if (!color) throw notAllowed('Color not available for this trim');
  const wheelRef = selection.wheel || trim.default_wheel_id;
  const wheel = options.wheels.find(
    (item) => item.code === wheelRef || item.id === wheelRef,
  );
  if (!wheel) throw notAllowed('Wheel not available for this trim');

  const modelName = `${model.brand} ${model.model_name}`;
  const lines = [
    {
      kind: 'TRIM',
      label: `${model.model_name} ${trim.name}`,
      amount: trim.price,
    },
    { kind: 'COLOR', label: `สี${color.name}`, amount: color.priceExtra },
    { kind: 'WHEEL', label: `ล้อ ${wheel.name}`, amount: wheel.priceExtra },
  ].map((line) => ({ ...line, amount: fromSatang(toSatang(line.amount)) }));
  const total = lines.reduce((sum, line) => sum + toSatang(line.amount), 0);
  return {
    model,
    trimRow: trim,
    quote: {
      model: modelName,
      modelId: model.id,
      modelSlug: model.slug,
      trim: trim.code,
      trimId: trim.id,
      trimName: trim.name,
      color: {
        id: color.id,
        code: color.code,
        name: color.name,
        hex: color.hex,
      },
      wheel: {
        id: wheel.id,
        code: wheel.code,
        name: wheel.name,
        sizeInch: wheel.sizeInch,
      },
      label: `${modelName} ${trim.name} · ${color.name} · ล้อ ${wheel.sizeInch}"`,
      lines,
      total: fromSatang(total),
      currency: 'THB',
    },
  };
}

export async function quote(selection) {
  const pool = getMysqlPool();
  const priced = await priceSelection(pool, selection);
  const eta = await estimate(
    pool,
    priced.model,
    Number(priced.trimRow.parts_lead_days),
  );
  return {
    ...priced.quote,
    estimatedReady: { from: eta.from, to: eta.to },
  };
}

/** Pick-up window if `trim` of `model` were ordered today. */
export async function getEta(modelRef, trimRef) {
  const pool = getMysqlPool();
  const model = await requireModel(pool, modelRef);
  const [trims] = await pool.query(
    'SELECT parts_lead_days FROM car_trims WHERE car_model_id = ? AND (code = ? OR id = ?) AND is_active = 1 LIMIT 1',
    [model.id, trimRef, trimRef],
  );
  if (!trims[0])
    throw httpError(404, 'TRIM_NOT_FOUND', 'Trim not found for this model');
  const eta = await estimate(pool, model, Number(trims[0].parts_lead_days));
  return {
    model: model.slug,
    orderDate: today(),
    partsReady: eta.partsReady,
    buildWeek: eta.buildWeek,
    from: eta.from,
    to: eta.to,
  };
}

// ---- Made-to-order cars ------------------------------------------------------

function newVin() {
  // 17 characters. Replaced by the real VIN when the car enters production.
  return 'TYTO' + randomBytes(7).toString('hex').slice(0, 13).toUpperCase();
}

/**
 * Creates the car row for an order (status RESERVED, production QUOTED) with the
 * price worked out here. Sales then creates the order with the returned carId.
 */
export async function createUnit(selection) {
  return withTransaction(async (connection) => {
    const {
      model,
      trimRow,
      quote: priced,
    } = await priceSelection(connection, selection);
    const eta = await estimate(
      connection,
      model,
      Number(trimRow.parts_lead_days),
    );
    const id = randomUUID();
    let vin = newVin();
    for (let attempt = 0; ; attempt += 1) {
      try {
        await connection.query(
          `INSERT INTO cars (id, car_model_id, vin, color, manufacture_year, price, status,
             trim_id, paint_color_id, wheel_id, price_breakdown, production_status, eta_from, eta_to)
           VALUES (?, ?, ?, ?, ?, ?, 'RESERVED', ?, ?, ?, ?, 'QUOTED', ?, ?)`,
          [
            id,
            model.id,
            vin,
            priced.color.name,
            Number(eta.from.slice(0, 4)),
            priced.total,
            priced.trimId,
            priced.color.id,
            priced.wheel.id,
            JSON.stringify(priced.lines),
            eta.from,
            eta.to,
          ],
        );
        break;
      } catch (error) {
        if (error?.errno !== MYSQL_DUPLICATE || attempt >= 3) throw error;
        vin = newVin();
      }
    }
    return {
      carId: id,
      vin,
      price: priced.total,
      ...priced,
      productionStatus: 'QUOTED',
      estimatedReady: { from: eta.from, to: eta.to },
    };
  });
}

async function lockUnit(connection, id) {
  const [rows] = await connection.query(
    `SELECT c.id, c.car_model_id, c.status, c.production_status, c.trim_id, c.vin,
       ${DATE('c.build_week')} AS build_week, ${DATE('c.first_eta_to')} AS first_eta_to
     FROM cars c WHERE c.id = ? FOR UPDATE`,
    [id],
  );
  const unit = rows[0];
  if (!unit || unit.production_status === null) {
    throw httpError(404, 'UNIT_NOT_FOUND', 'Made-to-order car not found');
  }
  return unit;
}

/**
 * The order of this car failed, was cancelled or was not approved: take the car
 * off the queue. Made-to-order cars never go back into stock, they become INACTIVE.
 */
export async function releaseUnit(id) {
  await withTransaction(async (connection) => {
    const unit = await lockUnit(connection, id);
    if (unit.status === 'SOLD' || unit.production_status === 'DELIVERED') {
      throw httpError(
        409,
        'UNIT_SOLD',
        'This car is already sold or delivered and cannot be released',
      );
    }
    if (unit.status === 'INACTIVE') return;
    await freeWeek(connection, unit.car_model_id, unit.build_week);
    await connection.query(
      "UPDATE cars SET status = 'INACTIVE', build_week = NULL WHERE id = ?",
      [id],
    );
  });
  return getUnit(id);
}

/**
 * Moves a made-to-order car to the next production step, or reschedules it.
 * input: { status?, buildWeek?, vin?, date? } — role is the caller's role.
 */
export async function advanceProduction(id, input, role) {
  await withTransaction(async (connection) => {
    const unit = await lockUnit(connection, id);
    if (unit.status === 'INACTIVE') {
      throw httpError(409, 'UNIT_RELEASED', 'This order was cancelled');
    }
    const current = PRODUCTION_STEPS.indexOf(unit.production_status);
    const target = input.status ?? unit.production_status;
    const next = PRODUCTION_STEPS.indexOf(target);
    const reschedule = next === current;
    if (!reschedule && next !== current + 1) {
      throw httpError(
        409,
        'INVALID_STEP',
        `Can only move from ${unit.production_status} to ${PRODUCTION_STEPS[current + 1] ?? '(done)'}`,
      );
    }
    if (role === 'seller' && target !== 'DELIVERED') {
      throw httpError(
        403,
        'FORBIDDEN',
        'Sellers can only mark a car as delivered',
      );
    }
    const model = await requireModel(connection, unit.car_model_id, {
      lock: true,
      activeOnly: false,
    });

    if (reschedule) {
      if (!input.buildWeek)
        throw httpError(400, 'INVALID_PRODUCTION', 'Nothing to change');
      if (!['SCHEDULED', 'IN_PRODUCTION'].includes(target)) {
        throw httpError(
          409,
          'INVALID_STEP',
          'Only a scheduled car or a car in production can change week',
        );
      }
      if (input.buildWeek < mondayOnOrBefore(today())) {
        throw httpError(400, 'INVALID_WEEK', 'buildWeek is in the past');
      }
      if (input.buildWeek === unit.build_week) return;
      if (!(await bookWeek(connection, model, input.buildWeek))) {
        throw httpError(409, 'WEEK_FULL', 'That week is already full');
      }
      await freeWeek(connection, model.id, unit.build_week);
      const eta = etaForWeek(input.buildWeek);
      await connection.query(
        'UPDATE cars SET build_week = ?, eta_from = ?, eta_to = ?, first_eta_to = COALESCE(first_eta_to, ?) WHERE id = ?',
        [eta.buildWeek, eta.from, eta.to, eta.to, id],
      );
      return;
    }

    if (target === 'SCHEDULED') {
      // Deposit paid and order approved: book the first free week after the parts arrive.
      const [[trim]] = await connection.query(
        'SELECT parts_lead_days FROM car_trims WHERE id = ?',
        [unit.trim_id],
      );
      let week = input.buildWeek;
      if (week) {
        if (!(await bookWeek(connection, model, week)))
          throw httpError(409, 'WEEK_FULL', 'That week is already full');
      } else {
        const found = await estimate(
          connection,
          model,
          Number(trim?.parts_lead_days ?? 14),
        );
        week = found.buildWeek;
        if (!(await bookWeek(connection, model, week)))
          throw httpError(409, 'WEEK_FULL', 'That week is already full');
      }
      const eta = etaForWeek(week);
      await connection.query(
        `UPDATE cars SET production_status = 'SCHEDULED', build_week = ?, eta_from = ?, eta_to = ?,
           first_eta_to = COALESCE(first_eta_to, ?) WHERE id = ?`,
        [week, eta.from, eta.to, eta.to, id],
      );
    } else if (target === 'IN_PRODUCTION') {
      const vin = input.vin ?? unit.vin;
      try {
        await connection.query(
          "UPDATE cars SET production_status = 'IN_PRODUCTION', vin = ? WHERE id = ?",
          [vin, id],
        );
      } catch (error) {
        duplicate(error, 'Another car already has this VIN');
      }
    } else if (target === 'IN_TRANSIT') {
      // Left the factory: the arrival day is now known.
      const arrival = input.date ?? addDays(unit.build_week ?? today(), 10);
      await connection.query(
        "UPDATE cars SET production_status = 'IN_TRANSIT', eta_from = ?, eta_to = ? WHERE id = ?",
        [arrival, arrival, id],
      );
    } else if (target === 'READY') {
      const ready = input.date ?? today();
      await connection.query(
        "UPDATE cars SET production_status = 'READY', ready_date = ?, eta_from = ?, eta_to = ? WHERE id = ?",
        [ready, ready, ready, id],
      );
    } else if (target === 'DELIVERED') {
      await connection.query(
        "UPDATE cars SET production_status = 'DELIVERED' WHERE id = ?",
        [id],
      );
    }
  });
  return getUnit(id);
}

// ---- Stock / queue views -----------------------------------------------------

const UNIT_SELECT = `
  SELECT c.id, c.vin, c.color, c.price, c.status, c.production_status, c.price_breakdown,
    ${DATE('c.build_week')} AS build_week, ${DATE('c.eta_from')} AS eta_from,
    ${DATE('c.eta_to')} AS eta_to, ${DATE('c.first_eta_to')} AS first_eta_to,
    ${DATE('c.ready_date')} AS ready_date, c.created_at, c.updated_at,
    m.slug AS model_slug, m.brand, m.model_name,
    t.code AS trim_code, t.name AS trim_name,
    pc.code AS color_code, pc.hex AS color_hex,
    w.code AS wheel_code, w.name AS wheel_name, w.size_inch,
    o.id AS order_id, o.status AS order_status
  FROM cars c
  JOIN car_models m ON m.id = c.car_model_id
  LEFT JOIN car_trims t ON t.id = c.trim_id
  LEFT JOIN paint_colors pc ON pc.id = c.paint_color_id
  LEFT JOIN wheel_options w ON w.id = c.wheel_id
  LEFT JOIN orders o ON o.car_id = c.id AND o.status <> 'CANCELLED'`;

function toUnit(row, day = today()) {
  const open =
    row.status !== 'INACTIVE' &&
    !['READY', 'DELIVERED'].includes(row.production_status);
  const delayDays =
    row.first_eta_to && row.eta_to
      ? Math.max(0, daysBetween(row.first_eta_to, row.eta_to))
      : 0;
  const overdue = open && row.eta_to !== null && row.eta_to < day;
  return {
    id: row.id,
    vin: row.vin,
    model: `${row.brand} ${row.model_name}`,
    modelSlug: row.model_slug,
    trim: row.trim_code,
    trimName: row.trim_name,
    color: row.color,
    colorCode: row.color_code,
    colorHex: row.color_hex,
    wheel: row.wheel_code,
    wheelName: row.wheel_name,
    wheelSizeInch: row.size_inch === null ? null : Number(row.size_inch),
    price: row.price,
    lines: readJson(row.price_breakdown, []),
    status: row.status,
    productionStatus: row.production_status,
    buildWeek: row.build_week,
    estimatedReady: row.eta_from
      ? { from: row.eta_from, to: row.eta_to }
      : null,
    readyDate: row.ready_date,
    delayDays,
    delayed: open && (delayDays > 0 || overdue),
    canCancelForDelay: open && delayDays > 30,
    orderId: row.order_id,
    orderStatus: row.order_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUnit(id) {
  const [rows] = await getMysqlPool().query(
    UNIT_SELECT + ' WHERE c.id = ? AND c.production_status IS NOT NULL',
    [id],
  );
  if (!rows[0])
    throw httpError(404, 'UNIT_NOT_FOUND', 'Made-to-order car not found');
  return toUnit(rows[0]);
}

/** Made-to-order cars, newest first. */
export async function listUnits({
  model,
  trim,
  productionStatus,
  state,
  q,
  page,
  pageSize,
}) {
  const where = ['c.production_status IS NOT NULL'];
  const params = [];
  if (model) {
    where.push('(m.slug = ? OR m.id = ?)');
    params.push(model, model);
  }
  if (trim) {
    where.push('t.code = ?');
    params.push(trim);
  }
  if (productionStatus) {
    where.push('c.production_status = ?');
    params.push(productionStatus);
  }
  if (state === 'open')
    where.push(`${ACTIVE_UNIT} AND c.production_status <> 'DELIVERED'`);
  if (state === 'cancelled') where.push("c.status = 'INACTIVE'");
  if (state === 'delayed') {
    where.push(
      `${ACTIVE_UNIT} AND c.production_status NOT IN ('READY','DELIVERED')
       AND (c.eta_to > c.first_eta_to OR c.eta_to < ?)`,
    );
    params.push(today());
  }
  if (q) {
    where.push('(c.vin LIKE ? OR c.id = ? OR o.id = ?)');
    params.push('%' + q.replace(/[\\%_]/g, '\\$&') + '%', q, q);
  }
  const whereSql = ' WHERE ' + where.join(' AND ');
  const pool = getMysqlPool();
  const [[count]] = await pool.query(
    `SELECT COUNT(*) AS total FROM (${UNIT_SELECT}${whereSql}) AS u`,
    params,
  );
  const [rows] = await pool.query(
    `${UNIT_SELECT}${whereSql} ORDER BY c.created_at DESC, c.id LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  const day = today();
  return {
    items: rows.map((row) => toUnit(row, day)),
    total: Number(count.total),
  };
}

function emptySteps() {
  return Object.fromEntries(PRODUCTION_STEPS.map((step) => [step, 0]));
}

/** Weeks from this Monday on, with the default capacity filled in where no row exists. */
async function queueWeeks(db, model, weeks) {
  const first = mondayOnOrBefore(today());
  const slots = await loadSlots(db, model.id, first);
  return Array.from({ length: weeks }, (_, index) => {
    const week = addDays(first, index * 7);
    const slot = slots.get(week);
    return {
      weekStart: week,
      capacity: slot ? slot.capacity : Number(model.weekly_capacity),
      booked: slot ? slot.booked : 0,
    };
  });
}

/**
 * Stock of the models on sale, per model × trim: showroom cars, made-to-order cars
 * by production step, cancelled orders, and the next weeks of the production queue.
 */
export async function getInventory({ weeks = 8 } = {}) {
  const pool = getMysqlPool();
  const [models] = await pool.query(
    `SELECT id, slug, brand, model_name, body_type, weekly_capacity, featured
     FROM car_models WHERE is_active = 1 ORDER BY brand, model_name`,
  );
  const modelIds = models.map((model) => model.id);
  const [trims] = modelIds.length
    ? await pool.query(
        `SELECT id, car_model_id, code, name, price, is_active FROM car_trims
         WHERE car_model_id IN (?) ORDER BY sort_order, price`,
        [modelIds],
      )
    : [[]];
  const [counts] = modelIds.length
    ? await pool.query(
        `SELECT car_model_id, trim_id, status, production_status, COUNT(*) AS n
         FROM cars WHERE car_model_id IN (?)
         GROUP BY car_model_id, trim_id, status, production_status`,
        [modelIds],
      )
    : [[]];
  const day = today();
  const [delayedRows] = modelIds.length
    ? await pool.query(
        `SELECT c.car_model_id, c.trim_id, COUNT(*) AS n FROM cars c
         WHERE c.car_model_id IN (?) AND ${ACTIVE_UNIT}
           AND c.production_status IS NOT NULL AND c.production_status NOT IN ('READY','DELIVERED')
           AND (c.eta_to > c.first_eta_to OR c.eta_to < ?)
         GROUP BY c.car_model_id, c.trim_id`,
        [modelIds, day],
      )
    : [[]];
  const photos = await Promise.all(models.map((model) => getModel(model.id)));

  const blank = () => ({
    showroom: 0,
    inStock: 0,
    production: emptySteps(),
    open: 0,
    cancelled: 0,
    delayed: 0,
  });
  const byKey = new Map();
  const bucket = (modelId, trimId) => {
    const key = modelId + '/' + (trimId ?? '');
    if (!byKey.has(key)) byKey.set(key, blank());
    return byKey.get(key);
  };
  for (const row of counts) {
    const target = bucket(row.car_model_id, row.trim_id);
    const n = Number(row.n);
    if (row.production_status === null) {
      if (row.status === 'AVAILABLE') {
        if (row.trim_id) target.showroom += n;
        else target.inStock += n;
      }
    } else if (row.status === 'INACTIVE') {
      target.cancelled += n;
    } else {
      target.production[row.production_status] += n;
      if (row.production_status !== 'DELIVERED') target.open += n;
    }
  }
  for (const row of delayedRows)
    bucket(row.car_model_id, row.trim_id).delayed += Number(row.n);

  const totals = { ...blank(), models: 0, trims: 0 };
  const add = (into, from) => {
    for (const key of ['showroom', 'inStock', 'open', 'cancelled', 'delayed'])
      into[key] += from[key];
    for (const step of PRODUCTION_STEPS)
      into.production[step] += from.production[step];
  };

  const result = [];
  for (const [index, model] of models.entries()) {
    const modelTrims = trims.filter((trim) => trim.car_model_id === model.id);
    const sum = blank();
    const trimRows = modelTrims.map((trim) => {
      const counted = byKey.get(model.id + '/' + trim.id) ?? blank();
      add(sum, counted);
      return {
        id: trim.id,
        code: trim.code,
        name: trim.name,
        price: trim.price,
        active: Boolean(trim.is_active),
        ...counted,
      };
    });
    add(sum, byKey.get(model.id + '/') ?? blank());
    add(totals, sum);
    totals.models += 1;
    totals.trims += modelTrims.length;
    result.push({
      id: model.slug || model.id,
      uuid: model.id,
      brand: model.brand,
      name: model.model_name,
      type: model.body_type,
      imageUrl: photos[index]?.imageUrl ?? '',
      configurable: modelTrims.length > 0,
      weeklyCapacity: Number(model.weekly_capacity),
      trims: trimRows,
      ...sum,
      queue: await queueWeeks(pool, model, weeks),
    });
  }
  return { asOf: day, models: result, totals };
}

export async function listQueue(modelRef, weeks) {
  const pool = getMysqlPool();
  const model = await requireModel(pool, modelRef);
  return {
    model: model.slug,
    weeklyCapacity: Number(model.weekly_capacity),
    weeks: await queueWeeks(pool, model, weeks),
  };
}

/**
 * Sets how many cars of a model can be built per week: one week when weekStart is
 * given, otherwise the default for every week without its own row.
 */
export async function setCapacity(modelRef, { capacity, weekStart }) {
  await withTransaction(async (connection) => {
    const model = await requireModel(connection, modelRef, { lock: true });
    if (!weekStart) {
      await connection.query(
        'UPDATE car_models SET weekly_capacity = ? WHERE id = ?',
        [capacity, model.id],
      );
      return;
    }
    await connection.query(
      `INSERT INTO production_slots (car_model_id, week_start, capacity, booked)
       VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE car_model_id = car_model_id`,
      [model.id, weekStart, model.weekly_capacity],
    );
    const [[slot]] = await connection.query(
      'SELECT booked FROM production_slots WHERE car_model_id = ? AND week_start = ? FOR UPDATE',
      [model.id, weekStart],
    );
    if (capacity < Number(slot.booked)) {
      throw httpError(
        409,
        'CAPACITY_BELOW_BOOKED',
        `${slot.booked} cars are already booked in that week`,
      );
    }
    await connection.query(
      'UPDATE production_slots SET capacity = ? WHERE car_model_id = ? AND week_start = ?',
      [capacity, model.id, weekStart],
    );
  });
  return listQueue(modelRef, 8);
}

// ---- Admin: shared colours / wheels -------------------------------------------

function toColor(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    hex: row.hex,
    finish: row.finish,
    priceExtra: row.price_extra,
    sortOrder: Number(row.sort_order),
    active: Boolean(row.is_active),
  };
}

function toWheel(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sizeInch: Number(row.size_inch),
    imageUrl: row.image_path || null,
    sortOrder: Number(row.sort_order),
    active: Boolean(row.is_active),
  };
}

export async function listOptions({ includeInactive = false } = {}) {
  const pool = getMysqlPool();
  const filter = includeInactive ? '' : ' WHERE is_active = 1';
  const [colors] = await pool.query(
    'SELECT * FROM paint_colors' + filter + ' ORDER BY sort_order, name',
  );
  const [wheels] = await pool.query(
    'SELECT * FROM wheel_options' + filter + ' ORDER BY size_inch, sort_order',
  );
  return { colors: colors.map(toColor), wheels: wheels.map(toWheel) };
}

const COLOR_FIELDS = {
  code: 'code',
  name: 'name',
  hex: 'hex',
  finish: 'finish',
  priceExtra: 'price_extra',
  sortOrder: 'sort_order',
  active: 'is_active',
};
const WHEEL_FIELDS = {
  code: 'code',
  name: 'name',
  sizeInch: 'size_inch',
  imageUrl: 'image_path',
  sortOrder: 'sort_order',
  active: 'is_active',
};

function assignments(input, fields) {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(fields)) {
    if (input[key] === undefined) continue;
    sets.push(column + ' = ?');
    values.push(
      typeof input[key] === 'boolean' ? Number(input[key]) : input[key],
    );
  }
  return { sets, values };
}

async function insertRow(table, fields, input, toApi) {
  const id = randomUUID();
  const { sets, values } = assignments(input, fields);
  const columns = sets.map((set) => set.split(' ')[0]);
  try {
    await getMysqlPool().query(
      `INSERT INTO ${table} (id, ${columns.join(', ')}) VALUES (?${', ?'.repeat(columns.length)})`,
      [id, ...values],
    );
  } catch (error) {
    duplicate(error, 'This code is already used');
  }
  const [[row]] = await getMysqlPool().query(
    `SELECT * FROM ${table} WHERE id = ?`,
    [id],
  );
  return toApi(row);
}

async function updateRow(table, fields, id, input, toApi) {
  const { sets, values } = assignments(input, fields);
  if (sets.length) {
    try {
      await getMysqlPool().query(
        `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`,
        [...values, id],
      );
    } catch (error) {
      duplicate(error, 'This code is already used');
    }
  }
  const [[row]] = await getMysqlPool().query(
    `SELECT * FROM ${table} WHERE id = ?`,
    [id],
  );
  if (!row) throw httpError(404, 'OPTION_NOT_FOUND', 'Option not found');
  return toApi(row);
}

export const createColor = (input) =>
  insertRow('paint_colors', COLOR_FIELDS, input, toColor);
export const updateColor = (id, input) =>
  updateRow('paint_colors', COLOR_FIELDS, id, input, toColor);
export const createWheel = (input) =>
  insertRow('wheel_options', WHEEL_FIELDS, input, toWheel);
export const updateWheel = (id, input) =>
  updateRow('wheel_options', WHEEL_FIELDS, id, input, toWheel);

// ---- Admin: trims -------------------------------------------------------------

const TRIM_FIELDS = {
  code: 'code',
  name: 'name',
  tagline: 'tagline',
  price: 'price',
  engine: 'engine',
  horsepower: 'horsepower',
  fuelEconomyKml: 'fuel_economy_kml',
  transmission: 'transmission',
  fuel: 'fuel',
  features: 'features',
  partsLeadDays: 'parts_lead_days',
  sortOrder: 'sort_order',
  active: 'is_active',
};

function trimInput(input) {
  return input.features === undefined
    ? input
    : { ...input, features: JSON.stringify(input.features) };
}

async function getTrimWithOptions(db, id) {
  const [rows] = await db.query(
    `SELECT ${TRIM_COLUMNS} FROM car_trims t WHERE t.id = ?`,
    [id],
  );
  if (!rows[0]) throw httpError(404, 'TRIM_NOT_FOUND', 'Trim not found');
  const options = await loadTrimOptions(db, [id], { includeInactive: true });
  return toTrim(rows[0], options.get(id));
}

/** Every trim of a model, including the ones taken off sale (admin page). */
export async function listTrims(modelRef) {
  const pool = getMysqlPool();
  const model = await requireModel(pool, modelRef, { activeOnly: false });
  const trims = await loadTrims(pool, model.id, { includeInactive: true });
  const options = await loadTrimOptions(
    pool,
    trims.map((trim) => trim.id),
    { includeInactive: true },
  );
  return trims.map((row) => toTrim(row, options.get(row.id)));
}

export async function createTrim(modelRef, input) {
  const pool = getMysqlPool();
  const model = await requireModel(pool, modelRef, { activeOnly: false });
  const id = randomUUID();
  const { sets, values } = assignments(trimInput(input), TRIM_FIELDS);
  const columns = sets.map((set) => set.split(' ')[0]);
  try {
    await pool.query(
      `INSERT INTO car_trims (id, car_model_id, ${columns.join(', ')})
       VALUES (?, ?${', ?'.repeat(columns.length)})`,
      [id, model.id, ...values],
    );
  } catch (error) {
    duplicate(error, 'This model already has a trim with this code');
  }
  return getTrimWithOptions(pool, id);
}

export async function updateTrim(id, input) {
  const pool = getMysqlPool();
  const { sets, values } = assignments(trimInput(input), TRIM_FIELDS);
  if (sets.length) {
    try {
      const [result] = await pool.query(
        `UPDATE car_trims SET ${sets.join(', ')} WHERE id = ?`,
        [...values, id],
      );
      if (!result.affectedRows)
        throw httpError(404, 'TRIM_NOT_FOUND', 'Trim not found');
    } catch (error) {
      duplicate(error, 'This model already has a trim with this code');
    }
  }
  return getTrimWithOptions(pool, id);
}

async function requireIds(connection, table, ids, label) {
  if (!ids.length) return;
  const [rows] = await connection.query(
    `SELECT id FROM ${table} WHERE id IN (?)`,
    [ids],
  );
  if (rows.length !== new Set(ids).size)
    throw httpError(400, 'INVALID_OPTION', `Unknown ${label}`);
}

/** colors: [{ colorId, imageUrl? }] — replaces the colours this trim may have. */
export async function setTrimColors(id, colors) {
  await withTransaction(async (connection) => {
    await getTrimWithOptions(connection, id);
    await requireIds(
      connection,
      'paint_colors',
      colors.map((item) => item.colorId),
      'colour',
    );
    await connection.query('DELETE FROM trim_colors WHERE trim_id = ?', [id]);
    if (colors.length) {
      await connection.query(
        'INSERT INTO trim_colors (trim_id, color_id, image_path) VALUES ?',
        [colors.map((item) => [id, item.colorId, item.imageUrl ?? null])],
      );
    }
  });
  return getTrimWithOptions(getMysqlPool(), id);
}

/** wheels: [{ wheelId, priceExtra }] — replaces the wheels; defaultWheelId must be one of them. */
export async function setTrimWheels(id, wheels, defaultWheelId) {
  await withTransaction(async (connection) => {
    const trim = await getTrimWithOptions(connection, id);
    const ids = wheels.map((item) => item.wheelId);
    await requireIds(connection, 'wheel_options', ids, 'wheel');
    const fallback = ids.includes(trim.defaultWheelId)
      ? trim.defaultWheelId
      : (ids[0] ?? null);
    const chosen = defaultWheelId ?? fallback;
    if (chosen !== null && !ids.includes(chosen)) {
      throw httpError(
        400,
        'INVALID_OPTION',
        'defaultWheelId must be one of the wheels',
      );
    }
    await connection.query('DELETE FROM trim_wheels WHERE trim_id = ?', [id]);
    if (wheels.length) {
      await connection.query(
        'INSERT INTO trim_wheels (trim_id, wheel_id, price_extra) VALUES ?',
        [wheels.map((item) => [id, item.wheelId, item.priceExtra])],
      );
    }
    await connection.query(
      'UPDATE car_trims SET default_wheel_id = ? WHERE id = ?',
      [chosen, id],
    );
  });
  return getTrimWithOptions(getMysqlPool(), id);
}
