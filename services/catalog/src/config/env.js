import 'dotenv/config';
export const env = {
  service: 'catalog',
  port: Number(process.env.PORT || 3002),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
