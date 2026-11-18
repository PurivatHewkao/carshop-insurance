import PlaceholderPage from './pages/PlaceholderPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import {
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/PasswordRecovery.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';
export const identityRoutes = [
  { path: 'identity', element: <PlaceholderPage /> },
  { path: 'login', element: <LoginPage /> },
  { path: 'forgot-password', element: <ForgotPasswordPage /> },
  { path: 'reset-password', element: <ResetPasswordPage /> },
  ...plannedRoutes('public', 'identity', { register: <RegisterPage /> }),
];
export const customerIdentityRoutes = plannedRoutes('customer', 'identity', {
  profile: <ProfilePage />,
});
export const adminIdentityRoutes = plannedRoutes('admin', 'identity', {
  users: <UsersPage />,
});
