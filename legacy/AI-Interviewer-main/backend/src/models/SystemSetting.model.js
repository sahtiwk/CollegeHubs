/**
 * models/SystemSetting.model.js
 *
 * Mongoose Schema for system-wide configuration metrics.
 * Encapsulates security tokens, AI temperatures, rate limits, S3/Cloudinary setups, and feature flags.
 */

const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    general: {
      appName: { type: String, default: 'AI Interviewer' },
      logo: { type: String, default: '' },
      theme: { type: String, enum: ['dark', 'light', 'custom'], default: 'dark' },
      maintenanceMode: { type: Boolean, default: false },
      supportEmail: { type: String, default: 'support@interview.ai' },
      supportPhone: { type: String, default: '+1 (555) 019-2834' },
      socialLinks: {
        github: { type: String, default: '' },
        twitter: { type: String, default: '' },
        linkedin: { type: String, default: '' },
      },
    },
    security: {
      jwtExpiry: { type: String, default: '7d' },
      apiKeys: {
        groq: { type: String, default: '' },
        stripe: { type: String, default: '' },
        adzunaId: { type: String, default: '' },
        adzunaKey: { type: String, default: '' },
      },
      rateLimits: {
        windowMs: { type: Number, default: 15 * 60 * 1000 }, // 15 mins
        maxRequests: { type: Number, default: 100 },
      },
    },
    ai: {
      model: { type: String, default: 'llama-3.3-70b-versatile' },
      temperature: { type: Number, default: 0.5, min: 0, max: 2.0 },
      maxTokens: { type: Number, default: 1024 },
    },
    storage: {
      provider: { type: String, enum: ['local', 'cloudinary', 's3'], default: 'local' },
      cloudinary: {
        cloudName: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        apiSecret: { type: String, default: '' },
      },
      aws: {
        bucket: { type: String, default: '' },
        region: { type: String, default: '' },
        accessKey: { type: String, default: '' },
        secretKey: { type: String, default: '' },
      },
    },
    featureFlags: {
      enableJobs: { type: Boolean, default: true },
      enableScraper: { type: Boolean, default: true },
      enableATS: { type: Boolean, default: true },
      enableCoach: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
