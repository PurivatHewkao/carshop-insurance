import { Router } from 'express';
import { env } from '../../config/env.js';
import { createRequireSession, requireRoles } from '../../../../../packages/auth/index.js';
import { validateQuery } from '../../middleware/validate.js';
import { reportDateRangeQuerySchema, salesSummaryQuerySchema } from './validation.js';
import {
  getSalesSummary,
  getSalesBySeller,
  getSalesByModel,
  getInventoryReport,
  getAppointmentsReport,
  getFinancialReport,
} from './controller.js';

const router = Router();
const requireSession = createRequireSession({
  identityBaseUrl: env.identityApiUrl,
  allowedOrigins: env.corsOrigins,
  timeoutMs: 3000,
});
const requireReportRole = requireRoles('manager', 'admin');
router.use(requireSession, requireReportRole);

router.get('/sales-summary', validateQuery(salesSummaryQuerySchema), getSalesSummary);
router.get('/sales-by-seller', validateQuery(reportDateRangeQuerySchema), getSalesBySeller);
router.get('/sales-by-model', validateQuery(reportDateRangeQuerySchema), getSalesByModel);
router.get('/inventory', getInventoryReport);
router.get('/appointments', validateQuery(reportDateRangeQuerySchema), getAppointmentsReport);
router.get('/finance', validateQuery(reportDateRangeQuerySchema), getFinancialReport);

export default router;
