import 'dotenv/config';
import { randomBytes } from 'node:crypto';

const configuredSecret = process.env.JWT_SECRET;
if (configuredSecret && Buffer.byteLength(configuredSecret) < 32)
  throw new Error('JWT_SECRET must be at least 32 bytes');
if (process.env.NODE_ENV === 'production' && !configuredSecret)
  throw new Error('JWT_SECRET is required in production');

export const env = {
  jwtSecret: configuredSecret || randomBytes(32).toString('hex'),
  jwtIssuer: 'carshop-identity',
  jwtAudience: 'carshop-web',
  jwtLifetimeSeconds: 60 * 60,
  service: 'identity',
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
