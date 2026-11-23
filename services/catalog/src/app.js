import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import healthRoutes from './modules/health/routes.js';
import carRoutes from './modules/cars/routes.js';
import promotionRoutes from './modules/promotions/routes.js';
import coverRoutes from './modules/covers/routes.js';
import productionRoutes from './modules/production/routes.js';
import { errorHandler, notFound } from './middleware/errors.js';
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || env.corsOrigins.includes(origin));
    },
    // The Identity session cookie must reach this service.
    credentials: true,
  }),
);
app.use(express.json({ limit: '6mb' }));
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/cars', carRoutes);
app.use('/api/v1/promotions', promotionRoutes);
app.use('/api/v1/covers', coverRoutes);
app.use('/api/v1/production', productionRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
