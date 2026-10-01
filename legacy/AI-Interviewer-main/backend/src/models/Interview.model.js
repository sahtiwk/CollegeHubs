const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  category: {
    type: String,
    enum: ['technical', 'behavioral', 'situational', 'hr', 'culture_fit'],
    default: 'technical',
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  expectedKeywords: [String],
  order: { type: Number, default: 0 },
});

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    jobDescription: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [5000, 'Job description cannot exceed 5000 characters'],
    },
    company: {
      type: String,
      trim: true,
      default: null,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
      default: 'mid',
    },
    questionTypes: {
      type: [String],
      enum: ['technical', 'behavioral', 'situational', 'hr', 'culture_fit'],
      default: ['technical', 'behavioral'],
    },
    numberOfQuestions: {
      type: Number,
      min: 3,
      max: 20,
      default: 10,
    },
    questions: [questionSchema],
    status: {
      type: String,
      enum: ['draft', 'ready', 'in_progress', 'completed'],
      default: 'draft',
    },
    generationStatus: {
      type: String,
      enum: ['pending', 'generating', 'generated', 'failed'],
      default: 'pending',
    },
    generationError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interview', interviewSchema);
