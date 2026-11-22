import RequireRole from '../identity/components/RequireRole.jsx';
import ActivityLogsPage from './pages/ActivityLogsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';

export const reportingRoutes = [
  {
    path: 'reporting',
    element: (
      <RequireRole roles={['manager', 'admin']}>
        <ReportsPage />
      </RequireRole>
    ),
  },
  {
    path: 'reporting/activity-logs',
    element: (
      <RequireRole roles={['manager', 'admin']}>
        <ActivityLogsPage />
      </RequireRole>
    ),
  },
];

export const managerReportingRoutes = [
  ...plannedRoutes('manager', 'reporting', {
    'reports/insurance': <ReportsPage />,
  }),
  { path: 'activity-logs', element: <ActivityLogsPage /> },
];
