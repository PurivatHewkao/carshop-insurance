import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivitySchema, activityQuerySchema } from '../src/modules/activity-logs/validation.js';
import { ActivityEvent } from '../src/modules/activity-logs/models/ActivityEvent.js';

const validEvent = {
  actorUserId: 'user-123',
  actorRole: 'admin',
  action: 'CAR_UPDATED',
  service: 'catalog',
  entityType: 'car',
  entityId: 'car-123',
  occurredAt: '2026-11-22T00:00:00+07:00',
  metadata: { status: 'available' },
};

test('accepts a valid activity event', () => {
  assert.equal(createActivitySchema.safeParse(validEvent).success, true);
});

test('rejects sensitive fields in activity metadata', () => {
  const result = createActivitySchema.safeParse({ ...validEvent, metadata: { nested: { accessToken: 'do-not-store' } } });
  assert.equal(result.success, false);
});

test('rejects unsupported actor roles', () => {
  const result = createActivitySchema.safeParse({ ...validEvent, actorRole: 'superuser' });
  assert.equal(result.success, false);
});

test('accepts bounded activity query pagination', () => {
  const result = activityQuerySchema.safeParse({ service: 'sales', limit: '50' });
  assert.equal(result.success, true);
  assert.equal(result.data.limit, 50);
});

test('rejects reversed activity date range', () => {
  const result = activityQuerySchema.safeParse({ date_from: '2026-12-01', date_to: '2026-01-01' });
  assert.equal(result.success, false);
});

test('activity events are immutable and have query indexes', () => {
  const schema = ActivityEvent.schema;
  assert.equal(schema.path('eventId').options.immutable, true);
  assert.equal(schema.path('actorUserId').options.required, true);
  assert.ok(schema.indexes().some(([keys]) => keys.actorUserId === 1 && keys.occurredAt === -1));
});
