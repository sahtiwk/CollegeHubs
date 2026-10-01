const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, immutable: true },
  slug: { type: String, required: true }, title: { type: String, required: true },
  kind: { type: String, enum: ['subject'], default: 'subject' },
  nextMessageSeq: { type: Number, default: 0, min: 0 },
  defaultSetVersion: { type: Number, required: true }, archivedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ hubId: 1, slug: 1 }, { unique: true });
module.exports = mongoose.model('Channel', schema);
