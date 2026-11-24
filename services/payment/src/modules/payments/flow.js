// Purchase flow of one order (owner: ดิว). A hire-purchase order (orders.installment_count > 0,
// every order the Sales form makes) goes through 4 steps after the manager approves it:
//   1 BOOKING_DEPOSIT      customer pays the booking deposit (≤ BOOKING_DEPOSIT_MAX)
//   2 FINANCE_APPLICATION  customer downloads the booking document (ใบจอง) and applies
//                          for a loan at a finance company themselves (outside the system)
//   3 DOWN_PAYMENT         customer comes back and pays the down payment in full, in one
//                          payment: orders.down_payment − deposit (the deposit counts toward it)
//   4 DELIVERY             the finance company transfers the loan (FINANCE_DISBURSEMENT,
//                          recorded by Finance) → order PAID → the car is handed over
// An order without installments (old data, tests) is a cash order:
//   BOOKING_DEPOSIT (optional) → BALANCE → DELIVERY.
import {
  carIsReady,
  findCarProduction,
  findOrderPlan,
} from '../../clients/orders.js';
import { formatMoney, toSatang } from '../../utils/money.js';

export const FINANCE_STEPS = [
  'BOOKING_DEPOSIT',
  'FINANCE_APPLICATION',
  'DOWN_PAYMENT',
  'DELIVERY',
];
export const CASH_STEPS = ['BOOKING_DEPOSIT', 'BALANCE', 'DELIVERY'];
const LIVE = ['PENDING', 'SUCCESS'];

/** PAID / PENDING / REFUNDED / NOT_PAID of the payments of one type. */
function typeStatus(payments, type) {
  const rows = payments.filter((p) => p.payment_type === type);
  if (rows.some((p) => p.status === 'SUCCESS')) return 'PAID';
  if (rows.some((p) => p.status === 'PENDING')) return 'PENDING';
  if (rows.some((p) => p.status === 'REFUNDED')) return 'REFUNDED';
  return 'NOT_PAID';
}

const sumOf = (payments, type, statuses) =>
  payments
    .filter((p) => p.payment_type === type && statuses.includes(p.status))
    .reduce((sum, p) => sum + toSatang(p.amount), 0);

/**
 * Pure: works out where the order is. Money in satang.
 * input = { status, total_amount, plan (findOrderPlan), production, carStatus, payments }
 */
