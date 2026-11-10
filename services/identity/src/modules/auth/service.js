import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { findByEmail, findById, insertUser, publicUser } from './repository.js';
import { credentials, profile, fail } from './validation.js';

const deriveKey = promisify(scrypt);
const revoked = new Map();
const dummySalt = randomBytes(16).toString('hex');
const dummyHash = Buffer.alloc(64);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, 64);
  return { salt, passwordHash: hash.toString('hex') };
}
function session(user) {
  const accessToken = jwt.sign({ role: user.role }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '1h',
    subject: user.id,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    jwtid: randomUUID(),
  });
  return { user: publicUser(user), accessToken };
}
export async function register(body) {
  const { email, password } = credentials(body);
  const details = profile(body);
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    fail(400, 'VALIDATION_ERROR', 'รหัสผ่านต้องมีตัวอักษรอังกฤษและตัวเลข');
  if (findByEmail(email)) fail(409, 'EMAIL_EXISTS', 'อีเมลนี้มีบัญชีอยู่แล้ว');
  const secret = await hashPassword(password);
  const user = {
    id: randomUUID(),
    ...details,
    email,
    ...secret,
    role: 'customer',
    status: 'active',
  };
  if (!insertUser(user)) fail(409, 'EMAIL_EXISTS', 'อีเมลนี้มีบัญชีอยู่แล้ว');
  return session(user);
}
export async function login(body) {
  const { email, password } = credentials(body);
  const user = findByEmail(email);
  const actual = await deriveKey(password, user?.salt || dummySalt, 64);
  const expected = user ? Buffer.from(user.passwordHash, 'hex') : dummyHash;
  const matches = timingSafeEqual(actual, expected);
  if (!user || !matches || user.status !== 'active')
    fail(401, 'INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  return session(user);
}
export function authenticate(req, _res, next) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
  if (!match) fail(401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
  let claims;
  try {
    claims = jwt.verify(match[1], env.jwtSecret, {
      algorithms: ['HS256'],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    });
  } catch {
    fail(
      401,
      'INVALID_TOKEN',
      'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
    );
  }
  for (const [id, expiry] of revoked)
    if (expiry <= Date.now() / 1000) revoked.delete(id);
  const user = findById(claims.sub);
  if (
    !user ||
    user.status !== 'active' ||
    !claims.jti ||
    !claims.exp ||
    revoked.has(claims.jti)
  )
    fail(401, 'INVALID_TOKEN', 'เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
  req.auth = { user, claims };
  next();
}
export function logout(claims) {
  revoked.set(claims.jti, claims.exp);
}
