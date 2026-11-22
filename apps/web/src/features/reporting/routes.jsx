import RequireRole from '../identity/components/RequireRole.jsx';
import ActivityLogsPage from './pages/ActivityLogsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';

// Report pages: all, sales & orders, finance, cars & stock, activity history.
// `base` makes the tab links stay inside the current workspace.
function reportPages(base, reportsPath) {
  return [
    { path: reportsPath, element: <ReportsPage view="all" base={base} /> },
    { path: `${reportsPath}/sales`, element: <ReportsPage view="sales" base={base} /> },
    { path: `${reportsPath}/finance`, element: <ReportsPage view="finance" base={base} /> },
    { path: `${reportsPath}/inventory`, element: <ReportsPage view="inventory" base={base} /> },
  ];
}

const guard = (route) => ({
  ...route,
  element: <RequireRole roles={['manager', 'admin']}>{route.element}</RequireRole>,
});

// Public layout: /reporting/... (manager or admin only).
export const reportingRoutes = [
  ...reportPages('', 'reporting'),
  { path: 'reporting/activity-logs', element: <ActivityLogsPage base="" /> },
].map(guard);

// Inside /manager (the layout already requires the manager role).
export const managerReportingRoutes = [
  ...plannedRoutes('manager', 'reporting', {
    'reports/insurance': <ReportsPage view="all" base="/manager" />,
  }),
  ...reportPages('/manager', 'reports'),
  { path: 'activity-logs', element: <ActivityLogsPage base="/manager" /> },
];

// Inside /admin (the layout already requires the admin role).
export const adminReportingRoutes = [
  ...reportPages('/admin', 'reports'),
  { path: 'activity-logs', element: <ActivityLogsPage base="/admin" /> },
];
