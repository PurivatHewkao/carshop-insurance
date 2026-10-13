// Source: Car Shop > Page List, read 2026-10-13. URL slugs are project conventions.
// null feature means ownership is not assigned in the team's frontend list yet.
export const pageList = [
  {
    role: 'public',
    path: '',
    title: 'หน้าแรก',
    feature: 'reporting',
    ready: true,
  },
  {
    role: 'public',
    path: 'catalog',
    title: 'รายการรถ',
    feature: 'catalog',
    ready: true,
  },
  { role: 'public', path: 'promotions', title: 'โปรโมชัน', feature: 'catalog' },
  { role: 'public', path: 'contact', title: 'ติดต่อเรา', feature: 'sales' },
  {
    role: 'public',
    path: 'login',
    title: 'ล็อกอิน / สมัครสมาชิก',
    feature: 'identity',
    ready: true,
    menu: false,
  },
  {
    role: 'public',
    path: 'register',
    title: 'สมัครสมาชิก',
    feature: 'identity',
    menu: false,
    secondary: true,
  },
  {
    role: 'customer',
    path: 'requests',
    title: 'ส่งคำขอ',
    feature: 'sales',
    ready: true,
  },
  {
    role: 'customer',
    path: 'transactions',
    title: 'ประวัติธุรกรรม',
    feature: 'payment',
  },
  { role: 'customer', path: 'insurance', title: 'ประกันของฉัน', feature: null },
  { role: 'customer', path: 'profile', title: 'โปรไฟล์', feature: 'identity' },
  { role: 'seller', path: 'tasks', title: 'งานของฉัน', feature: 'sales' },
  {
    role: 'seller',
    path: 'customers/:customerId',
    title: 'รายละเอียดลูกค้า',
    feature: 'sales',
    menu: false,
  },
  {
    role: 'seller',
    path: 'orders/new',
    title: 'สร้างฟอร์มขาย',
    feature: 'sales',
  },
  {
    role: 'seller',
    path: 'appointments',
    title: 'นัดหมายของฉัน',
    feature: 'sales',
  },
  {
    role: 'seller',
    path: 'finance',
    title: 'ติดต่อการเงิน',
    feature: 'payment',
  },
  {
    role: 'admin',
    path: '',
    title: 'Dashboard',
    feature: 'reporting',
    ready: true,
  },
  { role: 'admin', path: 'cars', title: 'จัดการรถ', feature: 'catalog' },
  {
    role: 'admin',
    path: 'promotions',
    title: 'จัดการโปรโมชัน',
    feature: 'catalog',
  },
  {
    role: 'admin',
    path: 'requests',
    title: 'กล่องคำขอลูกค้า',
    feature: 'sales',
  },
  { role: 'admin', path: 'users', title: 'จัดการผู้ใช้', feature: 'identity' },
  {
    role: 'admin',
    path: 'insurance-packages',
    title: 'จัดการแพ็กเกจประกัน',
    feature: null,
  },
  {
    role: 'manager',
    path: '',
    title: 'Dashboard',
    feature: 'reporting',
    ready: true,
  },
  {
    role: 'manager',
    path: 'assignments',
    title: 'มอบหมาย Seller',
    feature: 'sales',
  },
  {
    role: 'manager',
    path: 'approvals',
    title: 'อนุมัติธุรกรรม',
    feature: 'sales',
  },
  {
    role: 'manager',
    path: 'invoices',
    title: 'ออกบิลส่งการเงิน',
    feature: 'payment',
  },
  {
    role: 'manager',
    path: 'appointments',
    title: 'ภาพรวมนัดหมาย',
    feature: 'sales',
  },
  {
    role: 'manager',
    path: 'reports/insurance',
    title: 'รายงานประกัน / referral',
    feature: 'reporting',
  },
];

export function pageUrl(page) {
  return (
    '/' +
    [page.role === 'public' ? '' : page.role, page.path]
      .filter(Boolean)
      .join('/')
  );
}

export function pageMenu(role) {
  return pageList
    .filter((page) => page.role === role && page.menu !== false)
    .map((page) => [pageUrl(page), page.title, page.path === '']);
}
