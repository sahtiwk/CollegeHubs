/**
 * models/InterviewTemplate.model.js
 *
 * Mongoose Schema for AI Interview Templates.
 * Allows admins to configure prompts, voice presets, and limits.
 */

const mongoose = require('mongoose');

const interviewTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    duration: {
      type: Number,
      default: 30, // in minutes
      min: [5, 'Duration must be at least 5 minutes'],
    },
    questionCount: {
      type: Number,
      default: 5,
      min: [1, 'Must ask at least 1 question'],
    },
    systemPrompt: {
      type: String,
      required: [true, 'System Prompt is required'],
    },
    evaluationPrompt: {
      type: String,
      required: [true, 'Evaluation Prompt is required'],
    },
    feedbackPrompt: {
      type: String,
      required: [true, 'Feedback Prompt is required'],
    },
    voiceId: {
      type: String,
      enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      default: 'alloy',
    },
    voiceSpeed: {
      type: Number,
      default: 1.0,
      min: [0.5, 'Speed cannot be less than 0.5'],
      max: [2.0, 'Speed cannot exceed 2.0'],
    },
    voicePitch: {
      type: Number,
      default: 1.0,
      min: [0.5, 'Pitch cannot be less than 0.5'],
      max: [2.0, 'Pitch cannot exceed 2.0'],
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewTemplate', interviewTemplateSchema);
