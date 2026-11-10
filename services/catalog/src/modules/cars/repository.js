import { randomBytes, randomUUID } from 'node:crypto';
import { getMysqlPool } from '../../config/mysql.js';
import { httpError } from '../../utils/httpError.js';

export const LOW_STOCK_LIMIT = 2;
export const MAX_STOCK = 500;
const MYSQL_ROW_REFERENCED = 1451;

// One row per car model. Stock = number of cars of that model with status AVAILABLE.
const MODEL_SELECT = `
  SELECT m.id, m.slug, m.brand, m.model_name, m.body_type, m.description, m.tag, m.featured,
    m.variant, m.engine, m.horsepower, m.transmission, m.drive, m.fuel, m.seats, m.location,
    m.warranty, m.features, m.color_options,
    COALESCE(SUM(c.status = 'AVAILABLE'), 0) AS stock,
    COUNT(c.id) AS car_count,
    COALESCE(MIN(CASE WHEN c.status = 'AVAILABLE' THEN c.price END), MIN(c.price)) AS price,
    MAX(c.manufacture_year) AS year,
    MIN(c.color) AS color
  FROM car_models m LEFT JOIN cars c ON c.car_model_id = m.id`;

export function stockStatus(stock) {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= LOW_STOCK_LIMIT) return 'LOW_STOCK';
  return 'IN_STOCK';
}

// MySQL returns JSON columns already parsed, MariaDB returns text.
function readJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** `id` is the URL slug (falls back to the UUID); `uuid` is the database key. */
function toModel(row, photos, { gallery }) {
  const stock = Number(row.stock) || 0;
  const model = {
    id: row.slug || row.id,
    uuid: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.model_name,
    type: row.body_type,
    tag: row.tag,
    featured: Boolean(row.featured),
    description: row.description,
    price: row.price,
    currency: 'THB',
    year: row.year === null ? null : Number(row.year),
    color: row.color,
    variant: row.variant,
    engine: row.engine,
    horsepower: row.horsepower === null ? null : Number(row.horsepower),
    transmission: row.transmission,
    drive: row.drive,
    fuel: row.fuel,
    seats: row.seats === null ? null : Number(row.seats),
    location: row.location,
    warranty: row.warranty,
    features: readJson(row.features, []),
    colorOptions: readJson(row.color_options, null),
    imageUrl: photos[0] || '',
    stock,
    stockStatus: stockStatus(stock),
  };
  if (gallery) model.gallery = photos.slice(1);
  return model;
}

async function loadPhotos(db, modelIds) {
  const byModel = new Map(modelIds.map((id) => [id, []]));
  if (!modelIds.length) return byModel;
  const [rows] = await db.query(
    `SELECT c.car_model_id AS model_id, i.image_path
     FROM car_images i JOIN cars c ON c.id = i.car_id
     WHERE c.car_model_id IN (?) ORDER BY i.sort_order, i.created_at, i.id`,
    [modelIds],
  );
  for (const row of rows) byModel.get(row.model_id).push(row.image_path);
  return byModel;
}

function escapeLike(text) {
  return text.replace(/[\\%_]/g, (char) => '\\' + char);
}

