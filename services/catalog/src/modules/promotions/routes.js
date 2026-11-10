import { Router } from 'express';
import { httpError, requireUuid } from '../../utils/httpError.js';
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  listPromotions,
  updatePromotion,
} from './repository.js';

const router = Router();
const STATUSES = ['ACTIVE', 'INACTIVE'];
const DISCOUNT_TYPES = ['FIXED', 'PERCENT'];

function invalid(message) {
  return httpError(400, 'INVALID_PROMOTION', message);
}

const MAX_IMAGE_LENGTH = 700_000;

// Optional text fields: undefined = not sent, null/'' = clear it.
function readOptionalText(body, field, max, out) {
  if (body[field] === undefined) return;
  const value = body[field];
  if (value === null || value === '') {
    out[field] = null;
    return;
  }
  if (typeof value !== 'string' || value.trim().length > max) {
    throw invalid(field + ' must be text of at most ' + max + ' characters');
  }
  out[field] = value.trim();
}

function readDate(value, label) {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) {
    throw invalid(label + ' must be an ISO-8601 date');
  }
  return date;
}

// Validates a full promotion (create) or only the given fields (update, partial = true).
function parsePromotion(body, { partial }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid('Request body must be a JSON object');
  }
  const out = {};
  const has = (field) => body[field] !== undefined;
  const need = (field) => {
    if (!partial && !has(field)) throw invalid(field + ' is required');
    return has(field);
  };
  if (need('title')) {
    if (
      typeof body.title !== 'string' ||
      !body.title.trim() ||
      body.title.length > 200
    ) {
      throw invalid('title must be 1-200 characters');
    }
    out.title = body.title.trim();
  }
  if (has('description')) {
    if (body.description !== null && typeof body.description !== 'string') {
      throw invalid('description must be text');
    }
    out.description = body.description;
  } else if (!partial) {
    out.description = null;
  }
  readOptionalText(body, 'badge', 50, out);
  readOptionalText(body, 'subtitle', 200, out);
  readOptionalText(body, 'value', 200, out);
  readOptionalText(body, 'conditions', 5000, out);
  readOptionalText(body, 'appliesTo', 200, out);
  readOptionalText(body, 'imageUrl', MAX_IMAGE_LENGTH, out);
  if (out.imageUrl && !/^(https?:\/\/|data:image\/)/i.test(out.imageUrl)) {
    throw invalid(
      'imageUrl must be an http(s) URL or an uploaded image (data:image/...)',
    );
  }
  for (const field of [
    'badge',
    'subtitle',
    'value',
    'conditions',
    'appliesTo',
    'imageUrl',
  ]) {
    if (!partial && !(field in out)) out[field] = null;
  }
  if (need('discountType')) {
    if (!DISCOUNT_TYPES.includes(body.discountType)) {
      throw invalid('discountType must be FIXED or PERCENT');
    }
    out.discountType = body.discountType;
  }
  if (need('discountValue')) {
    const value = Number(body.discountValue);
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      Math.round(value * 100) !== value * 100
    ) {
      throw invalid(
        'discountValue must be a number >= 0 with at most 2 decimals',
      );
    }
    out.discountValue = value;
  }
  if (need('startDate')) out.startDate = readDate(body.startDate, 'startDate');
  if (need('endDate')) out.endDate = readDate(body.endDate, 'endDate');
  if (has('status') || !partial) {
    const status = body.status ?? 'ACTIVE';
    if (!STATUSES.includes(status))
      throw invalid('status must be ACTIVE or INACTIVE');
    out.status = status;
  }
  return out;
}

// Cross-field rules, checked against the final values (existing row + changes).
function checkRules(promotion) {
  if (
    promotion.discountType === 'PERCENT' &&
    Number(promotion.discountValue) > 100
  ) {
    throw invalid('A PERCENT discount cannot be more than 100');
  }
  if (new Date(promotion.endDate) < new Date(promotion.startDate)) {
    throw invalid('endDate must not be before startDate');
  }
}

// GET /promotions?status=ACTIVE&current=true
router.get('/', async (req, res) => {
  const status = req.query.status;
  if (status !== undefined && !STATUSES.includes(status)) {
    throw httpError(400, 'INVALID_QUERY', 'status must be ACTIVE or INACTIVE');
  }
  const data = await listPromotions({
    status,
    onlyCurrent: req.query.current === 'true',
  });
  res.set('Cache-Control', 'no-store').json({ data });
});

router.get('/:id', async (req, res) => {
  const promotion = await getPromotion(requireUuid(req.params.id));
  if (!promotion)
    throw httpError(404, 'PROMOTION_NOT_FOUND', 'Promotion not found');
  res.set('Cache-Control', 'no-store').json({ data: promotion });
});

router.post('/', async (req, res) => {
  const input = parsePromotion(req.body, { partial: false });
  checkRules(input);
  res.status(201).json({ data: await createPromotion(input) });
});

router.patch('/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  const changes = parsePromotion(req.body, { partial: true });
  const current = await getPromotion(id);
  if (!current)
    throw httpError(404, 'PROMOTION_NOT_FOUND', 'Promotion not found');
  checkRules({ ...current, ...changes });
  res
    .set('Cache-Control', 'no-store')
    .json({ data: await updatePromotion(id, changes) });
});

router.delete('/:id', async (req, res) => {
  const id = requireUuid(req.params.id);
  try {
    if (!(await deletePromotion(id))) {
      throw httpError(404, 'PROMOTION_NOT_FOUND', 'Promotion not found');
    }
  } catch (error) {
    // Orders keep a foreign key to promotions: deactivate instead of deleting.
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw httpError(
        409,
        'PROMOTION_IN_USE',
        'This promotion is used by orders; set status to INACTIVE instead',
      );
    }
    throw error;
  }
  res.status(204).end();
});

export default router;
