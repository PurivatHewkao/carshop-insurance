import { Router } from 'express';
import { quote } from './service.js';

// Mounted at /api/v1/financing BEFORE requireSession: anyone browsing a car can
// estimate the monthly installment without logging in. Pure calculation, no DB.
const router = Router();

router.get('/quote', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ data: quote(req.query) });
});

export default router;
