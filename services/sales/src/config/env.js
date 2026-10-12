import 'dotenv/config';
export const env = {
  service: 'sales',
  port: Number(process.env.PORT || 3003),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
