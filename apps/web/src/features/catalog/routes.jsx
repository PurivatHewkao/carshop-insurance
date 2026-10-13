import CarsPage from './pages/CarsPage.jsx';
import CarDetailPage from './pages/CarDetailPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';
export const catalogRoutes = [
  { path: 'catalog', element: <CarsPage /> },
  { path: 'catalog/:name', element: <CarDetailPage /> },
  ...plannedRoutes('public', 'catalog'),
];
export const adminCatalogRoutes = plannedRoutes('admin', 'catalog');
