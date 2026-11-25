import WorkspaceLayout from './WorkspaceLayout.jsx';
import { pageMenu } from '../routes/pageList.js';
import { reportLinks } from '../features/reporting/components/reportLinks.js';
const links = [
  ...pageMenu('admin'),
  ['/admin/finance', 'จัดการการเงิน'],
  ['/admin/deliveries', 'ยืนยันส่งมอบรถ'],
  ...reportLinks('/admin'),
  ['/system-status', 'สถานะระบบ'],
];
export default function AdminLayout() {
  return (
    <WorkspaceLayout
      role="Admin"
      headerLabel="พื้นที่ผู้ดูแลระบบ"
      links={links}
    />
  );
}
