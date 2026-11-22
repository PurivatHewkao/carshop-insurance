import { z } from 'zod';

const safeMetadataSchema = z.record(z.string(), z.unknown()).default({}).superRefine((metadata, ctx) => {
  const forbidden = /(password|secret|token|authorization|cookie|card|cvv|salt)/i;
  const inspect = (value, path = []) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    for (const [key, nested] of Object.entries(value)) {
      if (forbidden.test(key)) ctx.addIssue({ code: 'custom', path: [...path, key], message: 'Sensitive fields must not be stored in activity metadata' });
      inspect(nested, [...path, key]);
    }
  };
  inspect(metadata);
});

export const createActivitySchema = z.object({
  eventId: z.string().uuid().optional(),
  actorUserId: z.string().trim().min(1).max(128),
  actorRole: z.enum(['admin', 'manager', 'seller', 'finance', 'customer', 'system']),
  action: z.string().trim().min(2).max(100),
  service: z.enum(['identity', 'catalog', 'sales', 'payment', 'reporting']),
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(128).optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  metadata: safeMetadataSchema,
}).strict();

export const activityQuerySchema = z.object({
  actor_user_id: z.string().trim().min(1).max(128).optional(),
  service: z.enum(['identity', 'catalog', 'sales', 'payment', 'reporting']).optional(),
  action: z.string().trim().min(2).max(100).optional(),
  entity_type: z.string().trim().max(80).optional(),
  date_from: z.iso.date().optional(),
  date_to: z.iso.date().optional(),
  cursor: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict().superRefine((query, ctx) => {
  if (query.date_from && query.date_to && query.date_from > query.date_to) {
    ctx.addIssue({ code: 'custom', path: ['date_to'], message: 'date_to must be on or after date_from' });
  }
});
