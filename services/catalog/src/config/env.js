import 'dotenv/config';
export const env = {
  service: 'catalog',
  port: Number(process.env.PORT || 3002),
  nodeEnv: process.env.NODE_ENV || 'development',
  identityApiUrl:
    process.env.IDENTITY_API_URL || 'http://localhost:3001/api/v1',
  // Shared with Sales only (server side). Empty = internal calls must use a login session.
  internalSecret: process.env.CATALOG_INTERNAL_SECRET || '',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
