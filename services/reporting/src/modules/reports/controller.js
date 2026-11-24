import {
  appointmentsReport,
  financialReport,
  ordersReport,
  productionDelays,
  salesByConfiguration,
  activityFeed,
  inventoryReport,
  salesByModel,
  salesBySeller,
  salesSummary,
} from './service.js';

const run = (work) => async (req, res, next) => {
  try {
    const data = await work(req);
    res.set('Cache-Control', 'no-store').json({ data });
  } catch (error) {
    next(error);
  }
};

export const getSalesSummary = run((req) => salesSummary(req, req.query));
export const getSalesBySeller = run((req) => salesBySeller(req, req.query));
export const getSalesByModel = run((req) => salesByModel(req, req.query));
export const getInventoryReport = run((req) => inventoryReport(req));
export const getAppointmentsReport = run((req) => appointmentsReport(req, req.query));
export const getFinancialReport = run((req) => financialReport(req, req.query));
export const getOrdersReport = run((req) => ordersReport(req, req.query));
export const getActivityFeed = run((req) => activityFeed(req, req.query));
export const getSalesByConfiguration = run((req) => salesByConfiguration(req, req.query));
export const getProductionDelays = run((req) => productionDelays(req));
