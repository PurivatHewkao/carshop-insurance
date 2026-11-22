import { getMysqlPool } from '../config/mysql.js';
import { httpError } from '../utils/httpError.js';

async function findActor(userId, table) {
  const [rows] = await getMysqlPool().query(
    `SELECT id FROM ${table} WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  if (!rows[0])
    throw httpError(403, 'SALES_PROFILE_NOT_LINKED', 'บัญชีนี้ยังไม่มีข้อมูลลูกค้าหรือพนักงานในระบบขาย');
  return rows[0].id;
}

export const requireCustomer = async (req, _res, next) => {
  try {
    req.salesActor = { userId: req.user.id, role: req.user.role, customerId: await findActor(req.user.id, 'customers') };
    next();
  } catch (error) { next(error); }
};

export const requireEmployee = async (req, _res, next) => {
  try {
    req.salesActor = { userId: req.user.id, role: req.user.role, employeeId: await findActor(req.user.id, 'employees') };
    next();
  } catch (error) { next(error); }
};
