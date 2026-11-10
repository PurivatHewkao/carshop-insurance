// Errors that are safe to show to API clients (code + message are returned as-is).
export function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.apiSafe = true;
  return error;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value, label = 'id') {
  if (!UUID_PATTERN.test(String(value))) {
    throw httpError(400, 'INVALID_ID', label + ' must be a UUID');
  }
  return String(value).toLowerCase();
}
