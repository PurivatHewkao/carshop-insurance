import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { getPool, frontendOrigin } from './config.js';
import { ApiError, errorHandler } from './errors.js';
import { plansRouter } from './modules/plans.js';
import { purchasesRouter } from './modules/purchases.js';
import { policiesRouter } from './modules/policies.js';
// Insurance: partner purchase flow and independent NOVA administration.
import { partnerRouter } from './modules/partner.js';
import { adminRouter } from './modules/admin.js';
export function createApp({
  pool = getPool,
  origin = frontendOrigin(),
  purchaseLimit = 20,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
  app.use(helmet());
  app.use(
    cors({
      origin: (requestOrigin, callback) =>
        callback(
          requestOrigin && requestOrigin !== origin
            ? new ApiError(
                403,
                'ORIGIN_DENIED',
                'ไม่อนุญาตให้เรียกจากเว็บไซต์นี้',
              )
            : null,
          true,
        ),
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', async (_req, res) => {
    await pool().execute('SELECT 1');
    res.json({
      data: { service: 'nova-insurance', status: 'ok', database: 'connected' },
      meta: {},
    });
  });
  app.use('/api/plans', plansRouter(pool));
  // Insurance: direct purchases are closed; only authenticated carshop can submit.
  app.post('/api/purchases', (_req, _res, next) => next(new ApiError(403, 'DIRECT_PURCHASE_DISABLED', 'กรุณาซื้อประกันพร้อมรถผ่าน Seller ของ TOYOTY')));
  app.use('/api/partner', partnerRouter(pool));
  app.use('/api/admin', adminRouter(pool));
  app.use(
    '/api/purchases',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: purchaseLimit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) =>
        res
          .status(429)
          .json({
            error: {
              code: 'RATE_LIMITED',
              message: 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่',
              details: [],
            },
          }),
    }),
    purchasesRouter(pool),
  );
  app.use('/api/policies', policiesRouter(pool));
  app.use((_req, _res, next) =>
    next(new ApiError(404, 'NOT_FOUND', 'ไม่พบเส้นทางนี้')),
  );
  app.use(errorHandler);
  return app;
}
