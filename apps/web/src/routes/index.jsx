import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import ManagerLayout from '../layouts/ManagerLayout.jsx';
import SellerLayout from '../layouts/SellerLayout.jsx';
import { plannedRoutes } from './plannedRoutes.jsx';
import ManagerPage from '../pages/ManagerPage.jsx';
import PreserveLocationRedirect from '../components/common/PreserveLocationRedirect.jsx';
import HomePage from '../pages/HomePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import SystemStatusPage from '../pages/SystemStatusPage.jsx';
import AdminPage from '../pages/AdminPage.jsx';
import {
  identityRoutes,
  customerIdentityRoutes,
  adminIdentityRoutes,
} from '../features/identity/routes.jsx';
import {
  catalogRoutes,
  adminCatalogRoutes,
} from '../features/catalog/routes.jsx';
import {
  salesRoutes,
  customerSalesRoutes,
  sellerSalesRoutes,
  adminSalesRoutes,
  managerSalesRoutes,
} from '../features/sales/routes.jsx';
import {
  paymentRoutes,
  customerPaymentRoutes,
  sellerPaymentRoutes,
  managerPaymentRoutes,
} from '../features/payment/routes.jsx';
import {
  reportingRoutes,
  managerReportingRoutes,
} from '../features/reporting/routes.jsx';
export const router = createBrowserRouter([
  {
    path: 'customer',
    element: <CustomerLayout />,
    children: [
      {
        index: true,
        element: <PreserveLocationRedirect to="/customer/requests" />,
      },
      ...customerSalesRoutes,
      ...customerIdentityRoutes,
      ...customerPaymentRoutes,
      ...plannedRoutes('customer', null),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'seller',
    element: <SellerLayout />,
    children: [
      { index: true, element: <PreserveLocationRedirect to="/seller/tasks" /> },
      ...sellerSalesRoutes,
      ...sellerPaymentRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'manager',
    element: <ManagerLayout />,
    children: [
      { index: true, element: <ManagerPage /> },
      ...managerSalesRoutes,
      ...managerPaymentRoutes,
      ...managerReportingRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminPage /> },
      ...adminCatalogRoutes,
      ...adminIdentityRoutes,
      ...adminSalesRoutes,
      ...plannedRoutes('admin', null),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
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
