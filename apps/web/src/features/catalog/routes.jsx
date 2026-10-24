import CarsPage from './pages/CarsPage.jsx';
import CarDetailPage from './pages/CarDetailPage.jsx';
import CatalogAdminPage from './pages/CatalogAdminPage.jsx';
import StockPage from './pages/StockPage.jsx';
import PromotionsPage from './pages/PromotionsPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';

export const catalogRoutes = [
  { path: 'catalog', element: <CarsPage /> },
  { path: 'catalog/:name', element: <CarDetailPage /> },
  ...plannedRoutes('public', 'catalog', {
    promotions: <PromotionsPage />,
  }),
];

export const adminCatalogRoutes = [
  ...plannedRoutes('admin', 'catalog', {
    cars: <CatalogAdminPage />,
    promotions: <PromotionsPage adminMode />,
  }),
  { path: 'stock', element: <StockPage /> },
];
