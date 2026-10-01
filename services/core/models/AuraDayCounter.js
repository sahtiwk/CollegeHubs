const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  dayKey: { type: String, required: true, immutable: true },
  timezonePolicyVersion: { type: Number, required: true, immutable: true },
  sourceTotals: { type: Map, of: Number, default: () => ({}) },
  typeCounts: { type: Map, of: Number, default: () => ({}) },
  gameIds: { type: [String], default: [] }, nodeModeKeys: { type: [String], default: [] },
  version: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ userId: 1, dayKey: 1, timezonePolicyVersion: 1 }, { unique: true });
module.exports = mongoose.model('AuraDayCounter', schema);
