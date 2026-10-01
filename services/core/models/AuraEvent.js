const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  eventId: { type: String, required: true, unique: true },
  source: { type: String, required: true }, type: { type: String, required: true },
  sourceId: { type: String, required: true }, businessKey: { type: String, required: true },
  canonical: { type: Boolean, required: true }, originalEventId: { type: String, required: true },
  payloadHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  value: { type: Number, required: true, enum: [1] }, metadata: { type: Object, required: true },
  occurredAt: { type: Date, required: true }, receivedAt: { type: Date, required: true },
  ruleVersion: { type: String, required: true }, awardedAura: { type: Number, required: true, min: 0 },
  policyReason: { type: String, required: true }, dayKey: { type: String, required: true },
  timezonePolicyVersion: { type: Number, required: true },
}, { timestamps: true, strict: 'throw' });
schema.eachPath((path, field) => { if (!['_id', '__v'].includes(path)) field.immutable(true); });
schema.index({ businessKey: 1 }, { unique: true, partialFilterExpression: { canonical: true } });
schema.index({ hubId: 1, userId: 1, occurredAt: -1 });
module.exports = mongoose.model('AuraEvent', schema);
