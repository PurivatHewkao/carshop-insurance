import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, login, logout, register } from './service.js';
import { publicUser } from './repository.js';
import { profile } from './validation.js';

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที',
    },
  },
});
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.post('/auth/register', limiter, async (req, res) => {
  res.status(201).json({ data: await register(req.body) });
});
router.post('/auth/login', limiter, async (req, res) => {
  res.json({ data: await login(req.body) });
});
router.post('/auth/logout', authenticate, (req, res) => {
  logout(req.auth.claims);
  res.status(204).end();
});
router.get('/users/me', authenticate, (req, res) => {
  res.json({ data: publicUser(req.auth.user) });
});
router.patch('/users/me', authenticate, (req, res) => {
  Object.assign(req.auth.user, profile(req.body));
  res.json({ data: publicUser(req.auth.user) });
});
export default router;
