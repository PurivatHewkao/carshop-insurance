import DashboardPage from '../features/reporting/pages/DashboardPage.jsx';

// Dashboard ของ Manager ใช้หน้าเดียวกับ Admin (features/reporting/pages/DashboardPage.jsx)
export default function ManagerPage() {
  return <DashboardPage base="/manager" breadcrumb="Workspace / ผู้จัดการ" />;
}
