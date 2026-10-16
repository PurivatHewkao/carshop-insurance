import PlaceholderPage from './pages/PlaceholderPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';
export const identityRoutes = [
  { path: 'identity', element: <PlaceholderPage /> },
  { path: 'login', element: <LoginPage /> },
  ...plannedRoutes('public', 'identity', { register: <RegisterPage /> }),
];
export const customerIdentityRoutes = plannedRoutes('customer', 'identity', {
  profile: <ProfilePage />,
});
export const adminIdentityRoutes = plannedRoutes('admin', 'identity', {
  users: <UsersPage />,
});
