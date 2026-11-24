// Login + role checks for Catalog. The session is verified by Identity through the
// shared packages/auth middleware; reading cars/promotions stays public.
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  createRequireSession,
  requireRoles,
} from '../../../../packages/auth/index.js';
import { env } from '../config/env.js';

export { requireRoles };

// Who may change cars, stock, photos and promotions (permission matrix to confirm with the team).
export const CATALOG_EDITORS = ['admin', 'stock'];
// Who may read the admin stock summary.
export const CATALOG_STAFF = ['admin', 'stock', 'manager'];

export const requireSession = createRequireSession({
  identityBaseUrl: env.identityApiUrl,
  allowedOrigins: env.corsOrigins,
  timeoutMs: 3000,
});

/** requireSession + requireRoles in one array, for use as route middleware. */
export const staffOnly = (...roles) => [requireSession, requireRoles(...roles)];

function sameSecret(given, expected) {
  // Hash both sides so the comparison takes the same time whatever the length.
  const a = createHash('sha256').update(String(given)).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * For calls from another service (Sales creating / releasing a made-to-order car):
 * a matching X-Internal-Secret header (CATALOG_INTERNAL_SECRET, server side only) is
 * enough; otherwise the caller needs a login session with one of `roles`.
 */
export function internalOr(...roles) {
  const sessionCheck = staffOnly(...roles);
  return function internalOrSession(req, res, next) {
    const given = req.get('x-internal-secret');
    if (env.internalSecret && given && sameSecret(given, env.internalSecret)) {
      req.internalCall = true;
      return next();
    }
    let index = 0;
    const step = (error) => {
      if (error) return next(error);
      const middleware = sessionCheck[index];
      index += 1;
      return middleware ? middleware(req, res, step) : next();
    };
    return step();
  };
}
