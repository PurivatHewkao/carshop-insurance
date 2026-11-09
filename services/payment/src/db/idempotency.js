import { createHash } from 'node:crypto';
import { httpError } from '../utils/httpError.js';

const KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,100}$/;

/** Reads the Idempotency-Key header (required on create endpoints). */
export function readIdempotencyKey(req) {
  const key = req.get('Idempotency-Key');
  if (!key) {
    throw httpError(
      400,
      'IDEMPOTENCY_KEY_REQUIRED',
      'Header Idempotency-Key is required (8-100 chars: letters, digits, _ . : -)',
    );
  }
  if (!KEY_PATTERN.test(key)) {
    throw httpError(
      400,
      'INVALID_IDEMPOTENCY_KEY',
      'Idempotency-Key must be 8-100 chars of letters, digits, _ . : -',
    );
  }
  return key;
}

export function hashRequest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/**
 * Claim a key inside the caller's transaction.
 * Returns null when the key is new (caller continues and later calls saveResponse),
 * or { statusCode, body } when this exact request already succeeded (replay).
 * The claim row is rolled back with the transaction if the request fails,
 * so a failed request can be retried with the same key.
 */
export async function claimKey(connection, scope, key, requestHash) {
  try {
    await connection.query(
      'INSERT INTO payment_idempotency_keys (scope, idem_key, request_hash) VALUES (?, ?, ?)',
      [scope, key, requestHash],
    );
    return null;
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error;
  }
  const [rows] = await connection.query(
    'SELECT request_hash, status_code, response_body FROM payment_idempotency_keys WHERE scope = ? AND idem_key = ?',
    [scope, key],
  );
  const row = rows[0];
  if (!row || row.status_code === null) {
    throw httpError(
      409,
      'REQUEST_IN_PROGRESS',
      'A request with this Idempotency-Key is still running',
    );
  }
  if (row.request_hash !== requestHash) {
    throw httpError(
      422,
      'IDEMPOTENCY_KEY_REUSED',
      'This Idempotency-Key was already used with a different request',
    );
  }
  const body =
    typeof row.response_body === 'string'
      ? JSON.parse(row.response_body)
      : row.response_body;
  return { statusCode: row.status_code, body };
}

export async function saveResponse(
  connection,
  scope,
  key,
  { resourceId, statusCode, body },
) {
  await connection.query(
    'UPDATE payment_idempotency_keys SET resource_id = ?, status_code = ?, response_body = ? WHERE scope = ? AND idem_key = ?',
    [resourceId, statusCode, JSON.stringify(body), scope, key],
  );
}
