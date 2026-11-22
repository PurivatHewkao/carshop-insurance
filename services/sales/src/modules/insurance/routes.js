// Insurance: new endpoints only, protected by the existing Identity session.
import { Router } from 'express';
import { requireRoles } from '../../../../../packages/auth/index.js';
import { novaPlans } from './client.js';
import { customerInsurance } from './repository.js';
const router = Router();
router.get(
  '/plans',
  requireRoles('seller', 'manager', 'admin'),
  async (_req, res) => {
    const plans = await novaPlans();
    // The quote token remains in the backend; the seller only needs display prices.
    res.json({
      data: plans.map(({ quoteToken: _token, ...plan }) => ({
        ...plan,
        label: `${plan.name} (NOVA)`,
        premium: plan.finalAmount,
      })),
    });
  },
);
router.get('/me', requireRoles('customer'), async (req, res) => {
  res.json({ data: await customerInsurance(req.user.id) });
});
export default router;
