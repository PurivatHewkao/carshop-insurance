import { httpError } from './httpError.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function invalid(field, message, issue) {
  return httpError(400, 'VALIDATION_ERROR', message, [{ field, issue }]);
}

export function requireUuid(value, field = 'id') {
  if (!UUID_PATTERN.test(String(value ?? ''))) {
    throw httpError(400, 'INVALID_ID', field + ' must be a UUID');
  }
  return String(value).toLowerCase();
}

export function optionalUuid(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (!UUID_PATTERN.test(String(value)))
    throw invalid(field, field + ' must be a UUID', 'invalid_uuid');
  return String(value).toLowerCase();
}

export function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(
      400,
      'VALIDATION_ERROR',
      'Request body must be a JSON object',
    );
  }
  return body;
}

/** Optional/required trimmed text with a max length. */
export function readText(body, field, { max, required = false }) {
  const value = body[field];
  if (value === undefined || value === null || value === '') {
    if (required) throw invalid(field, field + ' is required', 'required');
    return null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw invalid(field, field + ' must be text', 'not_text');
  }
  if (value.trim().length > max) {
    throw invalid(
      field,
      field + ' must be at most ' + max + ' characters',
      'too_long',
    );
  }
  return value.trim();
}

export function readEnum(value, field, allowed, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw invalid(field, field + ' is required', 'required');
  }
  const upper = String(value).toUpperCase();
  if (!allowed.includes(upper)) {
    throw invalid(
      field,
      field + ' must be one of ' + allowed.join(', '),
      'not_allowed',
    );
  }
  return upper;
}

/** YYYY-MM-DD that is a real calendar date. */
export function readDate(value, field, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw invalid(field, field + ' is required', 'required');
    return null;
  }
  const text = String(value);
  const date = new Date(text + 'T00:00:00Z');
  if (
    !DATE_PATTERN.test(text) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    throw invalid(
      field,
      field + ' must be a date (YYYY-MM-DD)',
      'invalid_date',
    );
  }
  return text;
}

export function readPaging(query) {
  const page = readInt(query.page, 1, 1, 100000, 'page');
  const limit = readInt(query.limit, 20, 1, 100, 'limit');
  return { page, limit, offset: (page - 1) * limit };
}

function readInt(value, fallback, min, max, field) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw httpError(
      400,
      'INVALID_QUERY',
      field + ' must be an integer between ' + min + ' and ' + max,
    );
  }
  return number;
}

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
