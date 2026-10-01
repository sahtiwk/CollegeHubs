const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  questionText: { type: String },
  answerText: { type: String, default: '' },
  answerAudio: { type: String, default: null }, // Cloudinary URL
  timeTaken: { type: Number, default: 0 },      // in seconds
  aiFeedback: { type: String, default: null },
  aiScore: { type: Number, min: 0, max: 10, default: null },
  skipped: { type: Boolean, default: false },
});

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
    },
    answers: [answerSchema],
    status: {
      type: String,
      enum: ['started', 'in_progress', 'completed', 'abandoned'],
      default: 'started',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    totalTimeTaken: {
      type: Number,
      default: 0, // in seconds
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    overallFeedback: {
      type: String,
      default: null,
    },
    strengths: [String],
    areasForImprovement: [String],
    recommendedResources: [String],
  },
  { timestamps: true }
);

// Auto-calculate overall score from individual answers
sessionSchema.methods.calculateOverallScore = function () {
  const scoredAnswers = this.answers.filter((a) => a.aiScore !== null);
  if (scoredAnswers.length === 0) return 0;
  const total = scoredAnswers.reduce((sum, a) => sum + a.aiScore, 0);
  return Math.round((total / (scoredAnswers.length * 10)) * 100);
};

module.exports = mongoose.model('Session', sessionSchema);
