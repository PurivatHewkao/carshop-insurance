import PlaceholderPage from './pages/PlaceholderPage.jsx';
import RequestsPage from './pages/RequestsPage.jsx';
import PreserveLocationRedirect from '../../components/common/PreserveLocationRedirect.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';
export const salesRoutes = [
  ...plannedRoutes('public', 'sales'),
  { path: 'sales', element: <PlaceholderPage /> },
  {
    path: 'requests',
    element: <PreserveLocationRedirect to="/customer/requests" />,
  },
];
export const customerSalesRoutes = [
  { path: 'requests', element: <RequestsPage /> },
];
export const sellerSalesRoutes = plannedRoutes('seller', 'sales');
export const adminSalesRoutes = plannedRoutes('admin', 'sales');
export const managerSalesRoutes = plannedRoutes('manager', 'sales');
