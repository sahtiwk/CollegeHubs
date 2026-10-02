const mongoose = require('mongoose');
const id = mongoose.Schema.Types.ObjectId;
const schema = new mongoose.Schema({
  hubId: { type: id, required: true, immutable: true },
  roomId: { type: id, required: true, immutable: true },
  solutionId: { type: id, required: true, immutable: true },
  reviewerId: { type: id, required: true, immutable: true },
  body: { type: String, required: true, immutable: true },
}, { timestamps: true });
schema.index({ hubId: 1, solutionId: 1, reviewerId: 1 }, { unique: true });
schema.index({ hubId: 1, roomId: 1, _id: 1 });
module.exports = mongoose.model('PeerReview', schema);
