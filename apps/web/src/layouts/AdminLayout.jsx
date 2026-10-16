import WorkspaceLayout from './WorkspaceLayout.jsx';
import { pageMenu } from '../routes/pageList.js';
const links = [
  ...pageMenu('admin'),
  ['/admin/finance', 'การเงิน'],
  ['/catalog', '◇ ดูรายการรถ'],
  ['/system-status', '◉ สถานะระบบ'],
  ['/', '← กลับหน้าเว็บไซต์'],
];
export default function AdminLayout() {
  return <WorkspaceLayout role="Admin" links={links} />;
}
