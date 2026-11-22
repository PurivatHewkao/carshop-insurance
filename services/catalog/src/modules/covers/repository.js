import { getMysqlPool } from '../../config/mysql.js';

export const COVER_SLOTS = ['home', 'catalog'];

/**
 * { home: { carId: "ferrari-296-gtb" | null, imageUrl: string | null }, catalog: {...} }
 * carId null = automatic car, imageUrl null = use the car's own photo.
 */
export async function getCovers() {
  const [rows] = await getMysqlPool().query(
    `SELECT s.slot, s.image_url, m.slug, m.id AS model_id
       FROM site_covers s LEFT JOIN car_models m ON m.id = s.car_model_id`,
  );
  const covers = Object.fromEntries(
    COVER_SLOTS.map((slot) => [slot, { carId: null, imageUrl: null }]),
  );
  for (const row of rows) {
    if (row.slot in covers) {
      covers[row.slot] = {
        carId: row.slug || row.model_id || null,
        imageUrl: row.image_url || null,
      };
    }
  }
  return covers;
}

/**
 * patch.carId: slug/UUID of a car model, null = automatic, undefined = leave as is.
 * patch.imageUrl: image URL / data URL, null = remove, undefined = leave as is.
 * Returns false if the car model does not exist.
 */
export async function setCover(slot, patch) {
  const pool = getMysqlPool();
  const sets = [];
  const values = [];
  if (patch.carId !== undefined) {
    let modelId = null;
    if (patch.carId !== null) {
      const [found] = await pool.query(
        'SELECT id FROM car_models WHERE slug = ? OR id = ? LIMIT 1',
        [patch.carId, patch.carId],
      );
      if (!found.length) return false;
      modelId = found[0].id;
    }
    sets.push('car_model_id = ?');
    values.push(modelId);
  }
  if (patch.imageUrl !== undefined) {
    sets.push('image_url = ?');
    values.push(patch.imageUrl);
  }
  await pool.query('INSERT IGNORE INTO site_covers (slot) VALUES (?)', [slot]);
  if (sets.length) {
    await pool.query(
      'UPDATE site_covers SET ' + sets.join(', ') + ' WHERE slot = ?',
      [...values, slot],
    );
  }
  return true;
}
