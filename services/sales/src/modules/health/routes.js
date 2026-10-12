import { Router } from 'express';
import { env } from '../../config/env.js';
const router = Router();
router.get('/', (_req, res) => {
  res
    .set('Cache-Control', 'no-store')
    .json({ service: env.service, status: 'ok' });
});
export default router;
