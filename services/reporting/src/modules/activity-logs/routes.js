import { Router } from 'express';
import { createRequireSession, requireRoles } from '../../../../../packages/auth/index.js';
import { env } from '../../config/env.js';
import { connectMongo } from '../../config/mongodb.js';
import { validateQuery } from '../../middleware/validate.js';
import { queryActivity } from './service.js';
import { activityQuerySchema } from './validation.js';

const router = Router();
const requireSession = createRequireSession({
  identityBaseUrl: env.identityApiUrl,
  allowedOrigins: env.corsOrigins,
  timeoutMs: 3000,
});

router.get('/', requireSession, requireRoles('manager', 'admin'), validateQuery(activityQuerySchema), async (req, res, next) => {
  try {
    await connectMongo();
    const query = req.query;
    const result = await queryActivity({
      actorUserId: query.actor_user_id,
      service: query.service,
      action: query.action,
      entityType: query.entity_type,
      from: query.date_from ? new Date(`${query.date_from}T00:00:00.000Z`) : undefined,
      to: query.date_to ? new Date(`${query.date_to}T23:59:59.999Z`) : undefined,
      afterId: query.cursor,
      limit: query.limit,
    });
    res.set('Cache-Control', 'no-store').json({
      data: {
        items: result.items.map((item) => ({
          id: String(item._id),
          eventId: item.eventId,
          actorUserId: item.actorUserId,
          actorRole: item.actorRole,
          action: item.action,
          service: item.service,
          entityType: item.entityType,
          entityId: item.entityId,
          occurredAt: item.occurredAt,
          metadata: item.metadata,
        })),
        nextCursor: result.nextCursor,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
