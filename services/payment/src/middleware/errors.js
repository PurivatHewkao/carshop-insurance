export function notFound(_req, res) {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
export function errorHandler(error, _req, res, _next) {
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
  const payload = {
    error: {
      code: status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
      message: status === 500 ? 'Internal server error' : 'Invalid request',
    },
  };
  res.status(status).json(payload);
}
