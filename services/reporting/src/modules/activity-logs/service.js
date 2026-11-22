import { randomUUID } from 'node:crypto';
import { insertActivityEvent, findActivityEvents } from './repository.js';

const FORBIDDEN_KEY = /(password|secret|token|authorization|cookie|card|cvv|salt)/i;

function assertSafeMetadata(value, path = 'metadata') {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) {
      const error = new Error(`Sensitive field is not allowed: ${path}.${key}`);
      error.status = 400;
      throw error;
    }
    if (nested && typeof nested === 'object') assertSafeMetadata(nested, `${path}.${key}`);
  }
}

export async function recordActivity(input) {
  assertSafeMetadata(input.metadata || {});
  return insertActivityEvent({
    eventId: input.eventId || randomUUID(), actorUserId: input.actorUserId,
    actorRole: input.actorRole, action: input.action, service: input.service,
    entityType: input.entityType || null, entityId: input.entityId || null,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(), metadata: input.metadata || {},
  });
}

export async function queryActivity(input) {
  return findActivityEvents(input);
}
