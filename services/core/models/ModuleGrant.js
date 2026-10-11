const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  kind: { type: String, enum: ['session','recommendation'], default: 'session', immutable: true },
  recommendationHash: { type: String, match: /^[a-f0-9]{64}$/, select: false, immutable: true },
  topics: { type: [new mongoose.Schema({ nodeId: String, label: String, version: String, reason: String, asOf: Date }, { _id: false })], default: undefined, immutable: true },
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  module: { type: String, enum: ['arcade', 'interview', 'learn'], required: true, immutable: true },
  grantHash: { type: String, required: true, unique: true, match: /^[a-f0-9]{64}$/, select: false, immutable: true },
  stateHash: { type: String, required: function() { return this.kind !== 'recommendation'; }, match: /^[a-f0-9]{64}$/, select: false, immutable: true },
  returnPath: { type: String, required: function() { return this.kind !== 'recommendation'; }, maxlength: 200, immutable: true },
  membershipVersion: { type: Number, required: true, min: 0, immutable: true },
  themeVersion: { type: Number, required: function() { return this.kind !== 'recommendation'; }, min: 1 },
  expiresAt: { type: Date, required: true, immutable: true },
  consumedAt: { type: Date, default: null },
  accessJti: { type: String }, accessExpiresAt: Date,
  retainUntil: { type: Date, required: true },
}, { timestamps: true });
schema.index({ recommendationHash: 1 }, { unique: true, partialFilterExpression: { recommendationHash: { $type: 'string' } } });
schema.index({ accessJti: 1 }, { unique: true, partialFilterExpression: { accessJti: { $type: 'string' } } });
schema.index({ retainUntil: 1 }, { expireAfterSeconds: 0 });
schema.index({ hubId: 1, userId: 1, createdAt: -1 });
module.exports = mongoose.model('ModuleGrant', schema);
