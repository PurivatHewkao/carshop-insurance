export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(error, _req, res, _next) {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  const code = status === 500 ? 'INTERNAL_ERROR'
    : status === 502 || status === 503 ? 'SOURCE_SERVICE_UNAVAILABLE'
      : status === 401 ? 'UNAUTHORIZED'
        : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST';
  const message = status === 500 ? 'Internal server error'
    : status === 502 || status === 503 ? 'ไม่สามารถดึงข้อมูลจากบริการต้นทางได้ กรุณาลองอีกครั้ง'
      : status === 401 ? 'กรุณาเข้าสู่ระบบใหม่'
        : status === 403 ? 'บัญชีนี้ไม่มีสิทธิ์ดูรายงาน'
          : 'Invalid request';
  // publicMessage is set only by our own code for safe, user-facing errors.
  res.status(status).json({ error: { code, message: error.publicMessage || message } });
}
