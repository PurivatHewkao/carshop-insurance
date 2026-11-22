// Insurance: shared wire-format helpers; no database or browser credentials here.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const digest = (value) =>
  createHash('sha256').update(value).digest('hex');
export function secretMatches(actual, expected) {
  return (
    typeof actual === 'string' &&
    typeof expected === 'string' &&
    expected.length >= 32 &&
    timingSafeEqual(
      Buffer.from(digest(actual), 'hex'),
      Buffer.from(digest(expected), 'hex'),
    )
  );
}
export function signQuote(quote, secret) {
  if (!secret || secret.length < 32)
    throw new Error('Insurance partner key must have at least 32 characters');
  const payload = Buffer.from(JSON.stringify(quote)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyQuote(token, secret) {
  if (typeof token !== 'string' || token.length > 24000)
    throw new Error('Invalid insurance quote');
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra)
    throw new Error('Invalid insurance quote');
  const expected = createHmac('sha256', secret || '')
    .update(payload)
    .digest('base64url');
  if (!secretMatches(signature, expected))
    throw new Error('Invalid insurance quote');
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}
export function coverageDates(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error('Invalid delivery date');
  const start = new Date(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(start.valueOf()) ||
    start.toISOString().slice(0, 10) !== date ||
    start.getUTCFullYear() < 2000 ||
    start.getUTCFullYear() > 9998
  )
    throw new Error('Invalid delivery date');
  const year = start.getUTCFullYear() + 1;
  const month = start.getUTCMonth();
  // A leap-day start runs through Feb 28 of the following year, inclusive.
  const endExclusive = new Date(Date.UTC(year, month, start.getUTCDate()));
  return {
    startsOn: date,
    endsOn: new Date(endExclusive.valueOf() - 86400000)
      .toISOString()
      .slice(0, 10),
  };
}
export function partnerEndpoint(base, path) {
  const url = new URL(base);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ))
  )
    throw new Error('Insurance URL must be HTTPS (HTTP only on loopback)');
  return `${url.href.replace(/\/$/, '')}/${path}`;
}
