import { ActivityEvent } from './models/ActivityEvent.js';

export async function insertActivityEvent(event) {
  const [created] = await ActivityEvent.create([event]);
  return created.toObject();
}

export async function findActivityEvents({ actorUserId, service, action, entityType, from, to, afterId, limit = 25 }) {
  const filter = {};
  if (actorUserId) filter.actorUserId = actorUserId;
  if (service) filter.service = service;
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (from || to) {
    filter.occurredAt = {};
    if (from) filter.occurredAt.$gte = from;
    if (to) filter.occurredAt.$lte = to;
  }
  if (afterId) filter._id = { $lt: afterId };
  const rows = await ActivityEvent.find(filter).sort({ _id: -1 }).limit(Math.min(Math.max(Number(limit) || 25, 1), 100)).lean();
  return { items: rows, nextCursor: rows.length ? String(rows[rows.length - 1]._id) : null };
}
