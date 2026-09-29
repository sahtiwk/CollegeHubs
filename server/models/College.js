const mongoose = require('mongoose');
const { config, normalizeDomain, safeTheme } = require('../config/collegeRegistry');
const schema = new mongoose.Schema({
  scope: { type: String, enum: ['system'], default: 'system' },
  hubId: { type: mongoose.Schema.Types.ObjectId, default: null, validate: value => value === null },
  name: { type: String, required: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]+$/ },
  status: { type: String, enum: ['draft', 'active', 'disabled'], default: 'draft' },
  domains: [{ _id: false, normalizedDomain: { type: String, required: true, set: normalizeDomain }, verifiedAt: Date, evidenceRef: String }],
  themeTokens: { type: Object, required: true, default: () => ({ ...config.defaultTheme }), validate: value => { safeTheme(value); return true; } },
  themeVersion: { type: Number, default: 1, min: 1 },
  timezone: { type: String, required: true, validate: value => { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } },
  defaultChannels: { type: [{ _id: false, slug: String, title: String, kind: { type: String, enum: ['subject'] } }], default: () => config.defaultChannels },
  configVersion: { type: Number, default: 1, min: 1 },
}, { timestamps: true });
schema.index({ 'domains.normalizedDomain': 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
schema.pre('validate', function(next) {
  const domains = this.domains.map(item => item.normalizedDomain);
  if (new Set(domains).size !== domains.length) this.invalidate('domains', 'Duplicate domains');
  if (this.status === 'active' && (!domains.length || this.domains.some(item => !item.verifiedAt || !item.evidenceRef?.trim()))) this.invalidate('domains', 'Active domains require developer confirmation evidence');
  if (JSON.stringify(this.defaultChannels.map(item => ({ slug: item.slug, title: item.title, kind: item.kind }))) !== JSON.stringify(config.defaultChannels)) this.invalidate('defaultChannels', 'Exactly the four canonical channels are required');
  next();
});
module.exports = mongoose.model('College', schema);
