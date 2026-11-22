import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const activityEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, immutable: true },
    actorUserId: { type: String, required: true, immutable: true, index: true },
    actorRole: { type: String, required: true, enum: ['admin', 'manager', 'seller', 'finance', 'customer', 'system'], immutable: true },
    action: { type: String, required: true, trim: true, minlength: 2, maxlength: 100, immutable: true },
    service: { type: String, required: true, enum: ['identity', 'catalog', 'sales', 'payment', 'reporting'], immutable: true, index: true },
    entityType: { type: String, trim: true, maxlength: 80, default: null, immutable: true },
    entityId: { type: String, trim: true, maxlength: 128, default: null, immutable: true },
    occurredAt: { type: Date, required: true, immutable: true, index: true },
    // Store non-sensitive business context only; never credentials or payment secrets.
    metadata: { type: Schema.Types.Mixed, default: () => ({}), immutable: true },
  },
  { collection: 'activity_events', timestamps: { createdAt: 'recordedAt', updatedAt: false }, versionKey: false, strict: 'throw', minimize: true },
);

activityEventSchema.index({ occurredAt: -1, _id: -1 });
activityEventSchema.index({ actorUserId: 1, occurredAt: -1, _id: -1 });
activityEventSchema.index({ service: 1, occurredAt: -1, _id: -1 });
activityEventSchema.index({ entityType: 1, entityId: 1, occurredAt: -1 });

export const ActivityEvent = models.ActivityEvent || model('ActivityEvent', activityEventSchema);
