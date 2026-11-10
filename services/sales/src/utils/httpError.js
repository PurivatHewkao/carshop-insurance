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

export function isUuid(value) {
  return UUID_PATTERN.test(String(value));
}

export function requireUuid(value, label = 'id') {
  if (!isUuid(value)) {
    throw httpError(400, 'INVALID_ID', label + ' must be a UUID');
  }
  return String(value).toLowerCase();
}

export function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'INVALID_BODY', 'Request body must be a JSON object');
  }
  return body;
}

export function requireEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw httpError(
      400,
      'INVALID_' + label.toUpperCase(),
      label + ' must be one of: ' + allowed.join(', '),
    );
  }
  return value;
}

// Optional text: undefined/null/'' -> null, otherwise trimmed and length-checked.
export function readOptionalText(value, label, max) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw httpError(
      400,
      'INVALID_' + label.toUpperCase(),
      label + ' must be text of at most ' + max + ' characters',
    );
  }
  return value.trim() || null;
}
