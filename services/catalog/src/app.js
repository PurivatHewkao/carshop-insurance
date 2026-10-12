import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import healthRoutes from './modules/health/routes.js';
import { errorHandler, notFound } from './middleware/errors.js';
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || env.corsOrigins.includes(origin));
    },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1/health', healthRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
