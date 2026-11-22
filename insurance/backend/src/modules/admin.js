// Insurance: independent NOVA administrators; opaque, expiring, hashed sessions.
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../errors.js';
import { digest, uuidPattern } from '../../../../packages/insurance/index.js';
import { partnerResult } from './partner.js';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function passwordMatches(password, hash) {
  const [salt, encoded] = hash.split(':');
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(encoded, 'hex'),
  );
}
export async function approveRequest(pool, id, adminId) {
  if (!uuidPattern.test(id))
    throw new ApiError(400, 'INVALID_REQUEST', 'รหัสคำขอไม่ถูกต้อง');
  // Conditional update makes concurrent approval idempotent; no rejection endpoint.
  await pool.execute(
    `UPDATE nova_partner_requests SET status = 'ISSUED', policy_number = ?, approved_by = ?, approved_at = UTC_TIMESTAMP()
    WHERE id = ? AND status = 'PENDING_APPROVAL'`,
    [
      `NOVA-${new Date().getUTCFullYear()}-${randomUUID().replaceAll('-', '').toUpperCase()}`,
      adminId,
      id,
    ],
  );
  const [rows] = await pool.execute(
    'SELECT * FROM nova_partner_requests WHERE id = ?',
    [id],
  );
  if (!rows[0]) throw new ApiError(404, 'REQUEST_NOT_FOUND', 'ไม่พบคำขอ');
  return partnerResult(rows[0]);
}
export function adminRouter(pool) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.post(
    '/login',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }),
    async (req, res) => {
      const { email, password } = req.body || {};
      if (
        typeof email !== 'string' ||
        email.length > 254 ||
        typeof password !== 'string' ||
        password.length > 256
      )
        throw new ApiError(400, 'INVALID_LOGIN', 'กรอกอีเมลและรหัสผ่าน');
      const [rows] = await pool().execute(
        'SELECT * FROM nova_admins WHERE email = ?',
        [email.trim().toLowerCase()],
      );
      // Perform the expensive hash even for unknown users.
      const hash =
        rows[0]?.password_hash || `${'0'.repeat(32)}:${'0'.repeat(128)}`;
      if (!passwordMatches(password, hash) || !rows[0])
        throw new ApiError(401, 'INVALID_LOGIN', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      const token = randomBytes(32).toString('base64url');
      await pool().execute(
        'DELETE FROM nova_admin_sessions WHERE expires_at <= UTC_TIMESTAMP()',
      );
      await pool().execute(
        'INSERT INTO nova_admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))',
        [digest(token), rows[0].id],
      );
      res.json({ data: { token, email: rows[0].email } });
    },
  );
  router.use(async (req, _res, next) => {
    const token = req
      .get('authorization')
      ?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token)
      throw new ApiError(401, 'ADMIN_UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ NOVA');
    const [rows] = await pool().execute(
      'SELECT admin_id FROM nova_admin_sessions WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP()',
      [digest(token)],
    );
    if (!rows[0])
      throw new ApiError(
        401,
        'ADMIN_UNAUTHORIZED',
        'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
      );
    req.novaAdminId = rows[0].admin_id;
    req.novaSessionHash = digest(token);
    next();
  });
  router.post('/logout', async (req, res) => {
    await pool().execute(
      'DELETE FROM nova_admin_sessions WHERE token_hash = ?',
      [req.novaSessionHash],
    );
    res.json({ data: { loggedOut: true } });
  });
  router.get('/requests', async (req, res) => {
    const offset = Math.max(
      0,
      Math.min(1000000, Number.parseInt(req.query.offset, 10) || 0),
    );
    const [rows] = await pool().query(
      'SELECT * FROM nova_partner_requests ORDER BY created_at DESC, id DESC LIMIT 50 OFFSET ?',
      [offset],
    );
    res.json({ data: rows.map(partnerResult), meta: { offset, limit: 50 } });
  });
  router.post('/requests/:id/approve', async (req, res) => {
    res.json({
      data: await approveRequest(pool(), req.params.id, req.novaAdminId),
    });
  });
  return router;
}
