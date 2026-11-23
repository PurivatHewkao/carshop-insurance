// Insurance: Railway stays running, while Sales on Vercel runs only per request.
import { partnerEndpoint } from '../../../../packages/insurance/index.js';
export async function triggerCarshopSync({ baseUrl, key, fetcher = fetch }) {
  if (!key || key.length < 32) throw new Error('Invalid insurance sync key');
  const response = await fetcher(
    partnerEndpoint(baseUrl, 'internal/insurance/sync'),
    {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    },
  );
  try {
    if (!response.ok) throw new Error(`Insurance sync HTTP ${response.status}`);
    const result = await response.json();
    if (result.data?.checked !== true)
      throw new Error('Invalid insurance sync response');
  } finally {
    if (!response.bodyUsed) await response.body?.cancel();
  }
}
export function startCarshopSync() {
  const baseUrl = process.env.CARSHOP_SALES_API_URL;
  const key = process.env.NOVA_PARTNER_KEY;
  if (!baseUrl || !key) return () => {};
  partnerEndpoint(baseUrl, 'internal/insurance/sync');
  let stopped = false;
  let timer;
  const tick = async () => {
    try {
      await triggerCarshopSync({ baseUrl, key });
    } catch {
      console.error('Insurance: carshop sync unavailable');
    }
    if (!stopped) {
      timer = setTimeout(tick, 5000);
      timer.unref();
    }
  };
  void tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
