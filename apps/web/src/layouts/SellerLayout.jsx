import WorkspaceLayout from './WorkspaceLayout.jsx';
import { pageMenu } from '../routes/pageList.js';

export default function SellerLayout() {
  return (
    <WorkspaceLayout
      role="Seller"
      headerLabel="พื้นที่พนักงานขาย"
      links={[
        ...pageMenu('seller'),
        ['/catalog', 'ดูรายการรถ', false],
        ['/', 'กลับหน้าเว็บไซต์', true],
      ]}
    />
  );
}
