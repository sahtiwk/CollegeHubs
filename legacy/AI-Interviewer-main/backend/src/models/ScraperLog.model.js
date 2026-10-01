/**
 * models/ScraperLog.model.js
 *
 * Log sheet to store historical trace reports of job scrape runs.
 */

const mongoose = require('mongoose');

const scraperLogSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'running', 'interrupted'],
      default: 'running',
    },
    jobsImported: {
      type: Number,
      default: 0,
    },
    jobsUpdated: {
      type: Number,
      default: 0,
    },
    duplicateCount: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScraperLog', scraperLogSchema);
