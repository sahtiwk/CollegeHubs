const mongoose = require('mongoose');
const config = require('../config/achievements');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  badgeId: { type: String, enum: config.badges.map(item => item.id), required: true, immutable: true },
  policyVersion: { type: String, required: true, immutable: true },
  earnedAt: { type: Date, required: true, immutable: true },
  recordedAt: { type: Date, required: true, immutable: true },
  evidence: { type: [String], required: true, immutable: true },
}, { strict: 'throw' });
schema.index({ userId: 1, badgeId: 1 }, { unique: true });
schema.index({ hubId: 1, userId: 1 });
module.exports = mongoose.model('AchievementAward', schema);
