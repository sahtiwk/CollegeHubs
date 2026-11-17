const { Schema } = require('mongoose');
const ranked = require('@collegehubs/contracts/arcade-games.json').filter(game => game.status === 'ranked');
module.exports = connection => {
  // Parent GameSession owns concurrency; embedded actions have no independent version key.
  const action = new Schema({ seq: Number, guess: Number, hint: String, status: String, type: String, questionId: String, answer: Number, correct: Boolean, left: Number, right: Number, choice: String, cell: Number }, { _id: false, versionKey: false, strict: 'throw' });
  const schema = new Schema({
    userId: { type: String, required: true, immutable: true }, hubId: { type: String, required: true, immutable: true }, clientSessionId: { type: String, required: true, immutable: true },
    gameId: { type: String, enum: ranked.map(game => game.id), required: true, immutable: true }, rulesVersion: { type: String, required: true, enum: ranked.map(game => game.rulesVersion), immutable: true },
    target: { type: Number, required: function() { return this.gameId === 'numberguess'; }, select: false, immutable: true },
    daily: { type: Object, immutable: true },
    challenge: { type: Object, select: false, immutable: true }, mathState: Object, sortingState: Object, practiceState: Object,
    status: { type: String, enum: ['active','won','lost','expired'], default: 'active' },
    createdAt: { type: Date, required: true, immutable: true }, expiresAt: { type: Date, required: true, immutable: true }, actions: { type: [action], default: [] },
    completedAt: Date, event: { type: Object, default: null }, receipt: { type: Object, default: null },
    deliveryStatus: { type: String, enum: ['none','pending','settled','attention'], default: 'none' }, nextAttemptAt: { type: Date, default: () => new Date(0) },
    deliveryLeaseId: { type: String, default: null }, deliveryLeaseUntil: { type: Date, default: () => new Date(0) }, attempts: { type: Number, default: 0 }, lastDeliveryError: { type: String, default: null },
  }, { strict: 'throw', optimisticConcurrency: true });
  schema.index({ userId: 1, "daily.challengeDay": 1 }, { unique: true, partialFilterExpression: { "daily.challengeDay": { $type: "string" } } });
  schema.index({ userId: 1, hubId: 1, clientSessionId: 1 }, { unique: true });
  schema.index({ userId: 1, hubId: 1, createdAt: -1 });
  schema.index({ deliveryStatus: 1, nextAttemptAt: 1, _id: 1 });
  return connection.model('GameSession', schema);
};
