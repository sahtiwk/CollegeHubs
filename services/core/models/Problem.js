const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  slug: { type: String, required: true, immutable: true },
  version: { type: Number, required: true, immutable: true },
  title: { type: String, required: true, immutable: true },
  statement: { type: String, required: true, immutable: true },
  allowedLanguages: { type: [String], required: true, immutable: true },
}, { timestamps: true });
schema.index({ hubId: 1, slug: 1, version: 1 }, { unique: true });
module.exports = mongoose.model('Problem', schema);
