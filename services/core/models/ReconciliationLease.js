const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: { type: String, enum: ['arcade','interview','learn'] },
  token: String, leaseUntil: { type: Date, default: () => new Date(0) },
  nextAttemptAt: { type: Date, default: () => new Date(0) },
  failures: { type: Number, default: 0 }, lastResult: String, lastAttemptAt: Date,
}, { versionKey: false });
module.exports = mongoose.model('ReconciliationLease', schema);
