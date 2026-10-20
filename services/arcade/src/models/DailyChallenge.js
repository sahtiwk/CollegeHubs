const { Schema } = require('mongoose');
module.exports = connection => connection.models.DailyChallenge || connection.model('DailyChallenge', new Schema({
  challengeId: { type: String, required: true, unique: true, immutable: true },
  challengeDay: { type: String, required: true, unique: true, immutable: true },
  rulesVersion: { type: String, required: true, immutable: true },
  contentVersion: { type: String, required: true, immutable: true },
  gameId: { type: String, enum: ['spotbug','sorting'], required: true, immutable: true },
  seed: { type: String, required: true, immutable: true, select: false },
  challenge: { type: Object, required: true, immutable: true, select: false },
  closesAt: { type: Date, required: true, immutable: true },
}, { strict: 'throw' }));
