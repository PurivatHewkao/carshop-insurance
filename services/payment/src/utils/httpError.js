// Errors that are safe to show to API clients (code + message are returned as-is).
// Same shape as services/catalog/src/utils/httpError.js.
export function httpError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.apiSafe = true;
  if (details) error.details = details;
  return error;
}
