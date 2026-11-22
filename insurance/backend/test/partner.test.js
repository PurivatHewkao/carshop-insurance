// Insurance: authorization, quote integrity and concurrent approval boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { signQuote } from '../../../packages/insurance/index.js';
import {
  requirePartner,
  validatePartnerRequest,
  savePartnerRequest,
} from '../src/modules/partner.js';
import { approveRequest, hashPassword } from '../src/modules/admin.js';
process.env.NOVA_PARTNER_KEY = 'test-only-insurance-key-'.repeat(3);
const plan = {
  id: randomUUID(),
  name: 'Smart Drive',
  finalAmount: 6165.5,
  originalAmount: 6490,
  discountAmount: 324.5,
};
const body = () => ({
  orderId: randomUUID(),
  quoteToken: signQuote(plan, process.env.NOVA_PARTNER_KEY),
  deliveryDate: '2026-12-01',
  customer: { fullName: 'Demo', email: 'demo@example.com', phone: '' },
  vehicle: {
    brand: 'Toyota',
    model: 'Camry',
    vin: '12345678901234567',
    year: 2026,
  },
});
test('partner key is required; admin/customer tokens cannot create insurance requests', () => {
  assert.throws(
    () =>
      requirePartner({ get: () => 'Bearer customer-token' }, {}, () =>
        assert.fail(),
      ),
    { status: 401 },
  );
  let allowed = false;
  requirePartner(
    { get: () => `Bearer ${process.env.NOVA_PARTNER_KEY}` },
    { set: () => {} },
    () => {
      allowed = true;
    },
  );
  assert.equal(allowed, true);
});
test('submitted price is ignored; signed quote and delivery dates are authoritative', () => {
  const input = validatePartnerRequest({ ...body(), finalAmount: 1 });
  assert.equal(input.plan.finalAmount, 6165.5);
  assert.equal(input.endsOn, '2027-11-30');
  assert.throws(
    () => validatePartnerRequest({ ...body(), quoteToken: 'fake' }),
    { status: 400 },
  );
  assert.throws(
    () => validatePartnerRequest({ ...body(), deliveryDate: '2026-02-30' }),
    { status: 400 },
  );
});
test('duplicate order retries recover the same request; changed payload conflicts', async () => {
  let stored;
  const pool = {
    execute: async (sql, values) => {
      if (sql.includes('INSERT')) {
        if (stored)
          throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
        stored = {
          id: values[0],
          order_id: values[1],
          payload_hash: values[2],
          plan_snapshot: values[3],
          customer: values[4],
          vehicle: values[5],
          delivery_date: values[6],
          starts_on: values[7],
          ends_on: values[8],
          status: 'PENDING_APPROVAL',
        };
        return [{}];
      }
      return [[stored]];
    },
  };
  const input = validatePartnerRequest(body());
  const first = await savePartnerRequest(pool, input);
  const repeated = await savePartnerRequest(pool, input);
  assert.deepEqual(first, repeated);
  assert.equal(first.policyNumber, undefined);
  await assert.rejects(
    savePartnerRequest(pool, { ...input, deliveryDate: '2026-12-02' }),
    { status: 409 },
  );
});
test('approval is conditional and repeating it preserves the original policy', async () => {
  const input = validatePartnerRequest(body());
  const row = {
    id: randomUUID(),
    order_id: input.orderId,
    status: 'PENDING_APPROVAL',
    plan_snapshot: plan,
    customer: input.customer,
    vehicle: input.vehicle,
  };
  const pool = {
    execute: async (sql, values) => {
      if (sql.includes('UPDATE')) {
        assert.match(sql, /AND status = 'PENDING_APPROVAL'/);
        if (row.status === 'PENDING_APPROVAL') {
          row.status = 'ISSUED';
          row.policy_number = values[0];
        }
        return [{}];
      }
      return [[row]];
    },
  };
  const first = await approveRequest(pool, row.id, randomUUID());
  const second = await approveRequest(pool, row.id, randomUUID());
  assert.equal(first.policyNumber, second.policyNumber);
  assert.equal(second.status, 'ISSUED');
  assert.notEqual(hashPassword('demo-password'), hashPassword('demo-password'));
});
