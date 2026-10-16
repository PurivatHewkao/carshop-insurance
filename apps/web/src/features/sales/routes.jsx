// apps/web/src/features/sales/routes.jsx
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import PreserveLocationRedirect from '../../components/common/PreserveLocationRedirect.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';

import CustomerRequestsPage from './pages/CustomerRequestsPage.jsx';
import AdminRequestsPage from './pages/AdminRequestsPage.jsx';
import ManagerAssignmentsPage from './pages/ManagerAssignmentsPage.jsx';
import SellerTasksPage from './pages/SellerTasksPage.jsx';
import SellerOrdersPage from './pages/SellerOrdersPage.jsx';
import ManagerApprovalsPage from './pages/ManagerApprovalsPage.jsx';
import SellerSalesFormPage from './pages/SellerSalesFormPage.jsx';
import SellerAppointmentsPage from './pages/SellerAppointmentsPage.jsx'; // 1. นำเข้าหน้านัดหมายเฉพาะ Seller

function mergeWithPlanned(role, customRoutes) {
  const planned = plannedRoutes(role, 'sales') || [];
  const customMap = new Map(customRoutes.map((r) => [r.path, r]));

  const updated = planned.map((item) =>
    customMap.has(item.path) ? customMap.get(item.path) : item
  );

  const plannedPaths = new Set(planned.map((item) => item.path));
  for (const route of customRoutes) {
    if (!plannedPaths.has(route.path)) {
      updated.push(route);
    }
  }

  return updated;
}

export const salesRoutes = [
  ...plannedRoutes('public', 'sales'),
  { path: 'sales', element: <SellerSalesFormPage /> },
  {
    path: 'requests',
    element: <PreserveLocationRedirect to="/customer/requests" />,
  },
];

export const customerSalesRoutes = mergeWithPlanned('customer', [
  { path: 'requests', element: <CustomerRequestsPage /> },
  { path: 'appointments', element: <CustomerRequestsPage /> },
]);

// 2. แยกหน้างานของฉัน (tasks) และหน้านัดหมายของฉัน (appointments) ให้ไม่เหมือนกัน
export const sellerSalesRoutes = mergeWithPlanned('seller', [
  { path: 'tasks', element: <SellerTasksPage /> },                     // งานของ Seller (จัดการเคส & สถานะงาน)
  { path: 'appointments', element: <SellerAppointmentsPage /> },       // นัดหมายของ Seller (ตารางคิว & เวลา)
  { path: 'orders', element: <SellerOrdersPage /> },
  { path: 'orders/new', element: <SellerSalesFormPage /> },
  { path: 'sales', element: <SellerSalesFormPage /> },
]);

export const adminSalesRoutes = mergeWithPlanned('admin', [
  { path: 'requests', element: <AdminRequestsPage /> },
]);

export const managerSalesRoutes = mergeWithPlanned('manager', [
  { path: 'assignments', element: <ManagerAssignmentsPage /> },
  { path: 'approvals', element: <ManagerApprovalsPage /> },
]);