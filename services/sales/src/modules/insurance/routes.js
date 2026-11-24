// Insurance: new endpoints only, protected by the existing Identity session.
import { Router } from 'express';
import { requireRoles } from '../../../../../packages/auth/index.js';
import { novaPlans } from './client.js';
import { customerInsurance, insuranceVehicle } from './repository.js';
import { requireUuid } from '../../utils/httpError.js';
const router = Router();
router.get(
  '/plans',
  requireRoles('seller', 'manager', 'admin'),
  async (req, res) => {
    const carId = requireUuid(req.query.carId, 'carId');
    const plans = await novaPlans(await insuranceVehicle(carId));
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
