// Insurance: server-only NOVA API. No secret is sent to React.
import { httpError } from '../../utils/httpError.js';
import {
  partnerEndpoint,
  signQuote,
  verifyQuote,
} from '../../../../../packages/insurance/index.js';
import { rateVehicle } from '../../../../../packages/insurance/rating.js';

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
    if (response.status === 401)
      throw httpError(
        503,
        'NOVA_PARTNER_UNAUTHORIZED',
        'คีย์เชื่อมต่อ NOVA ไม่ตรงกับระบบประกัน กรุณาตรวจ NOVA_PARTNER_KEY ของ Sales',
      );
    if (!response.ok || !result.data) throw new Error('NOVA rejected request');
    return result.data;
  } catch (error) {
    if (error.apiSafe) throw error;
    throw httpError(
      503,
      'NOVA_UNAVAILABLE',
      'ติดต่อ NOVA ไม่สำเร็จ กรุณาลองอีกครั้ง',
    );
  }
}
export async function novaPlans(vehicle) {
  const plans = await novaRequest('plans');
  if (!vehicle) return plans;
  return ratePartnerPlans(plans, vehicle, process.env.NOVA_PARTNER_KEY);
}
export function ratePartnerPlans(plans, vehicle, secret) {
  return plans.map((plan) => {
    let signed;
    try {
      signed = verifyQuote(plan.quoteToken, secret);
    } catch {
      throw httpError(
        503,
        'NOVA_INVALID_QUOTE',
        'ตรวจสอบแผนประกันจาก NOVA ไม่สำเร็จ',
      );
    }
    let rated;
    try {
      rated = { ...signed, ...rateVehicle(vehicle, signed.slug, 'toyoty') };
    } catch (error) {
      throw httpError(400, 'UNSUPPORTED_INSURANCE_VEHICLE', error.message);
    }
    return { ...rated, quoteToken: signQuote(rated, secret) };
  });
}
