import { env } from '../../config/env.js';
import { fail } from './validation.js';

const name = 'carshop_identity_session';
const options = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/api/v1',
};

export function readSessionCookie(req) {
  const prefix = `${name}=`;
  return req
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export function setSessionCookie(res, token) {
  res.cookie(name, token, {
    ...options,
    maxAge: env.jwtLifetimeSeconds * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(name, options);
}

// Browser cookies are sent automatically. Check the exact Origin on writes,
// including login and registration, before acting on credentials.
export function verifyWriteOrigin(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (
    origin
      ? !env.corsOrigins.includes(origin)
      : !req.get('authorization') && readSessionCookie(req)
  ) {
    fail(403, 'FORBIDDEN_ORIGIN', 'Request origin is not allowed');
  }
  next();
}
