import { randomUUID } from 'node:crypto';
import { getMysqlPool } from '../../config/mysql.js';

const COLUMNS =
  'id, title, description, discount_type, discount_value, start_date, end_date, status, badge, subtitle, offer_text, conditions, applies_to, image_url';

function toPromotion(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    badge: row.badge,
    subtitle: row.subtitle,
    value: row.offer_text,
    conditions: row.conditions,
    appliesTo: row.applies_to,
    imageUrl: row.image_url,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    currency: 'THB',
    startDate: new Date(row.start_date).toISOString(),
    endDate: new Date(row.end_date).toISOString(),
    status: row.status,
    active: row.status === 'ACTIVE',
  };
}

export async function listPromotions({ status, onlyCurrent }) {
  const where = [];
  const params = [];
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (onlyCurrent) {
    where.push(
      'start_date <= UTC_TIMESTAMP(3) AND end_date >= UTC_TIMESTAMP(3)',
    );
  }
  const [rows] = await getMysqlPool().query(
    'SELECT ' +
      COLUMNS +
      ' FROM promotions' +
      (where.length ? ' WHERE ' + where.join(' AND ') : '') +
      ' ORDER BY end_date, title, id',
    params,
  );
  return rows.map(toPromotion);
}

export async function getPromotion(id) {
  const [rows] = await getMysqlPool().query(
    'SELECT ' + COLUMNS + ' FROM promotions WHERE id = ?',
    [id],
  );
  return rows[0] ? toPromotion(rows[0]) : null;
}

export async function createPromotion(input) {
  const id = randomUUID();
  await getMysqlPool().query(
    `INSERT INTO promotions (id, title, description, discount_type, discount_value, start_date, end_date, status,
       badge, subtitle, offer_text, conditions, applies_to, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.description,
      input.discountType,
      input.discountValue,
      input.startDate,
      input.endDate,
      input.status,
      input.badge,
      input.subtitle,
      input.value,
      input.conditions,
      input.appliesTo,
      input.imageUrl,
    ],
  );
  return getPromotion(id);
}

const FIELD_COLUMNS = {
  title: 'title',
  description: 'description',
  discountType: 'discount_type',
  discountValue: 'discount_value',
  startDate: 'start_date',
  endDate: 'end_date',
  status: 'status',
  badge: 'badge',
  subtitle: 'subtitle',
  value: 'offer_text',
  conditions: 'conditions',
  appliesTo: 'applies_to',
  imageUrl: 'image_url',
};

export async function updatePromotion(id, changes) {
  const sets = [];
  const params = [];
  for (const [field, column] of Object.entries(FIELD_COLUMNS)) {
    if (field in changes) {
      sets.push(column + ' = ?');
      params.push(changes[field]);
    }
  }
  if (sets.length) {
    await getMysqlPool().query(
      'UPDATE promotions SET ' + sets.join(', ') + ' WHERE id = ?',
      [...params, id],
    );
  }
  return getPromotion(id);
}

export async function deletePromotion(id) {
  const [result] = await getMysqlPool().query(
    'DELETE FROM promotions WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}
