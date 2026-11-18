import WorkspaceLayout from './WorkspaceLayout.jsx';
import { pageMenu } from '../routes/pageList.js';
const links = [
  ...pageMenu('admin'),
  ['/admin/finance', 'จัดการการเงิน'],
  ['/system-status', 'สถานะระบบ'],
  ['/', 'กลับหน้าเว็บไซต์'],
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
