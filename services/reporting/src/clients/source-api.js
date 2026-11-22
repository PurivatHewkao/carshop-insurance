import { env } from '../config/env.js';

function authHeaders(req) {
  const headers = { accept: 'application/json' };
  const authorization = req.get('authorization');
  const cookie = req.get('cookie');
  if (authorization) headers.authorization = authorization;
  if (cookie) headers.cookie = cookie;
  return headers;
}

export async function getSourceJson(req, baseUrl, path, params = {}) {
  if (!baseUrl) {
    const error = new Error('Source API URL is not configured');
    error.status = 503;
    throw error;
  }
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: authHeaders(req),
      redirect: 'error',
      signal: AbortSignal.timeout(env.sourceApiTimeoutMs),
    });
  } catch {
    const error = new Error('A source service could not be reached');
    error.status = 503;
    throw error;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      response.status === 401 || response.status === 403
        ? 'Source service denied access to report data'
        : 'A source service returned an error',
    );
    error.status = response.status === 401 || response.status === 403 ? response.status : 502;
    throw error;
  }
  return payload;
}

export const getSalesData = (req, path, params) =>
  getSourceJson(req, env.salesApiUrl, path, params);
export const getPaymentData = (req, path, params) =>
  getSourceJson(req, env.paymentApiUrl, path, params);
export const getCatalogData = (req, path, params) =>
  getSourceJson(req, env.catalogApiUrl, path, params);
