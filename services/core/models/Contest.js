const mongoose = require('mongoose');
// One bounded atomic snapshot per provider avoids mixed-generation contest lists.
const item = new mongoose.Schema({ providerId: { type: String, required: true }, title: { type: String, required: true, maxlength: 300 }, startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true }, url: { type: String, required: true } }, { _id: false });
const schema = new mongoose.Schema({
  provider: { type: String, enum: ['codeforces', 'clist'], unique: true, required: true },
  items: { type: [item], default: [] }, fetchedAt: { type: Date, default: null },
  provenance: { type: String, enum: ['provider', 'recorded_fixture'], default: 'provider' },
  nextAttemptAt: { type: Date, default: () => new Date(0) }, leaseId: { type: String, default: null }, leaseUntil: { type: Date, default: () => new Date(0) },
  lastError: { type: String, default: null }, lastAttemptAt: { type: Date, default: null },
}, { strict: 'throw' });
module.exports = mongoose.model('Contest', schema);
