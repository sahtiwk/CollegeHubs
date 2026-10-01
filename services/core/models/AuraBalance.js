const mongoose = require('mongoose');
const integer = { type: Number, required: true, default: 0, min: 0, validate: Number.isSafeInteger };
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  engagement: integer, externalBonus: integer, total: integer,
  version: integer, asOf: { type: Date, required: true },
}, { timestamps: true });
schema.index({ hubId: 1, userId: 1 }, { unique: true });
schema.index({ hubId: 1, total: -1, userId: 1 });
module.exports = mongoose.model('AuraBalance', schema);
