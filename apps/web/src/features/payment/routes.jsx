import PlaceholderPage from './pages/PlaceholderPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';
export const paymentRoutes = [
  { path: 'payment', element: <PlaceholderPage /> },
];
export const customerPaymentRoutes = plannedRoutes('customer', 'payment');
export const sellerPaymentRoutes = plannedRoutes('seller', 'payment');
export const managerPaymentRoutes = plannedRoutes('manager', 'payment');
