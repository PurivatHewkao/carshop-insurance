import WorkspaceLayout from './WorkspaceLayout.jsx';
// พื้นที่ทำงานของบัญชี role finance (หน้าเดียวกับ /admin/finance ของ Admin)
const links = [
  ['/finance', 'การเงิน'],
  ['/catalog', '◇ ดูรายการรถ'],
  ['/account', '◎ บัญชีของฉัน'],
];
export default function FinanceLayout() {
  return <WorkspaceLayout role="Finance" links={links} />;
}
