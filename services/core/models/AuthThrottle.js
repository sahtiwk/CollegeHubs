const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: String, count: { type: Number, default: 0 }, expiresAt: { type: Date, required: true },
}, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('AuthThrottle', schema);
