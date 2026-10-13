import PlaceholderPage from './pages/PlaceholderPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';
export const identityRoutes = [
  { path: 'identity', element: <PlaceholderPage /> },
  { path: 'login', element: <LoginPage /> },
  ...plannedRoutes('public', 'identity'),
];
export const customerIdentityRoutes = plannedRoutes('customer', 'identity');
export const adminIdentityRoutes = plannedRoutes('admin', 'identity');
