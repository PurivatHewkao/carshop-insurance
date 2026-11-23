// Admin endpoints for the configurator option lists and trims.
//   /api/v1/options  — shared paint colours and wheels
//   /api/v1/trims    — one trim: details, which colours / wheels it may have
// Trims of a model are listed / added under /api/v1/cars/:id/trims (cars routes).
import { Router } from 'express';
import { CATALOG_EDITORS, staffOnly } from '../../middleware/auth.js';
import { requireUuid } from '../../utils/httpError.js';
import {
  createColor,
  createWheel,
  listOptions,
  setTrimColors,
  setTrimWheels,
  updateColor,
  updateTrim,
  updateWheel,
} from './repository.js';
import {
  parseColor,
  parseTrim,
  parseTrimColors,
  parseTrimWheels,
  parseWheel,
} from './validation.js';

const editors = staffOnly(...CATALOG_EDITORS);

export const optionRoutes = Router();

// GET /options?includeInactive=true — { colors, wheels }
optionRoutes.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store').json({
    data: await listOptions({
      includeInactive: req.query.includeInactive === 'true',
    }),
  });
});

optionRoutes.post('/colors', ...editors, async (req, res) => {
  res
    .status(201)
    .json({ data: await createColor(parseColor(req.body, { create: true })) });
});

optionRoutes.patch('/colors/:id', ...editors, async (req, res) => {
  res.json({
    data: await updateColor(
      requireUuid(req.params.id, 'color id'),
      parseColor(req.body),
    ),
  });
});

optionRoutes.post('/wheels', ...editors, async (req, res) => {
  res
    .status(201)
    .json({ data: await createWheel(parseWheel(req.body, { create: true })) });
});

optionRoutes.patch('/wheels/:id', ...editors, async (req, res) => {
  res.json({
    data: await updateWheel(
      requireUuid(req.params.id, 'wheel id'),
      parseWheel(req.body),
    ),
  });
});

export const trimRoutes = Router();

// PATCH /trims/:id — price, specs, features, partsLeadDays, active ...
trimRoutes.patch('/:id', ...editors, async (req, res) => {
  res.json({
    data: await updateTrim(
      requireUuid(req.params.id, 'trim id'),
      parseTrim(req.body),
    ),
  });
});

// PUT /trims/:id/colors { colors: [{ colorId, imageUrl? }] }
trimRoutes.put('/:id/colors', ...editors, async (req, res) => {
  res.json({
    data: await setTrimColors(
      requireUuid(req.params.id, 'trim id'),
      parseTrimColors(req.body),
    ),
  });
});

// PUT /trims/:id/wheels { wheels: [{ wheelId, priceExtra }], defaultWheelId? }
trimRoutes.put('/:id/wheels', ...editors, async (req, res) => {
  const { wheels, defaultWheelId } = parseTrimWheels(req.body);
  res.json({
    data: await setTrimWheels(
      requireUuid(req.params.id, 'trim id'),
      wheels,
      defaultWheelId,
    ),
  });
});
