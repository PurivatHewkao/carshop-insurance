// Insurance: Railway's persistent NOVA poller invokes this bounded serverless batch.
import { Router } from 'express';
import { secretMatches } from '../../../../../packages/insurance/index.js';
import { httpError } from '../../utils/httpError.js';
import { syncInsurance } from './worker.js';
export function requireInsuranceSyncKey(req, res, next) {
  const key = process.env.NOVA_PARTNER_KEY;
  if (
    !key ||
    key.length < 32 ||
    !secretMatches(req.get('authorization'), `Bearer ${key}`)
  )
    throw httpError(
      401,
      'INSURANCE_SYNC_UNAUTHORIZED',
      'ไม่อนุญาตให้เรียกงานประกัน',
    );
  res.set('Cache-Control', 'no-store');
  next();
}
const router = Router();
router.post('/', requireInsuranceSyncKey, async (_req, res) => {
  // Only PAID/COMPLETED orders qualify inside the existing worker. Payment is untouched.
  await syncInsurance(undefined, { limit: 2 });
  res.json({ data: { checked: true } });
});
export default router;
