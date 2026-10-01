/**
 * models/SystemPrompt.model.js
 *
 * Persists system-wide AI prompt templates, version histories, and active states.
 */

const mongoose = require('mongoose');

const systemPromptSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['interview', 'resume_parser', 'ats_scorer', 'career_coach', 'job_recommendation', 'feedback_report'],
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
    },
    history: [
      {
        version: { type: Number, required: true },
        content: { type: String, required: true },
        changeReason: { type: String, default: 'Updated via Prompt Editor' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemPrompt', systemPromptSchema);
