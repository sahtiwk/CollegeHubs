const { Schema } = require('mongoose');
module.exports = connection => {
  const action = new Schema({ seq: Number, guess: Number, hint: String, status: String }, { _id: false });
  const schema = new Schema({
    userId: { type: String, required: true, immutable: true }, hubId: { type: String, required: true, immutable: true }, clientSessionId: { type: String, required: true, immutable: true },
    gameId: { type: String, enum: ['numberguess'], required: true, immutable: true }, rulesVersion: { type: String, required: true, enum: ['numberguess-v1'], immutable: true },
    target: { type: Number, required: true, select: false, immutable: true }, status: { type: String, enum: ['active','won','lost','expired'], default: 'active' },
    createdAt: { type: Date, required: true, immutable: true }, expiresAt: { type: Date, required: true, immutable: true }, actions: { type: [action], default: [] },
    completedAt: Date, event: { type: Object, default: null }, receipt: { type: Object, default: null },
    deliveryStatus: { type: String, enum: ['none','pending','settled'], default: 'none' }, nextAttemptAt: { type: Date, default: () => new Date(0) },
    deliveryLeaseId: { type: String, default: null }, deliveryLeaseUntil: { type: Date, default: () => new Date(0) }, attempts: { type: Number, default: 0 }, lastDeliveryError: { type: String, default: null },
  }, { strict: 'throw', optimisticConcurrency: true });
  schema.index({ userId: 1, hubId: 1, clientSessionId: 1 }, { unique: true });
  schema.index({ userId: 1, hubId: 1, createdAt: -1 });
  schema.index({ deliveryStatus: 1, nextAttemptAt: 1, _id: 1 });
  return connection.model('GameSession', schema);
};
