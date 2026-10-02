const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  version: { type: String, required: true, unique: true, immutable: true },
  activatedAt: { type: Date, required: true, immutable: true },
  rules: { type: Object, required: true, immutable: true },
  rulesHash: { type: String, required: true, immutable: true },
}, { strict: 'throw' });
module.exports = mongoose.model('AuraRuleSet', schema);
