import PlaceholderPage from './pages/PlaceholderPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';
export const reportingRoutes = [
  { path: 'reporting', element: <PlaceholderPage /> },
];
export const managerReportingRoutes = plannedRoutes('manager', 'reporting');
