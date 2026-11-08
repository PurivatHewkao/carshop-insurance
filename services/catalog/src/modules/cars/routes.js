import { Router } from 'express';
import { httpError } from '../../utils/httpError.js';
import {
  MAX_STOCK,
  createModel,
  deleteModel,
  getModel,
  getStockSummary,
  listModels,
  replacePhotos,
  setStock,
} from './repository.js';

const router = Router();
const AVAILABILITY = ['all', 'available', 'low', 'out'];
const MAX_PHOTOS = 6;
const MAX_PHOTO_LENGTH = 700_000; // a compressed upload as a data: URL
const PHOTO_PATTERN = /^(https?:\/\/|data:image\/)/i;

function invalid(message) {
  return httpError(400, 'INVALID_CAR', message);
}

function readInt(value, fallback, { min, max, label }) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw httpError(
      400,
      'INVALID_QUERY',
      label + ' must be an integer between ' + min + ' and ' + max,
    );
  }
  return number;
}

// A model is addressed by its slug (e.g. "ferrari-296-gtb") or its UUID.
function readRef(value) {
  const ref = String(value ?? '').trim();
  if (!ref || ref.length > 150)
    throw httpError(400, 'INVALID_ID', 'car id is not valid');
  return ref;
}

function text(body, field, { max, required = false, fallback = null }) {
  const value = body[field];
  if (value === undefined || value === null || value === '') {
    if (required) throw invalid(field + ' is required');
    return fallback;
  }
  if (typeof value !== 'string' || value.trim().length > max) {
    throw invalid(field + ' must be text of at most ' + max + ' characters');
  }
  return value.trim();
}

function number(body, field, { min, max, fallback, integer = false }) {
  const value = body[field];
  if (value === undefined || value === null || value === '') {
    if (fallback === undefined) throw invalid(field + ' is required');
    return fallback;
  }
  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    parsed < min ||
    parsed > max ||
    (integer && !Number.isInteger(parsed))
  ) {
    throw invalid(
      field +
        ' must be ' +
        (integer ? 'an integer' : 'a number') +
        ' between ' +
        min +
        ' and ' +
        max,
    );
  }
  return parsed;
}

function readPhotos(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_PHOTOS) {
    throw invalid('photos must be a list of at most ' + MAX_PHOTOS + ' images');
  }
  const photos = value.map((item) => {
    if (
      typeof item !== 'string' ||
      item.length > MAX_PHOTO_LENGTH ||
      !PHOTO_PATTERN.test(item)
    ) {
      throw invalid(
        'each photo must be an http(s) URL or an uploaded image (data:image/...) under 700 KB',
      );
    }
    return item;
  });
  return photos.filter((photo, index) => photos.indexOf(photo) === index);
}

function readColorOptions(value) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length > 12)
    throw invalid('colorOptions must be a list of at most 12 colours');
  return value.map((option) => {
    const name =
      typeof option?.name === 'string' ? option.name.trim().slice(0, 50) : '';
    const hex = typeof option?.value === 'string' ? option.value.trim() : '';
    if (!name || !/^#[0-9a-f]{6}$/i.test(hex))
      throw invalid('each colour needs a name and a #RRGGBB value');
    const images = Array.isArray(option.images)
      ? readPhotos(option.images)
      : [];
    return images.length ? { name, value: hex, images } : { name, value: hex };
  });
}

