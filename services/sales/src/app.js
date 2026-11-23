import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { createRequireSession } from '../../../packages/auth/index.js';
import healthRoutes from './modules/health/routes.js';
import lookupRoutes from './modules/lookups/routes.js';
import appointmentRoutes from './modules/appointments/routes.js';
import orderRoutes from './modules/orders/routes.js';
// Insurance: separate NOVA endpoints, using the existing login session.
import insuranceRoutes from './modules/insurance/routes.js';
// Insurance: server-to-server sync has its own key, separate from user sessions.
import insuranceSyncRoutes from './modules/insurance/syncRoutes.js';
import { errorHandler, notFound } from './middleware/errors.js';
const app = express();
const requireSession = createRequireSession({
  identityBaseUrl: env.identityApiUrl,
  allowedOrigins: env.corsOrigins,
});
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      callback(null, !origin || env.corsOrigins.includes(origin));
    },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/lookups', requireSession, lookupRoutes);
app.use('/api/v1/appointments', requireSession, appointmentRoutes);
app.use('/api/v1/orders', requireSession, orderRoutes);
// Insurance: ownership and roles are checked inside this router.
app.use('/api/v1/insurance', requireSession, insuranceRoutes);
// Insurance: allow NOVA Railway to trigger the durable queue on Vercel.
app.use('/api/v1/internal/insurance/sync', insuranceSyncRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
