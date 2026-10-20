const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  sessionVersion: { type: Number, required: true },
  generation: { type: Number, default: 0 },
  refreshHash: { type: String, required: true, select: false },
  rotatedAt: Date,
  idleExpiresAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('AuthSession', schema);
