export function notFound(_req, res) {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
export function errorHandler(error, _req, res, _next) {
  // Malformed JSON body from express.json()
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body is not valid JSON',
      },
    });
  }
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
  // Only errors created with httpError() (apiSafe: true) show their own message.
  const exposed = error.apiSafe === true && status < 500;
  if (status === 500) console.error(error);
  const payload = {
    error: {
      code: exposed
        ? error.code
        : status === 500
          ? 'INTERNAL_ERROR'
          : 'BAD_REQUEST',
      message: exposed
        ? error.message
        : status === 500
          ? 'Internal server error'
          : 'Invalid request',
      ...(exposed && error.details ? { details: error.details } : {}),
    },
  };
  res.status(status).json(payload);
}
