import CarsPage from './pages/CarsPage.jsx';
import CarDetailPage from './pages/CarDetailPage.jsx';
import CatalogAdminPage from './pages/CatalogAdminPage.jsx';
import StockPage from './pages/StockPage.jsx';
import ToyotyStockPage from './pages/ToyotyStockPage.jsx';
import ConfiguratorAdminPage from './pages/ConfiguratorAdminPage.jsx';
import PromotionsPage from './pages/PromotionsPage.jsx';
import PromotionDetailPage from './pages/PromotionDetailPage.jsx';
import { plannedRoutes } from '../../routes/plannedRoutes.jsx';

export const catalogRoutes = [
  { path: 'catalog', element: <CarsPage /> },
  { path: 'catalog/:name', element: <CarDetailPage /> },
  { path: 'promotions/:id', element: <PromotionDetailPage /> },
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
  // Made-to-order TOYOTY cars: model × trim, production queue, production steps.
  { path: 'stock/toyoty', element: <ToyotyStockPage /> },
  // Trims, paint colours and wheels the customer can pick in the configurator.
  { path: 'cars/options', element: <ConfiguratorAdminPage /> },
];
