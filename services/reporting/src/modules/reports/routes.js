
import { Router } from 'express';

import { validateQuery } from '../../middleware/validate.js';
import { salesSummaryQuerySchema } from './validation.js';

import {
  getSalesSummary,
  getSalesBySeller,
  getSalesByModel,
  getInventoryReport,
  getAppointmentsReport,
} from './controller.js';

const router = Router();

router.get(
  '/sales-summary',
  validateQuery(salesSummaryQuerySchema),
  getSalesSummary
);

router.get('/sales-by-seller', getSalesBySeller);
router.get('/sales-by-model', getSalesByModel);
router.get('/inventory', getInventoryReport);
router.get('/appointments', getAppointmentsReport);

export default router;
