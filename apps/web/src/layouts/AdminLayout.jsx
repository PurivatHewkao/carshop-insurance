import WorkspaceLayout from './WorkspaceLayout.jsx';
import { pageMenu } from '../routes/pageList.js';
const links = [
  ...pageMenu('admin'),
  ['/catalog', '◇ ดูรายการรถ'],
  ['/system-status', '◉ สถานะระบบ'],
  ['/', '← กลับหน้าเว็บไซต์'],
];
export default function AdminLayout() {
  return <WorkspaceLayout role="Admin" links={links} />;
}
