const mongoose = require('mongoose');
const id = mongoose.Schema.Types.ObjectId;
const schema = new mongoose.Schema({
  hubId: { type: id, required: true, immutable: true },
  roomId: { type: id, required: true, immutable: true },
  userId: { type: id, required: true, immutable: true },
  source: { type: String, default: '' }, language: { type: String, default: 'plaintext' },
  revision: { type: Number, default: 0, min: 0 },
  savedAt: { type: Date, default: null }, submittedAt: { type: Date, default: null },
  sealedAt: { type: Date, default: null }, sourceHash: { type: String, default: null },
  outcome: { type: String, enum: ['pending', 'submitted', 'empty'], default: 'pending' },
});
schema.index({ hubId: 1, roomId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model('StudySolution', schema);
