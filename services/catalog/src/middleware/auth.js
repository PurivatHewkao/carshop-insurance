// Login + role checks for Catalog. The session is verified by Identity through the
// shared packages/auth middleware; reading cars/promotions stays public.
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
