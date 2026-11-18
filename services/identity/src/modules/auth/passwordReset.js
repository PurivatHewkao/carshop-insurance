import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { findByEmail, findById, replacePassword } from './repository.js';
import { hashPassword, passwordVersion } from './service.js';
import {
  accountEmail,
  accountPassword,
  checkNewPassword,
  fail,
} from './validation.js';

const key = createHmac('sha256', env.jwtSecret)
  .update('carshop:password-reset:v1')
  .digest();
const audience = 'carshop-password-reset';
const lifetimeSeconds = 30 * 60;

export function readResetRequest(body) {
  const email = accountEmail(body);
  const { RESEND_API_KEY: apiKey, PASSWORD_RESET_FROM: from } = process.env;
  let origin;
  try {
    const url = new URL(process.env.PASSWORD_RESET_WEB_ORIGIN);
    const local =
      env.nodeEnv !== 'production' &&
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol === 'https:' || local) && url.href === `${url.origin}/`)
      origin = url.origin;
  } catch {
    // Invalid or missing origin disables email delivery.
  }
  if (!apiKey || !from || !origin)
    fail(503, 'RESET_UNAVAILABLE', 'ระบบส่งอีเมลยังไม่พร้อมใช้งาน');
  return { email, apiKey, from, origin };
}

export async function sendResetEmail({ email, apiKey, from, origin }) {
  const user = await findByEmail(email);
  if (user?.status !== 'active') return;
  const token = jwt.sign({ pv: passwordVersion(user, audience) }, key, {
    algorithm: 'HS256',
    issuer: env.jwtIssuer,
    audience,
    subject: user.id,
    expiresIn: lifetimeSeconds,
  });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [user.email],
      subject: 'ตั้งรหัสผ่านใหม่สำหรับบัญชี TOYOTY',
      text: `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ภายใน 30 นาที:\n\n${origin}/reset-password#token=${token}\n\nหากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ให้ละเว้นอีเมลนี้`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  await response.body?.cancel();
  if (!response.ok) throw new Error('Password reset email rejected');
}

function invalidLink() {
  fail(400, 'INVALID_RESET_LINK', 'ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว');
}

export async function resetPassword(body) {
  const password = accountPassword(body);
  checkNewPassword(password);
  if (typeof body.token !== 'string' || body.token.length > 1024) invalidLink();
  let claims;
  try {
    claims = jwt.verify(body.token, key, {
      algorithms: ['HS256'],
      issuer: env.jwtIssuer,
      audience,
    });
  } catch {
    invalidLink();
  }
  const user = await findById(claims.sub);
  if (
    user?.status !== 'active' ||
    claims.pv !== passwordVersion(user, audience)
  )
    invalidLink();
  if (!(await replacePassword(user, await hashPassword(password), claims.exp)))
    invalidLink();
}
