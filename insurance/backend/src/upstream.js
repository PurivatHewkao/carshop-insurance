import { ApiError } from './errors.js';

// Development gateway: keep the production database private and authenticate
// against the existing NOVA API. Never fall back to an unrelated local database.
export function createUpstream(apiUrl, fetcher = fetch) {
  const url = new URL(apiUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, '') !== '/api'
  )
    throw new Error(
      'NOVA_UPSTREAM_API_URL must be an HTTPS /api URL without credentials',
    );
  const base = url.href.replace(/\/$/, '');
  async function send(path, options = {}) {
    try {
      const response = await fetcher(base + path, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      return { response, body: await response.json() };
    } catch {
      throw new ApiError(
        502,
        'NOVA_UPSTREAM_UNAVAILABLE',
        'เชื่อมต่อระบบ NOVA จริงไม่สำเร็จ กรุณาลองใหม่',
      );
    }
  }
  return {
    origin: url.origin,
    async loadPlans() {
      const { response, body } = await send('/plans');
      if (!response.ok || !Array.isArray(body.data))
        throw new ApiError(
          502,
          'NOVA_UPSTREAM_UNAVAILABLE',
          'อ่านแผนประกันจากระบบ NOVA จริงไม่สำเร็จ',
        );
      return body.data.map((plan) => ({
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        insurance_type: plan.insuranceType,
        description: plan.description,
        premium_amount: plan.premiumAmount,
        coverage: plan.coverage,
        is_recommended: plan.isRecommended,
      }));
    },
    async proxy(req, res) {
      const headers = { Accept: 'application/json' };
      if (req.get('authorization'))
        headers.Authorization = req.get('authorization');
      const hasBody =
        !['GET', 'HEAD'].includes(req.method) && req.body !== undefined;
      if (hasBody) headers['Content-Type'] = 'application/json';
      const { response, body } = await send(
        req.originalUrl.slice('/api'.length),
        {
          method: req.method,
          headers,
          ...(hasBody ? { body: JSON.stringify(req.body) } : {}),
        },
      );
      const retry = response.headers.get('retry-after');
      if (retry) res.set('Retry-After', retry);
      if (req.path === '/health' && response.ok)
        body.meta = {
          ...body.meta,
          dataSource: 'production-api',
          upstream: url.origin,
        };
      res.status(response.status).json(body);
    },
  };
}
