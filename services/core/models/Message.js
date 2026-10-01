const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  authorName: { type: String, required: true },
  clientMessageId: { type: String, required: true, immutable: true },
  seq: { type: Number, required: true, min: 1, immutable: true },
  type: { type: String, enum: ['text', 'code', 'resource', 'question', 'answer'], required: true },
  text: { type: String, default: '' },
  language: String, title: String, url: String,
  questionId: { type: mongoose.Schema.Types.ObjectId },
  acceptedAnswerId: { type: mongoose.Schema.Types.ObjectId, default: null },
  acceptedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ hubId: 1, channelId: 1, seq: 1 }, { unique: true });
schema.index({ hubId: 1, authorId: 1, clientMessageId: 1 }, { unique: true });
schema.index({ hubId: 1, channelId: 1, questionId: 1, seq: 1 });
module.exports = mongoose.model('Message', schema);
