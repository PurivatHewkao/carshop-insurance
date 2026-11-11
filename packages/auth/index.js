// Identity remains the authority for JWT signatures, revocation and current roles.
export const SESSION_COOKIE_NAME = 'carshop_identity_session';
const roles = new Set([
  'customer',
  'seller',
  'manager',
  'admin',
  'finance',
  'stock',
]);
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

function reject(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function readCredential(req) {
  const authorization = req.get('authorization');
  if (authorization !== undefined) {
    return {
      token: /^Bearer ([^\s]+)$/i.exec(authorization)?.[1],
      viaCookie: false,
    };
  }
  const cookies = (req.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return {
    token:
      cookies.length === 1
        ? cookies[0].slice(SESSION_COOKIE_NAME.length + 1)
        : undefined,
    viaCookie: true,
  };
}

function identityEndpoint(base) {
  const url = new URL(base);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, '') !== '/api/v1'
  )
    throw new Error(
      'identityBaseUrl must be an HTTPS /api/v1 URL (HTTP allowed only on loopback)',
    );
  return `${url.origin}/api/v1/users/me`;
}

/** Express middleware. Configure the Identity URL on the server, never from request input. */
export function createRequireSession({
  identityBaseUrl,
  allowedOrigins = [],
  timeoutMs = 3000,
}) {
  const endpoint = identityEndpoint(identityBaseUrl);
  if (
    !Array.isArray(allowedOrigins) ||
    allowedOrigins.some((origin) => {
      try {
        return new URL(origin).origin !== origin || origin === 'null';
      } catch {
        return true;
      }
    })
  )
    throw new Error('allowedOrigins must contain exact URL origins');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000)
    throw new Error('timeoutMs must be between 1 and 30000');
  const origins = new Set(allowedOrigins);

  return async function requireSession(req, res, next) {
    res.set('Cache-Control', 'no-store');
    // Never accept identity supplied by a body, query parameter or X-User-* header.
    delete req.user;
    delete req.auth;
    const { token, viaCookie } = readCredential(req);
    if (!token || token.length > 8192 || /\s/.test(token))
      return reject(res, 401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');

    if (!safeMethods.has(req.method)) {
      const origin = req.get('origin');
      if ((origin && !origins.has(origin)) || (!origin && viaCookie))
        return reject(
          res,
          403,
          'FORBIDDEN_ORIGIN',
          'Request origin is not allowed',
        );
    }

    let user;
    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 401) {
        await response.body?.cancel();
        return reject(
          res,
          401,
          'INVALID_TOKEN',
          'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
        );
      }
      if (response.status !== 200) {
        await response.body?.cancel();
        throw new Error('Identity unavailable');
      }
      const data = (await response.json())?.data;
      if (
        !data ||
        typeof data.id !== 'string' ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.id) ||
        !roles.has(data.role) ||
        data.status !== 'active'
      )
        throw new Error('Invalid Identity response');
      user = Object.freeze({
        id: data.id,
        role: data.role,
        status: data.status,
      });
    } catch {
      // Fail closed: an outage must never grant access or be mistaken for logout.
      return reject(
        res,
        503,
        'IDENTITY_UNAVAILABLE',
        'ไม่สามารถตรวจสอบเซสชันได้ กรุณาลองอีกครั้ง',
      );
    }
    req.user = user;
    req.auth = Object.freeze({ user, viaCookie });
    return next();
  };
}

/** Use after requireSession. No implicit admin override. Ownership is checked by the service. */
export function requireRoles(...allowedRoles) {
  if (!allowedRoles.length || allowedRoles.some((role) => !roles.has(role)))
    throw new Error('requireRoles needs at least one supported role');
  return function checkRole(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (!req.auth?.user)
      return reject(res, 401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
    if (!allowedRoles.includes(req.auth.user.role))
      return reject(res, 403, 'FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์ดำเนินการ');
    return next();
  };
}
