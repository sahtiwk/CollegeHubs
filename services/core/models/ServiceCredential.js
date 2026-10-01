const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  scope: { type: String, enum: ['system'], default: 'system', required: true, immutable: true },
  hubId: { type: mongoose.Schema.Types.ObjectId, default: null, validate: value => value === null, immutable: true },
  service: { type: String, enum: ['arcade', 'interview', 'learn'], required: true, immutable: true },
  keyHash: { type: String, required: true, unique: true, select: false, match: /^[a-f0-9]{64}$/ },
  keyId: { type: String, required: true, unique: true, match: /^[a-zA-Z0-9_-]{8,64}$/, immutable: true },
  eventTypes: { type: [String], default: [] },
  allowedReadScopes: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'disabled'], default: 'active', required: true },
}, { timestamps: true });
module.exports = mongoose.model('ServiceCredential', schema);
