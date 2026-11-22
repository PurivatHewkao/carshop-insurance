import 'dotenv/config';
export const env = {
  service: 'reporting',
  port: Number(process.env.PORT || 3005),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  identityApiUrl: process.env.IDENTITY_API_URL || 'http://localhost:3001/api/v1',
  salesApiUrl: process.env.SALES_API_URL || 'http://localhost:3003/api/v1',
  paymentApiUrl: process.env.PAYMENT_API_URL || 'http://localhost:3004/api/v1',
  catalogApiUrl: process.env.CATALOG_API_URL || 'http://localhost:3002/api/v1',
  sourceApiTimeoutMs: Number(process.env.SOURCE_API_TIMEOUT_MS || 5000),
};
