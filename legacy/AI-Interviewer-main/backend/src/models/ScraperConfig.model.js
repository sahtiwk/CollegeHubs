/**
 * models/ScraperConfig.model.js
 *
 * Persists the admin scraper configurations and current scheduling status.
 */

const mongoose = require('mongoose');

const scraperConfigSchema = new mongoose.Schema(
  {
    scrapeInterval: {
      type: Number,
      default: 60, // in minutes
      min: [5, 'Interval cannot be less than 5 minutes'],
    },
    maxJobs: {
      type: Number,
      default: 50,
      min: [5, 'Maximum jobs limit must be at least 5'],
    },
    keywords: {
      type: [String],
      default: ['React', 'Node', 'Python'],
    },
    country: {
      type: String,
      default: 'us',
      lowercase: true,
      trim: true,
    },
    remoteOnly: {
      type: Boolean,
      default: true,
    },
    enabledSources: {
      type: [String],
      default: ['adzuna'],
    },
    status: {
      type: String,
      enum: ['idle', 'running', 'paused'],
      default: 'idle',
    },
    isActiveScheduler: {
      type: Boolean,
      default: true,
    },
    lastRun: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScraperConfig', scraperConfigSchema);
