import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import SystemStatusPage from '../pages/SystemStatusPage.jsx';
import { identityRoutes } from '../features/identity/routes.jsx';
import { catalogRoutes } from '../features/catalog/routes.jsx';
import { salesRoutes } from '../features/sales/routes.jsx';
import { paymentRoutes } from '../features/payment/routes.jsx';
import { reportingRoutes } from '../features/reporting/routes.jsx';
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      ...identityRoutes,
      ...catalogRoutes,
      ...salesRoutes,
      ...paymentRoutes,
      ...reportingRoutes,
      { path: 'system-status', element: <SystemStatusPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