export function buildFlow({
  status,
  total_amount,
  plan,
  production,
  carStatus,
  payments,
}) {
  const total = toSatang(total_amount);
  const financed = Number(plan?.installment_count || 0) > 0;
  const depositStatus = typeStatus(payments, 'BOOKING_DEPOSIT');
  // Deposit paid or waiting for Finance to check the slip: both count toward the down payment.
  const deposit = sumOf(payments, 'BOOKING_DEPOSIT', LIVE);
  const depositPaid = sumOf(payments, 'BOOKING_DEPOSIT', ['SUCCESS']);
  const agreedDown = financed ? toSatang(plan.down_payment || 0) : 0;
  const downDue = Math.max(0, agreedDown - deposit);
  let downStatus = 'NOT_IN_PLAN';
  if (financed) {
    downStatus = typeStatus(payments, 'DOWN_PAYMENT');
    if (downStatus === 'NOT_PAID' && downDue === 0) downStatus = 'NOT_REQUIRED';
  }
  const downRow = payments.find(
    (p) => p.payment_type === 'DOWN_PAYMENT' && LIVE.includes(p.status),
  );
  const financeAmount = financed ? Math.max(0, total - deposit - downDue) : 0;
  const financeReceived =
    sumOf(payments, 'FINANCE_DISBURSEMENT', ['SUCCESS']) > 0;
  const carReady = carIsReady(production);
  const delivered =
    status === 'COMPLETED' ||
    carStatus === 'SOLD' ||
    production?.status === 'DELIVERED';
  const paidOff = ['PAID', 'COMPLETED'].includes(status);
  const approved = ['CONFIRMED', 'PAID', 'COMPLETED'].includes(status);

  const done = financed
    ? {
        BOOKING_DEPOSIT: depositStatus === 'PAID',
        FINANCE_APPLICATION:
          ['PENDING', 'PAID'].includes(downStatus) ||
          (downStatus === 'NOT_REQUIRED' && (financeReceived || paidOff)),
        DOWN_PAYMENT: ['PAID', 'NOT_REQUIRED'].includes(downStatus),
        DELIVERY: delivered,
      }
    : {
        // A cash buyer may skip the deposit: any received money counts.
        BOOKING_DEPOSIT:
          depositStatus === 'PAID' ||
          payments.some((p) => p.status === 'SUCCESS'),
        BALANCE: paidOff,
        DELIVERY: delivered,
      };
  const keys = financed ? FINANCE_STEPS : CASH_STEPS;
  const steps = keys.map((key) => ({ key, done: Boolean(done[key]) }));
  const firstOpen = steps.findIndex((s) => !s.done);
  const cancelled = status === 'CANCELLED';
  let currentStep = null; // 1-based; null when cancelled or everything is done
  if (status === 'PENDING') currentStep = 0; // waiting for the manager
  else if (!cancelled && firstOpen >= 0) currentStep = firstOpen + 1;

  return {
    plan: financed ? 'FINANCE' : 'CASH',
    status,
    approved,
    cancelled,
    currentStep,
    completed: !cancelled && firstOpen < 0,
    steps,
    depositStatus,
    deposit,
    depositPaid,
    agreedDown,
    downStatus,
    downDue,
    downFinanceCompany: downRow?.finance_company || null,
    financeAmount,
    financeReceived,
    carReady,
    delivered,
    // ใบจอง: after the manager approved and the deposit was received.
    bookingDocumentAvailable: approved && depositStatus === 'PAID',
    terms: financed
      ? {
          interestRate:
            plan.interest_rate == null ? null : Number(plan.interest_rate),
          installmentCount: Number(plan.installment_count),
          installmentYears:
            plan.installment_years == null
              ? null
              : Number(plan.installment_years),
        }
      : null,
  };
}

export function flowToApi(flow) {
  return {
    plan: flow.plan,
    currentStep: flow.currentStep,
    completed: flow.completed,
    cancelled: flow.cancelled,
    steps: flow.steps,
    bookingDeposit: {
      status: flow.depositStatus,
      amount: formatMoney(flow.deposit),
    },
    bookingDocumentAvailable: flow.bookingDocumentAvailable,
    downPayment:
      flow.plan === 'FINANCE'
        ? {
            status: flow.downStatus,
            agreedAmount: formatMoney(flow.agreedDown),
            depositDeducted: formatMoney(
              Math.min(flow.deposit, flow.agreedDown),
            ),
            dueAmount: formatMoney(flow.downDue),
            financeCompany: flow.downFinanceCompany,
          }
        : null,
    finance:
      flow.plan === 'FINANCE'
        ? {
            amount: formatMoney(flow.financeAmount),
            received: flow.financeReceived,
            ...flow.terms,
          }
        : null,
    car: { ready: flow.carReady, delivered: flow.delivered },
  };
}

/** Loads everything buildFlow needs for one order (inside or outside a transaction). */
export async function loadFlow(connection, order) {
  const [payments] = await connection.query(
    `SELECT payment_type, status, amount, finance_company FROM payments
     WHERE order_id = ? ORDER BY created_at, id`,
    [order.id],
  );
  const [[car]] = await connection.query(
    'SELECT status FROM cars WHERE id = ?',
    [order.car_id],
  );
  return buildFlow({
    status: order.status,
    total_amount: order.total_amount,
    plan: await findOrderPlan(connection, order.id),
    production: await findCarProduction(connection, order.car_id),
    carStatus: car?.status ?? null,
    payments,
  });
}

/** Payments of many orders at once (for GET /order-balances): orderId -> rows. */
export async function paymentsByOrder(connection, orderIds) {
  const map = new Map(orderIds.map((id) => [id, []]));
  if (!orderIds.length) return map;
  const [rows] = await connection.query(
    `SELECT order_id, payment_type, status, amount, finance_company FROM payments
     WHERE order_id IN (?) ORDER BY created_at, id`,
    [orderIds],
  );
  for (const row of rows) map.get(row.order_id)?.push(row);
  return map;
}
