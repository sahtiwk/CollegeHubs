/**
 * controllers/adminSettings.controller.js
 *
 * Implements Platform Global Settings Configurations.
 * Saves and updates AI model configs, Storage providers, JWT expiries and Module Feature Flags.
 */

const SystemSetting = require('../models/SystemSetting.model');
const AppError      = require('../utils/AppError');

// Fetch settings (with auto-seed fallback)
const getOrCreateSettings = async () => {
  let settings = await SystemSetting.findOne();
  if (!settings) {
    settings = await SystemSetting.create({
      general: {
        appName: 'AI Interviewer',
        logo: '',
        theme: 'dark',
        maintenanceMode: false,
        supportEmail: 'support@interview.ai',
        supportPhone: '+1 (555) 019-2834',
        socialLinks: { github: '', twitter: '', linkedin: '' },
      },
      security: {
        jwtExpiry: '7d',
        apiKeys: { groq: '', stripe: '', adzunaId: '', adzunaKey: '' },
        rateLimits: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
      },
      ai: {
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        maxTokens: 1024,
      },
      storage: {
        provider: 'local',
        cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
        aws: { bucket: '', region: '', accessKey: '', secretKey: '' },
      },
      featureFlags: {
        enableJobs: true,
        enableScraper: true,
        enableATS: true,
        enableCoach: true,
      },
    });
  }
  return settings;
};

// ─── GET /api/admin/settings ───────────────────────────────────────
exports.getSettings = async (req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json({ success: true, settings });
};

// ─── PATCH /api/admin/settings ─────────────────────────────────────
exports.saveSettings = async (req, res) => {
  const settings = await getOrCreateSettings();

  const { general, security, ai, storage, featureFlags } = req.body;

  // Merge general settings
  if (general) {
    if (general.appName !== undefined)         settings.general.appName         = general.appName;
    if (general.logo !== undefined)            settings.general.logo            = general.logo;
    if (general.theme !== undefined)           settings.general.theme           = general.theme;
    if (general.maintenanceMode !== undefined)  settings.general.maintenanceMode  = general.maintenanceMode;
    if (general.supportEmail !== undefined)    settings.general.supportEmail    = general.supportEmail;
    if (general.supportPhone !== undefined)    settings.general.supportPhone    = general.supportPhone;
    if (general.socialLinks) {
      if (general.socialLinks.github !== undefined)   settings.general.socialLinks.github   = general.socialLinks.github;
      if (general.socialLinks.twitter !== undefined)   settings.general.socialLinks.twitter   = general.socialLinks.twitter;
      if (general.socialLinks.linkedin !== undefined)  settings.general.socialLinks.linkedin  = general.socialLinks.linkedin;
    }
  }

  // Merge security configs
  if (security) {
    if (security.jwtExpiry !== undefined) settings.security.jwtExpiry = security.jwtExpiry;
    if (security.apiKeys) {
      if (security.apiKeys.groq !== undefined)      settings.security.apiKeys.groq      = security.apiKeys.groq;
      if (security.apiKeys.stripe !== undefined)    settings.security.apiKeys.groq      = security.apiKeys.stripe;
      if (security.apiKeys.adzunaId !== undefined)  settings.security.apiKeys.adzunaId  = security.apiKeys.adzunaId;
      if (security.apiKeys.adzunaKey !== undefined) settings.security.apiKeys.adzunaKey = security.apiKeys.adzunaKey;
    }
    if (security.rateLimits) {
      if (security.rateLimits.windowMs !== undefined)    settings.security.rateLimits.windowMs    = security.rateLimits.windowMs;
      if (security.rateLimits.maxRequests !== undefined) settings.security.rateLimits.maxRequests = security.rateLimits.maxRequests;
    }
  }

  // Merge AI parameters
  if (ai) {
    if (ai.model !== undefined)       settings.ai.model       = ai.model;
    if (ai.temperature !== undefined) settings.ai.temperature = parseFloat(ai.temperature) || 0.5;
    if (ai.maxTokens !== undefined)   settings.ai.maxTokens   = parseInt(ai.maxTokens) || 1024;
  }

  // Merge Storage config
  if (storage) {
    if (storage.provider !== undefined) settings.storage.provider = storage.provider;
    if (storage.cloudinary) {
      if (storage.cloudinary.cloudName !== undefined) settings.storage.cloudinary.cloudName = storage.cloudinary.cloudName;
      if (storage.cloudinary.apiKey !== undefined)    settings.storage.cloudinary.apiKey    = storage.cloudinary.apiKey;
      if (storage.cloudinary.apiSecret !== undefined) settings.storage.cloudinary.apiSecret = storage.cloudinary.apiSecret;
    }
    if (storage.aws) {
      if (storage.aws.bucket !== undefined)    settings.storage.aws.bucket    = storage.aws.bucket;
      if (storage.aws.region !== undefined)    settings.storage.aws.region    = storage.aws.region;
      if (storage.aws.accessKey !== undefined) settings.storage.aws.accessKey = storage.aws.accessKey;
      if (storage.aws.secretKey !== undefined) settings.storage.aws.secretKey = storage.aws.secretKey;
    }
  }

  // Merge Feature Flags
  if (featureFlags) {
    if (featureFlags.enableJobs !== undefined)    settings.featureFlags.enableJobs    = featureFlags.enableJobs;
    if (featureFlags.enableScraper !== undefined) settings.featureFlags.enableScraper = featureFlags.enableScraper;
    if (featureFlags.enableATS !== undefined)     settings.featureFlags.enableATS     = featureFlags.enableATS;
    if (featureFlags.enableCoach !== undefined)   settings.featureFlags.enableCoach   = featureFlags.enableCoach;
  }

  await settings.save();

  res.status(200).json({ success: true, settings });
};
