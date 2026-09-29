const mongoose = require('mongoose');
const { safeTheme } = require('../config/collegeRegistry');
const schema = new mongoose.Schema({
  hubId: { type: mongoose.Schema.Types.ObjectId, required: true, default() { return this._id; }, validate(value) { return String(value) === String(this._id || this.getUpdate?.().$setOnInsert?._id); } },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true, unique: true },
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  verifiedEmailDomains: [{ type: String }],
  themeTokens: { type: Object, required: true, validate: value => { safeTheme(value); return true; } },
  themeVersion: { type: Number, required: true }, timezone: { type: String, required: true },
  defaultChannelSet: [{ type: String }], provisionVersion: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
}, { timestamps: true });
module.exports = mongoose.model('Hub', schema);
