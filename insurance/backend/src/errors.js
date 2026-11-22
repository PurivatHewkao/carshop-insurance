export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
export const notFound = () =>
  new ApiError(404, 'PLAN_NOT_FOUND', 'ไม่พบแผนประกันที่เปิดให้เลือก');
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError)
    return res
      .status(err.status)
      .json({
        error: { code: err.code, message: err.message, details: err.details },
      });
  if (err.type === 'entity.too.large')
    return res
      .status(413)
      .json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'ข้อมูลมีขนาดใหญ่เกินไป',
          details: [],
        },
      });
  if (err.type === 'entity.parse.failed')
    return res
      .status(400)
      .json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'รูปแบบ JSON ไม่ถูกต้อง',
          details: [],
        },
      });
  console.error('Insurance API error:', err.code || err.name);
  return res
    .status(503)
    .json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'ระบบไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง',
        details: [],
      },
    });
}
