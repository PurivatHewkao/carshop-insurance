import 'dotenv/config';
export const env = {
  service: 'payment',
  port: Number(process.env.PORT || 3004),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
