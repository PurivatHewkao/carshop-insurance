import WorkspaceLayout from './WorkspaceLayout.jsx';
import { pageMenu } from '../routes/pageList.js';
import { reportLinks } from '../features/reporting/components/reportLinks.js';

// Report pages are secondary pages (not in the Google Docs Page List counts),
// so they are added here instead of pageList.js.
const links = [...pageMenu('manager'), ...reportLinks('/manager')];

export default function ManagerLayout() {
  return (
    <WorkspaceLayout
      role="Manager"
      headerLabel="พื้นที่ผู้จัดการ"
      links={links}
    />
  );
}
