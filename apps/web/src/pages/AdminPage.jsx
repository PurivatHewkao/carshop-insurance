import DashboardPage from '../features/reporting/pages/DashboardPage.jsx';

// Dashboard ของ Admin ใช้หน้าเดียวกับ Manager (features/reporting/pages/DashboardPage.jsx)
export default function AdminPage() {
  return <DashboardPage base="/admin" breadcrumb="Workspace / ภาพรวม" />;
}