function parseCar(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw invalid('Request body must be a JSON object');
  const color = text(body, 'color', { max: 7, fallback: '#9EA2AA' });
  if (!/^#[0-9a-f]{6}$/i.test(color))
    throw invalid('color must look like #RRGGBB');
  const features = body.features ?? [];
  if (
    !Array.isArray(features) ||
    features.length > 30 ||
    features.some((item) => typeof item !== 'string' || item.length > 200)
  ) {
    throw invalid('features must be a list of at most 30 short texts');
  }
  return {
    brand: text(body, 'brand', { max: 100, required: true }),
    name: text(body, 'name', { max: 150, required: true }),
    type: text(body, 'type', { max: 50, fallback: 'sedan' }),
    tag: text(body, 'tag', { max: 50, fallback: 'เพิ่มใหม่' }),
    featured: body.featured === true,
    description: text(body, 'description', { max: 5000 }),
    price: number(body, 'price', { min: 1, max: 999_999_999_999 }),
    year: number(body, 'year', {
      min: 1886,
      max: 9999,
      fallback: 2025,
      integer: true,
    }),
    stock: number(body, 'stock', {
      min: 0,
      max: MAX_STOCK,
      fallback: 1,
      integer: true,
    }),
    color,
    variant: text(body, 'variant', { max: 100 }),
    engine: text(body, 'engine', { max: 150 }),
    horsepower: number(body, 'horsepower', {
      min: 0,
      max: 100_000,
      fallback: null,
      integer: true,
    }),
    transmission: text(body, 'transmission', { max: 100 }),
    drive: text(body, 'drive', { max: 100 }),
    fuel: text(body, 'fuel', { max: 50 }),
    seats: number(body, 'seats', {
      min: 1,
      max: 12,
      fallback: null,
      integer: true,
    }),
    location: text(body, 'location', { max: 150 }),
    warranty: text(body, 'warranty', { max: 255 }),
    features: features.map((item) => item.trim()).filter(Boolean),
    colorOptions: readColorOptions(body.colorOptions),
    photos: readPhotos(body.photos),
  };
}

// GET /cars?q=&type=&availability=all|available|low|out&page=1&pageSize=20&include=gallery
router.get('/', async (req, res) => {
  const availability = req.query.availability ?? 'all';
  if (!AVAILABILITY.includes(availability)) {
    throw httpError(400, 'INVALID_QUERY', 'availability is not supported');
  }
  const page = readInt(req.query.page, 1, {
    min: 1,
    max: 100000,
    label: 'page',
  });
  const pageSize = readInt(req.query.pageSize, 20, {
    min: 1,
    max: 100,
    label: 'pageSize',
  });
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';
  const { items, total } = await listModels({
    q: q.slice(0, 100),
    type,
    availability,
    page,
    pageSize,
    gallery: req.query.include === 'gallery',
  });
  res.set('Cache-Control', 'no-store').json({
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});

// GET /cars/stock-summary — numbers for the stock page cards
router.get('/stock-summary', async (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ data: await getStockSummary() });
});

router.post('/', async (req, res) => {
  res.status(201).json({ data: await createModel(parseCar(req.body)) });
});

router.get('/:id', async (req, res) => {
  const model = await getModel(readRef(req.params.id), { fuzzy: true });
  if (!model) throw httpError(404, 'CAR_NOT_FOUND', 'Car model not found');
  res.set('Cache-Control', 'no-store').json({ data: model });
});

// PATCH /cars/:id/stock  { "stock": 5 }  — set the number of AVAILABLE cars
router.patch('/:id/stock', async (req, res) => {
  const ref = readRef(req.params.id);
  const stock = req.body?.stock;
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
    throw httpError(
      400,
      'INVALID_STOCK',
      'stock must be an integer between 0 and ' + MAX_STOCK,
    );
  }
  const model = await setStock(ref, stock);
  if (!model) throw httpError(404, 'CAR_NOT_FOUND', 'Car model not found');
  res.set('Cache-Control', 'no-store').json({ data: model });
});

// PUT /cars/:id/photos  { "photos": ["https://…", "data:image/jpeg;base64,…"] } — first one is the main image
router.put('/:id/photos', async (req, res) => {
  const ref = readRef(req.params.id);
  const model = await replacePhotos(ref, readPhotos(req.body?.photos));
  if (!model) throw httpError(404, 'CAR_NOT_FOUND', 'Car model not found');
  res.set('Cache-Control', 'no-store').json({ data: model });
});

router.delete('/:id', async (req, res) => {
  if (!(await deleteModel(readRef(req.params.id)))) {
    throw httpError(404, 'CAR_NOT_FOUND', 'Car model not found');
  }
  res.status(204).end();
});

export default router;
