
// services/reporting/src/modules/reports/controller.js

function notImplemented(reportName) {
  return (_req, res) => {
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `${reportName} is waiting for the source API contracts.`,
      },
    });
  };
}

export const getSalesSummary = notImplemented('Sales summary');
export const getSalesBySeller = notImplemented('Sales by seller');
export const getSalesByModel = notImplemented('Sales by model');
export const getInventoryReport = notImplemented('Inventory report');
export const getAppointmentsReport = notImplemented('Appointments report');
