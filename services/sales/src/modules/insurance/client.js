// Insurance: server-only NOVA API. No secret is sent to React.
import { httpError } from '../../utils/httpError.js';
import { partnerEndpoint } from '../../../../../packages/insurance/index.js';

export async function novaRequest(path, body) {
  const secret = process.env.NOVA_PARTNER_KEY;
  if (!secret || secret.length < 32 || !process.env.NOVA_API_URL)
    throw httpError(
      503,
      'NOVA_NOT_CONFIGURED',
      'ยังไม่ได้ตั้งค่าการเชื่อมต่อ NOVA',
    );
  let response;
  try {
    response = await fetch(
      partnerEndpoint(process.env.NOVA_API_URL, `partner/${path}`),
      {
        method: body ? 'POST' : 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    const result = await response.json();
    if (!response.ok || !result.data) throw new Error('NOVA rejected request');
    return result.data;
  } catch {
    throw httpError(
      503,
      'NOVA_UNAVAILABLE',
      'ติดต่อ NOVA ไม่สำเร็จ กรุณาลองอีกครั้ง',
    );
  }
}
export const novaPlans = () => novaRequest('plans');
