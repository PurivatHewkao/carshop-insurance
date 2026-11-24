import { Router } from 'express';
import { ApiError } from '../errors.js';
import { serializePlan } from './plans.js';
import {
  configureVehicle,
  rateVehicle,
  ratingModels,
  ratingTrims,
  ratingColors,
  ratingVersion,
} from '../../../../packages/insurance/rating.js';

export function ratedPlan(row, vehicle, source) {
  try {
    return {
      ...serializePlan(row, source),
      ...rateVehicle(vehicle, row.slug, source),
    };
  } catch (error) {
    throw new ApiError(400, 'UNSUPPORTED_INSURANCE_VEHICLE', error.message);
  }
}
export function quotesRouter(pool, { loadPlans } = {}) {
  const router = Router();
  router.get('/catalog', (_req, res) =>
    res.json({
      data: {
        models: ratingModels,
        trims: ratingTrims,
        colors: ratingColors,
        ratingVersion,
        asOf: '2026-11-24',
      },
    }),
  );
  router.post('/', async (req, res) => {
    let vehicle;
    try {
      vehicle = configureVehicle(req.body);
    } catch (error) {
      throw new ApiError(400, 'INVALID_VEHICLE_CONFIGURATION', error.message);
    }
    const source = req.body.source === 'toyoty' ? 'toyoty' : 'direct';
    const rows = loadPlans
      ? await loadPlans()
      : (
          await pool().execute(
            'SELECT * FROM insurance_plans WHERE is_active = 1 ORDER BY premium_amount',
          )
        )[0];
    if (!rows.length)
      throw new ApiError(
        503,
        'NO_ACTIVE_PLANS',
        'ยังไม่มีแผนประกันเปิดให้ขอราคา กรุณาลองใหม่ภายหลัง',
      );
    res.json({
      data: {
        vehicle,
        plans: rows.map((row) => ratedPlan(row, vehicle, source)),
        ratingVersion,
      },
      meta: { demo: true },
    });
  });
  return router;
}
