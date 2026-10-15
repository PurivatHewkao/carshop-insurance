import PlaceholderPage from './pages/PlaceholderPage.jsx';
import CustomerTransactionsPage from './pages/CustomerTransactionsPage.jsx';
import SellerFinancePage from './pages/SellerFinancePage.jsx';
import ManagerInvoicesPage from './pages/ManagerInvoicesPage.jsx';
import AdminFinancePage from './pages/AdminFinancePage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';
export const paymentRoutes = [
  { path: 'payment', element: <PlaceholderPage /> },
];
export const customerPaymentRoutes = plannedRoutes('customer', 'payment', {
  transactions: <CustomerTransactionsPage />,
});
export const sellerPaymentRoutes = plannedRoutes('seller', 'payment', {
  finance: <SellerFinancePage />,
});
export const managerPaymentRoutes = plannedRoutes('manager', 'payment', {
  invoices: <ManagerInvoicesPage />,
});
// Admin รับงานฝ่ายการเงิน (ตกลงในกลุ่ม ๑๓ ต.ค.) — ไม่อยู่ใน Page List ของ Doc จึงเป็น route เสริม
export const adminPaymentRoutes = [
  { path: 'finance', element: <AdminFinancePage /> },
];
