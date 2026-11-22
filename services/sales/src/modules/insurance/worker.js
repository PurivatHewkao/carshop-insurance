// Insurance: durable polling outbox based on the existing PAID order transition.
// Runs on Sales only; Payment's confirmation, amounts and transactions are unchanged.
import { getMysqlPool } from '../../config/mysql.js';
import { novaRequest } from './client.js';
const jsonValue = (value) =>
  typeof value === 'string' ? JSON.parse(value) : value;

export async function syncInsuranceRow(db, row, request = novaRequest) {
  let result;
  if (row.status === 'PENDING_APPROVAL') {
    result = await request(`requests/${row.order_id}`);
  } else {
    result = await request('requests', {
      orderId: row.order_id,
      quoteToken: row.quote_token,
      deliveryDate: row.delivery_date,
      customer: jsonValue(row.customer_snapshot),
      vehicle: jsonValue(row.vehicle_snapshot),
    });
  }
  if (
    result.orderId !== row.order_id ||
    !['PENDING_APPROVAL', 'ISSUED'].includes(result.status) ||
    !result.requestId ||
    (result.status === 'ISSUED' &&
      (!result.policyNumber || !result.startsOn || !result.endsOn))
  )
    throw new Error('Invalid NOVA response');
  await db.query(
    `UPDATE order_nova_insurance SET status = ?, nova_request_id = ?, policy_snapshot = ?,
    attempts = 0, last_error = NULL, next_attempt_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 SECOND)
    WHERE order_id = ? AND status <> 'ISSUED'`,
    [
      result.status,
      result.requestId,
      result.status === 'ISSUED' ? JSON.stringify(result) : null,
      row.order_id,
    ],
  );
}
export async function syncInsurance(db = getMysqlPool()) {
  // A MySQL advisory lock also prevents duplicate workers across replicas.
  const connection = await db.getConnection();
  let locked = false;
  try {
    const [[lock]] = await connection.query(
      "SELECT GET_LOCK(CONCAT(DATABASE(), ':nova-insurance'), 0) AS acquired",
    );
    locked = Number(lock.acquired) === 1;
    if (!locked) return;
    const [rows] =
      await connection.query(`SELECT n.* FROM order_nova_insurance n JOIN orders o ON o.id = n.order_id
      WHERE o.status IN ('PAID', 'COMPLETED') AND n.status IN ('AWAITING_PAYMENT', 'PENDING_APPROVAL')
      AND n.next_attempt_at <= UTC_TIMESTAMP() ORDER BY n.next_attempt_at LIMIT 10`);
    for (const row of rows) {
      try {
        await syncInsuranceRow(connection, row);
      } catch {
        const delay = Math.min(300, 5 * 2 ** Math.min(Number(row.attempts), 6));
        await connection.query(
          `UPDATE order_nova_insurance SET attempts = attempts + 1, last_error = 'NOVA_SYNC_FAILED',
          next_attempt_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND) WHERE order_id = ?`,
          [delay, row.order_id],
        );
      }
    }
  } finally {
    try {
      if (locked)
        await connection.query(
          "SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':nova-insurance'))",
        );
    } finally {
      connection.release();
    }
  }
}
export function startInsuranceWorker() {
  if (!process.env.NOVA_API_URL || !process.env.NOVA_PARTNER_KEY)
    return () => {};
  let stopped = false;
  let timer;
  const tick = async () => {
    try {
      await syncInsurance();
    } catch (error) {
      console.error('Insurance sync unavailable:', error.code || error.name);
    }
    if (!stopped) {
      timer = setTimeout(tick, 5000);
      timer.unref();
    }
  };
  void tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
