import PlannedPage from '../components/common/PlannedPage.jsx';
import { pageList } from './pageList.js';

// Feature owners replace the planned element with their real page when ready.
// Both relative child paths and menu links come from the same Page List registry.
export function plannedRoutes(role, feature, pages = {}) {
  return pageList
    .filter(
      (page) => page.role === role && page.feature === feature && !page.ready,
    )
    .map((page) => ({
      path: page.path,
      element: pages[page.path] ?? <PlannedPage page={page} />,
    }));
}
