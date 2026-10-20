const mongoose = require('mongoose');
const id = mongoose.Schema.Types.ObjectId;
const schema = new mongoose.Schema({
  hubId: { type: id, required: true, immutable: true },
  channelId: { type: id, required: true, immutable: true },
  hostId: { type: id, required: true, immutable: true },
  clientRoomId: { type: String, required: true, immutable: true },
  problemId: { type: id, required: true, immutable: true },
  problem: { type: Object, required: true, immutable: true },
  durationMinutes: { type: Number, required: true, min: 5, max: 60, immutable: true },
  participantIds: { type: [id], validate: value => value.length >= 1 && value.length <= 8 && new Set(value.map(String)).size === value.length },
  status: { type: String, enum: ['waiting', 'active', 'review', 'cancelled'], default: 'waiting' },
  version: { type: Number, default: 1 },
  fence: { type: Number, default: 0 },
  startAt: { type: Date, default: null }, endAt: { type: Date, default: null },
  closedAt: { type: Date, default: null }, closeReason: { type: String, default: null },
  closeCount: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ hubId: 1, hostId: 1, clientRoomId: 1 }, { unique: true });
schema.index({ status: 1, endAt: 1 });
schema.index({ hubId: 1, channelId: 1, _id: -1 });
module.exports = mongoose.model('StudyRoom', schema);
