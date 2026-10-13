import WorkspaceLayout from './WorkspaceLayout.jsx';
import { pageMenu } from '../routes/pageList.js';

const links = [
  ...pageMenu('manager'),
  ['/catalog', '◇ ดูรายการรถ'],
  ['/system-status', '◉ สถานะระบบ'],
  ['/', '← กลับหน้าเว็บไซต์'],
];

export default function ManagerLayout() {
  return (
    <WorkspaceLayout
      role="Manager"
      headerLabel="พื้นที่ผู้จัดการ"
      links={links}
    />
  );
}
