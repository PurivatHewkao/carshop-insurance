import CarsPage from './pages/CarsPage.jsx';
import CarDetailPage from './pages/CarDetailPage.jsx';
export const catalogRoutes = [
  { path: 'catalog', element: <CarsPage /> },
  { path: 'catalog/:name', element: <CarDetailPage /> },
];
