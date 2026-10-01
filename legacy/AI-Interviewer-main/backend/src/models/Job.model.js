/**
 * models/Job.model.js
 *
 * Job Listing Schema for locally created/managed job postings and third-party synced jobs.
 * Supports features like pinning, archiving, and featuring listings.
 */
'use strict';

const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    adzunaId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    location: {
      type: String,
      default: 'Remote',
      required: [true, 'Location is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    salaryMin: {
      type: Number,
      default: null,
    },
    salaryMax: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    contractType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship', 'temporary'],
      default: 'full_time',
      trim: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    applyUrl: {
      type: String,
      default: '',
      trim: true,
    },
    redirectUrl: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      default: 'Adzuna',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    postedTime: {
      type: Date,
      default: Date.now,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    // Supporting Scraper Module Fields (Sparse / Optional)
    jobHash: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: String,
      default: 'Not Specified',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────

// Text Index for full-text search optimization on title, company, description, and skills
jobSchema.index(
  { title: 'text', company: 'text', description: 'text', skills: 'text' },
  { weights: { title: 10, company: 5, skills: 5, description: 1 }, name: 'JobTextIndex' }
);

// Filtering & sorting optimization indexes
jobSchema.index({ company: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ contractType: 1 });
jobSchema.index({ source: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ createdAt: -1 });

// Cache invalidation hooks
const { clearJobsCache } = require('../config/redis');
const triggerCacheClear = () => {
  clearJobsCache().catch((err) => {
    console.error('[JobModel] Cache clearing error:', err.message);
  });
};

jobSchema.post('save', triggerCacheClear);
jobSchema.post('insertMany', triggerCacheClear);
jobSchema.post('findOneAndUpdate', triggerCacheClear);
jobSchema.post('updateMany', triggerCacheClear);
jobSchema.post('deleteOne', triggerCacheClear);
jobSchema.post('deleteMany', triggerCacheClear);

module.exports = mongoose.model('Job', jobSchema);
