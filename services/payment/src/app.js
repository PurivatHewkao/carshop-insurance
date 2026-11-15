import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import healthRoutes from './modules/health/routes.js';
import paymentRoutes from './modules/payments/routes.js';
import refundRoutes from './modules/refunds/routes.js';
import invoiceRoutes from './modules/invoices/routes.js';
import ledgerRoutes from './modules/ledger/routes.js';
import financeRequestRoutes from './modules/finance-requests/routes.js';
import { loadActor, requireSession } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    // Exact origins only; credentials so the Identity session cookie is sent.
    origin(origin, callback) {
      callback(null, !origin || env.corsOrigins.includes(origin));
    },
    credentials: true,
    exposedHeaders: ['Idempotent-Replayed'],
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1/health', healthRoutes); // public
// Everything below needs a logged-in user (checked by Identity).
app.use('/api/v1', requireSession, loadActor);
app.use('/api/v1', ledgerRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', refundRoutes);
app.use('/api/v1', invoiceRoutes);
app.use('/api/v1', financeRequestRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
