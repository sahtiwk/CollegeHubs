const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  module: { type: String, enum: ['arcade', 'interview', 'learn'], required: true, immutable: true },
  grantHash: { type: String, required: true, unique: true, match: /^[a-f0-9]{64}$/, select: false, immutable: true },
  stateHash: { type: String, required: true, match: /^[a-f0-9]{64}$/, select: false, immutable: true },
  returnPath: { type: String, required: true, maxlength: 200, immutable: true },
  membershipVersion: { type: Number, required: true, min: 0, immutable: true },
  themeVersion: { type: Number, required: true, min: 1 },
  expiresAt: { type: Date, required: true, immutable: true },
  consumedAt: { type: Date, default: null },
  accessJti: { type: String }, accessExpiresAt: Date,
  retainUntil: { type: Date, required: true },
}, { timestamps: true });
schema.index({ accessJti: 1 }, { unique: true, partialFilterExpression: { accessJti: { $type: 'string' } } });
schema.index({ retainUntil: 1 }, { expireAfterSeconds: 0 });
schema.index({ hubId: 1, userId: 1, createdAt: -1 });
module.exports = mongoose.model('ModuleGrant', schema);
