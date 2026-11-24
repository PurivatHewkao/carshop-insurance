import { Router } from 'express';
import {
  readOptionalText, requireBody, requireEnum, requireUuid,
} from '../../utils/httpError.js';
import { createOrder, decideOrder, listOrders } from './repository.js';
import { requireRoles } from '../../../../../packages/auth/index.js';
import { requireEmployee } from '../../middleware/actor.js';
import { getMysqlPool } from '../../config/mysql.js';
import { httpError } from '../../utils/httpError.js';

const router = Router();
const APPROVALS = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];
const sellerOnly = requireRoles('seller');
const managerOnly = requireRoles('manager', 'admin');
const signedIn = requireRoles('customer', 'seller', 'manager', 'admin');

router.get('/', signedIn, async (req, res) => {
  const filters = {};
  if (req.user.role === 'customer') filters.customerId = await findActor(req.user.id, 'customers');
  else if (req.user.role === 'seller') filters.sellerId = await findActor(req.user.id, 'employees');
  else {
    if (req.query.customerId) filters.customerId = requireUuid(req.query.customerId, 'customerId');
    if (req.query.sellerId) filters.sellerId = requireUuid(req.query.sellerId, 'sellerId');
  }
  if (req.query.status)
    filters.approvalStatus = requireEnum(String(req.query.status), APPROVALS, 'status');
  res.json({ data: await listOrders(filters) });
});

// Price and premium come from the database; only ids and the discount are sent.
router.post('/', sellerOnly, requireEmployee, async (req, res) => {
  const body = requireBody(req.body);
  const vehicleConfiguration = body.vehicleConfiguration;
  if (!vehicleConfiguration || typeof vehicleConfiguration !== 'object' || Array.isArray(vehicleConfiguration))
    throw httpError(400, 'INVALID_CONFIGURATION', 'เลือกสเปกรถให้ครบก่อนสร้างใบจอง');
  for (const field of ['modelSlug', 'modelName', 'trim', 'trimName', 'colorId', 'colorName', 'wheelId', 'wheelName']) {
    if (typeof vehicleConfiguration[field] !== 'string' || !vehicleConfiguration[field].trim() || vehicleConfiguration[field].length > 150)
      throw httpError(400, 'INVALID_CONFIGURATION', 'ข้อมูลรุ่นรถไม่ครบ (' + field + ')');
  }
  const installmentCount = Number(body.installmentCount);
  const installmentYears = Number(body.installmentYears);
  const downPaymentPercent = Number(body.downPaymentPercent);
  if (![0, 5, 10, 15, 20, 25, 30, 40, 50].includes(downPaymentPercent))
    throw httpError(400, 'INVALID_DOWN_PAYMENT_PERCENT', 'เลือกเปอร์เซ็นต์เงินดาวน์จากรายการที่กำหนด');
  if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 120 || !Number.isInteger(installmentYears) || installmentYears < 1 || installmentYears > 10)
    throw httpError(400, 'INVALID_FINANCE_TERMS', 'ระบุจำนวนงวดและปีผ่อนให้ถูกต้อง');
  if (Number(body.interestRate) < 0 || Number(body.interestRate) > 20)
    throw httpError(400, 'INVALID_INTEREST_RATE', 'ดอกเบี้ยต้องอยู่ระหว่าง 0 ถึง 20 เปอร์เซ็นต์');
  const order = await createOrder({
    customerId: requireUuid(body.customerId, 'customerId'),
    sellerId: req.salesActor.employeeId,
    carId: requireUuid(body.carId, 'carId'),
    insuranceId: body.insuranceId ? requireUuid(body.insuranceId, 'insuranceId') : null,
    // Insurance: NOVA uses a separate reference; keep the legacy insurance FK intact.
    novaPlanId: body.novaPlanId ? requireUuid(body.novaPlanId, 'novaPlanId') : null,
    deliveryDate: body.deliveryDate,
    expectedPremium: body.expectedPremium,
    discount: body.discount === undefined || body.discount === '' ? '0' : body.discount,
    note: readOptionalText(body.note, 'note', 2000),
    vehicleConfiguration,
    downPaymentPercent,
    interestRate: body.interestRate,
    installmentCount,
    installmentYears,
  });
  res.status(201).json({ data: order });
});

router.patch('/:id/decision', managerOnly, async (req, res) => {
  const id = requireUuid(req.params.id);
  const body = requireBody(req.body);
  const decision = requireEnum(body.decision, ['APPROVED', 'REJECTED'], 'decision');
  res.json({
    data: await decideOrder(id, {
      decision,
      comment: readOptionalText(body.comment, 'comment', 1000),
    }),
  });
});

async function findActor(userId, table) {
  const [rows] = await getMysqlPool().query(`SELECT id FROM ${table} WHERE user_id = ? LIMIT 1`, [userId]);
  if (!rows[0]) throw httpError(403, 'SALES_PROFILE_NOT_LINKED', 'บัญชีนี้ยังไม่มีข้อมูลในระบบขาย');
  return rows[0].id;
}

export default router;
