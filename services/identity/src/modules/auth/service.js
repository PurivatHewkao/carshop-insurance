import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import {
  findByEmail,
  findById,
  insertUser,
  publicUser,
  isRevoked,
  revoke,
  transaction,
  lockAdministration,
  assertAdmin,
} from './repository.js';
import { credentials, profile, fail } from './validation.js';
import { clearSessionCookie, readSessionCookie } from './sessionCookie.js';

const deriveKey = promisify(scrypt);
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
    expiresIn: env.jwtLifetimeSeconds,
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
  if (await findByEmail(email))
    fail(409, 'EMAIL_EXISTS', 'อีเมลนี้มีบัญชีอยู่แล้ว');
  const secret = await hashPassword(password);
  const user = {
    id: randomUUID(),
    ...details,
    email,
    ...secret,
    role: 'customer',
    status: 'active',
  };
  if (!(await insertUser(user)))
    fail(409, 'EMAIL_EXISTS', 'อีเมลนี้มีบัญชีอยู่แล้ว');
  return session(user);
}
export async function login(body) {
  const { email, password } = credentials(body);
  const user = await findByEmail(email);
  const actual = await deriveKey(password, user?.salt || dummySalt, 64);
  const expected =
    user?.encodedPassword?.startsWith('scrypt$') &&
    /^[a-f0-9]{128}$/.test(user.passwordHash)
      ? Buffer.from(user.passwordHash, 'hex')
      : dummyHash;
  const matches = timingSafeEqual(actual, expected);
  if (!user || !matches || user.status !== 'active')
    fail(401, 'INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  return session(user);
}
export async function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  const viaCookie = !authorization;
  const token = viaCookie
    ? readSessionCookie(req)
    : /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
  if (!token) fail(401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
  function invalidToken() {
    if (viaCookie) clearSessionCookie(res);
    fail(
      401,
      'INVALID_TOKEN',
      'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
    );
  }
  let claims;
  try {
    claims = jwt.verify(token, env.jwtSecret, {
      algorithms: ['HS256'],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    });
  } catch {
    invalidToken();
  }
  const user = await findById(claims.sub);
  if (
    !user ||
    user.status !== 'active' ||
    !claims.jti ||
    !claims.exp ||
    (await isRevoked(claims.jti))
  )
    invalidToken();
  req.auth = { user, claims, viaCookie };
  next();
}
export async function logout(claims) {
  await revoke(claims);
}

export const roles = [
  'customer',
  'seller',
  'manager',
  'admin',
  'finance',
  'stock',
];
export function permissions(body) {
  if (
    !roles.includes(body?.role) ||
    !['active', 'inactive'].includes(body?.status)
  )
    fail(400, 'VALIDATION_ERROR', 'บทบาทหรือสถานะไม่ถูกต้อง');
  return { role: body.role, status: body.status };
}
export async function createUser(body, actorId, bootstrap = false) {
  const { email, password } = credentials(body);
  const details = profile(body);
  const access = permissions(body);
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    fail(400, 'VALIDATION_ERROR', 'รหัสผ่านต้องมีตัวอักษรอังกฤษและตัวเลข');
  const secret = await hashPassword(password);
  return transaction(async (db) => {
    await lockAdministration(db);
    if (bootstrap) {
      const existing = await findByEmail(email, db);
      if (existing) {
        if (existing.role !== 'admin' || existing.status !== 'active')
          fail(409, 'SEED_CONFLICT', 'บัญชีเดิมไม่ใช่ Admin ที่ใช้งานได้');
        return publicUser(existing);
      }
      const [[{ count }]] = await db.query(
        "SELECT COUNT(*) AS count FROM users WHERE role='ADMIN' AND status='ACTIVE'",
      );
      if (count)
        fail(
          409,
          'ADMIN_EXISTS',
          'มี Admin แล้ว ให้สร้างบัญชีผ่านหน้าจัดการผู้ใช้',
        );
    } else await assertAdmin(actorId, db);
    const user = { id: randomUUID(), email, ...details, ...secret, ...access };
    if (!(await insertUser(user, db)))
      fail(409, 'EMAIL_EXISTS', 'อีเมลนี้มีบัญชีอยู่แล้ว');
    return publicUser(user);
  });
}
export async function requireAdmin(req, _res, next) {
  await assertAdmin(req.auth.user.id);
  next();
}
