const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, immutable: true },
  businessKey: { type: String, required: true, unique: true, immutable: true },
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  type: { type: String, enum: ['code.shared', 'resource.shared', 'answer.accepted'], required: true, immutable: true },
  occurredAt: { type: Date, required: true, immutable: true },
  dayKey: { type: String, required: true, immutable: true },
  normalizedSourceHash: { type: String, required: true, immutable: true },
  status: { type: String, enum: ['rules_inactive', 'settled'], default: 'rules_inactive' },
  receipt: { type: Object, default: null },
}, { timestamps: true, strict: 'throw' });
schema.index({ hubId: 1, userId: 1, occurredAt: -1 });
module.exports = mongoose.model('NativeFact', schema);