export async function listModels({
  q,
  type,
  availability,
  page,
  pageSize,
  gallery,
}) {
  const pool = getMysqlPool();
  const where = [];
  const params = [];
  if (q) {
    where.push("CONCAT(m.brand, ' ', m.model_name) LIKE ?");
    params.push('%' + escapeLike(q) + '%');
  }
  if (type) {
    where.push('m.body_type = ?');
    params.push(type);
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const having = {
    available: ' HAVING stock > ' + LOW_STOCK_LIMIT,
    low: ' HAVING stock > 0 AND stock <= ' + LOW_STOCK_LIMIT,
    out: ' HAVING stock <= 0',
  }[availability];
  const grouped = MODEL_SELECT + whereSql + ' GROUP BY m.id' + (having || '');
  const [[count]] = await pool.query(
    'SELECT COUNT(*) AS total FROM (' + grouped + ') AS t',
    params,
  );
  const [rows] = await pool.query(
    grouped + ' ORDER BY m.brand, m.model_name, m.id LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize],
  );
  const photos = await loadPhotos(
    pool,
    rows.map((row) => row.id),
  );
  return {
    items: rows.map((row) => toModel(row, photos.get(row.id), { gallery })),
    total: Number(count.total),
  };
}

/**
 * Finds the UUID of a model from its slug or UUID. With `fuzzy` the model
 * name or "brand name" is accepted too (used by the public detail page).
 */
async function resolveModelId(db, ref, { fuzzy = false } = {}) {
  const conditions = ['slug = ?', 'id = ?'];
  const params = [ref, ref];
  if (fuzzy) {
    conditions.push(
      'model_name = ?',
      "LOWER(CONCAT(brand, ' ', model_name)) = LOWER(?)",
    );
    params.push(ref, ref);
  }
  const [rows] = await db.query(
    'SELECT id FROM car_models WHERE ' +
      conditions.join(' OR ') +
      ' ORDER BY (slug = ?) DESC, (id = ?) DESC LIMIT 1',
    [...params, ref, ref],
  );
  return rows[0]?.id ?? null;
}

async function fetchModelById(db, id, { gallery = true } = {}) {
  const [rows] = await db.query(
    MODEL_SELECT + ' WHERE m.id = ? GROUP BY m.id',
    [id],
  );
  if (!rows[0]) return null;
  const photos = await loadPhotos(db, [id]);
  return toModel(rows[0], photos.get(id), { gallery });
}

export async function getModel(ref, options) {
  const pool = getMysqlPool();
  const id = await resolveModelId(pool, ref, { fuzzy: options?.fuzzy });
  return id ? fetchModelById(pool, id) : null;
}

export async function getStockSummary() {
  const [[row]] = await getMysqlPool().query(
    `SELECT COUNT(*) AS models, COALESCE(SUM(stock), 0) AS units,
       COALESCE(SUM(stock > 0 AND stock <= ?), 0) AS low,
       COALESCE(SUM(stock <= 0), 0) AS out_of_stock
     FROM (SELECT m.id, COALESCE(SUM(c.status = 'AVAILABLE'), 0) AS stock
       FROM car_models m LEFT JOIN cars c ON c.car_model_id = m.id GROUP BY m.id) AS s`,
    [LOW_STOCK_LIMIT],
  );
  return {
    models: Number(row.models),
    units: Number(row.units),
    lowStock: Number(row.low),
    outOfStock: Number(row.out_of_stock),
  };
}

function newVin() {
  // 17 characters, unique placeholder until a real VIN is entered.
  return 'AUTO' + randomBytes(7).toString('hex').slice(0, 13).toUpperCase();
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

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9฀-๿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

async function insertPhotos(connection, carId, photos) {
  if (!photos.length) return;
  await connection.query(
    'INSERT INTO car_images (id, car_id, image_path, sort_order) VALUES ?',
    [photos.map((path, index) => [randomUUID(), carId, path, index])],
  );
}

/** Creates a model, its cars (one per stock unit) and its photos. */
export async function createModel(input) {
  const modelId = await withTransaction(async (connection) => {
    const [existing] = await connection.query(
      'SELECT id FROM car_models WHERE LOWER(brand) = LOWER(?) AND LOWER(model_name) = LOWER(?) LIMIT 1',
      [input.brand, input.name],
    );
    if (existing.length) {
      throw httpError(409, 'CAR_EXISTS', 'This brand and model already exist');
    }
    const base = slugify(input.brand + ' ' + input.name) || 'car';
    let slug = base;
    for (let attempt = 2; attempt < 100; attempt += 1) {
      const [taken] = await connection.query(
        'SELECT 1 FROM car_models WHERE slug = ?',
        [slug],
      );
      if (!taken.length) break;
      slug = base + '-' + attempt;
    }
    const id = randomUUID();
    await connection.query(
      `INSERT INTO car_models (id, slug, brand, model_name, body_type, description, tag, featured,
         variant, engine, horsepower, transmission, drive, fuel, seats, location, warranty, features, color_options)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        slug,
        input.brand,
        input.name,
        input.type,
        input.description,
        input.tag,
        input.featured ? 1 : 0,
        input.variant,
        input.engine,
        input.horsepower,
        input.transmission,
        input.drive,
        input.fuel,
        input.seats,
        input.location,
        input.warranty,
        JSON.stringify(input.features),
        input.colorOptions ? JSON.stringify(input.colorOptions) : null,
      ],
    );
    const units = input.stock > 0 ? input.stock : 1;
    const status = input.stock > 0 ? 'AVAILABLE' : 'INACTIVE';
    const cars = Array.from({ length: units }, () => [
      randomUUID(),
      id,
      newVin(),
      input.color,
      input.year,
      input.price,
      status,
    ]);
    await connection.query(
      'INSERT INTO cars (id, car_model_id, vin, color, manufacture_year, price, status) VALUES ?',
      [cars],
    );
    await insertPhotos(connection, cars[0][0], input.photos);
    return id;
  });
  return fetchModelById(getMysqlPool(), modelId);
}

/** Replaces all photos of a model. The first one is the main image. */
export async function replacePhotos(ref, photos) {
  const pool = getMysqlPool();
  const modelId = await resolveModelId(pool, ref);
  if (!modelId) return null;
  await withTransaction(async (connection) => {
    await connection.query(
      'SELECT id FROM car_models WHERE id = ? FOR UPDATE',
      [modelId],
    );
    const [cars] = await connection.query(
      'SELECT id FROM cars WHERE car_model_id = ? ORDER BY created_at, id LIMIT 1',
      [modelId],
    );
    if (!cars.length) {
      throw httpError(
        409,
        'MODEL_HAS_NO_CAR',
        'This model has no car record to attach photos to',
      );
    }
    await connection.query(
      'DELETE FROM car_images WHERE car_id IN (SELECT id FROM cars WHERE car_model_id = ?)',
      [modelId],
    );
    await insertPhotos(connection, cars[0].id, photos);
  });
  return fetchModelById(pool, modelId);
}

/** Deletes a model with its cars and photos, unless an order or appointment still uses a car. */
export async function deleteModel(ref) {
  const pool = getMysqlPool();
  const modelId = await resolveModelId(pool, ref);
  if (!modelId) return false;
  try {
    await withTransaction(async (connection) => {
      await connection.query(
        'DELETE FROM car_images WHERE car_id IN (SELECT id FROM cars WHERE car_model_id = ?)',
        [modelId],
      );
      await connection.query('DELETE FROM cars WHERE car_model_id = ?', [
        modelId,
      ]);
      await connection.query('DELETE FROM car_models WHERE id = ?', [modelId]);
    });
  } catch (error) {
    if (error.errno === MYSQL_ROW_REFERENCED) {
      throw httpError(
        409,
        'CAR_IN_USE',
        'Orders or appointments still use this car; set its stock to 0 instead of deleting it',
      );
    }
    throw error;
  }
  return true;
}

/**
 * Sets the number of AVAILABLE cars of a model to `target`.
 * Increase: re-activate INACTIVE cars first, then add new rows copied from an existing car.
 * Decrease: mark the newest AVAILABLE cars INACTIVE. Rows are never deleted, and
 * RESERVED / SOLD cars are never touched.
 */
export async function setStock(ref, target) {
  const pool = getMysqlPool();
  const modelId = await resolveModelId(pool, ref);
  if (!modelId) return null;
  await withTransaction(async (connection) => {
    await connection.query(
      'SELECT id FROM car_models WHERE id = ? FOR UPDATE',
      [modelId],
    );
    const [cars] = await connection.query(
      `SELECT id, status, color, manufacture_year, price FROM cars
       WHERE car_model_id = ? ORDER BY created_at, id FOR UPDATE`,
      [modelId],
    );
    const available = cars.filter((car) => car.status === 'AVAILABLE');
    if (target > available.length) {
      let need = target - available.length;
      const inactive = cars
        .filter((car) => car.status === 'INACTIVE')
        .slice(0, need);
      if (inactive.length) {
        await connection.query(
          "UPDATE cars SET status = 'AVAILABLE' WHERE id IN (?)",
          [inactive.map((car) => car.id)],
        );
        need -= inactive.length;
      }
      if (need > 0) {
        const template = cars[cars.length - 1];
        if (!template) {
          throw httpError(
            409,
            'MODEL_HAS_NO_CAR',
            'This model has no car record to copy the price from',
          );
        }
        const values = Array.from({ length: need }, () => [
          randomUUID(),
          modelId,
          newVin(),
          template.color,
          template.manufacture_year,
          template.price,
          'AVAILABLE',
        ]);
        await connection.query(
          'INSERT INTO cars (id, car_model_id, vin, color, manufacture_year, price, status) VALUES ?',
          [values],
        );
      }
    } else if (target < available.length) {
      await connection.query(
        "UPDATE cars SET status = 'INACTIVE' WHERE id IN (?)",
        [available.slice(target).map((car) => car.id)],
      );
    }
  });
  return fetchModelById(pool, modelId);
}
