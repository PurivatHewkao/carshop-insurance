import { httpError } from '../../utils/httpError.js';
import { partnerEndpoint } from '../../../../../packages/insurance/index.js';
import { ratingModels } from '../../../../../packages/insurance/rating.js';

// A booking has no physical car yet. Ask Catalog to validate and price the
// selection without reserving inventory or trusting the browser's price.
export async function insuranceConfiguration(input, fetcher = fetch) {
  const selection = {};
  for (const field of ['modelSlug', 'trim', 'colorId', 'wheelId']) {
    if (
      typeof input?.[field] !== 'string' ||
      !input[field].trim() ||
      input[field].length > 60
    )
      throw httpError(
        400,
        'INVALID_CONFIGURATION',
        'เลือกรุ่นรถ รุ่นย่อย สี และล้อให้ครบก่อนขอราคาประกัน',
      );
    selection[field] = input[field].trim();
  }
  if (!process.env.CATALOG_API_URL)
    throw httpError(
      503,
      'CATALOG_NOT_CONFIGURED',
      'ยังไม่ได้ตั้งค่าการเชื่อม Catalog',
    );
  try {
    const response = await fetcher(
      partnerEndpoint(process.env.CATALOG_API_URL, 'cars/quote'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(selection),
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      if ([400, 404, 422].includes(response.status))
        throw httpError(
          400,
          'INVALID_CONFIGURATION',
          'สเปกรถที่เลือกไม่พร้อมขาย กรุณาเลือกใหม่',
        );
      throw new Error('Catalog quote unavailable');
    }
    const q = result.data;
    const model = ratingModels.find((item) => item.slug === q?.modelSlug);
    if (!model)
      throw httpError(
        400,
        'UNSUPPORTED_INSURANCE_VEHICLE',
        'รถรุ่นนี้ยังไม่อยู่ในรายการรับประกัน NOVA',
      );
    const year = Number(q.estimatedReady?.from?.slice(0, 4));
    if (
      !Number.isSafeInteger(Number(q.total)) ||
      Number(q.total) <= 0 ||
      !Number.isInteger(year) ||
      year < 2025 ||
      year > 2027
    )
      throw new Error('Invalid Catalog quote');
    return {
      modelSlug: model.slug,
      modelName: model.name,
      trimCode: q.trim,
      vehicleValue: Number(q.total),
      year,
    };
  } catch (error) {
    if (error.apiSafe) throw error;
    throw httpError(
      503,
      'CATALOG_UNAVAILABLE',
      'อ่านราคาสเปกรถจาก Catalog ไม่สำเร็จ กรุณาลองใหม่',
    );
  }
}
