const Interview = require('../models/Interview.model');
const Resume = require('../models/Resume.model');
const AppError = require('../utils/AppError');
const { generateInterviewQuestions } = require('../services/ai.service');

// ─── POST /api/interviews ─────────────────────────────────────────
exports.createInterview = async (req, res, next) => {
  const {
    jobTitle,
    jobDescription,
    company,
    experienceLevel,
    questionTypes,
    numberOfQuestions,
    resumeId,
  } = req.body;

  const interview = await Interview.create({
    userId: req.user._id,
    jobTitle,
    jobDescription,
    company,
    experienceLevel,
    questionTypes,
    numberOfQuestions,
    resumeId: resumeId || null,
    status: 'draft',
    generationStatus: 'pending',
  });

  res.status(201).json({ success: true, interview });
};

// ─── POST /api/interviews/:id/generate ────────────────────────────
exports.generateQuestions = async (req, res, next) => {
  const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id });
  if (!interview) return next(new AppError('Interview not found.', 404));

  if (interview.generationStatus === 'generating') {
    return next(new AppError('Questions are already being generated.', 400));
  }

  // Fetch resume text if linked
  let resumeText = null;
  if (interview.resumeId) {
    const resume = await Resume.findById(interview.resumeId).select('extractedText');
    resumeText = resume?.extractedText ?? null;
  }

  // Update status
  interview.generationStatus = 'generating';
  await interview.save();

  try {
    const questions = await generateInterviewQuestions({
      jobTitle: interview.jobTitle,
      jobDescription: interview.jobDescription,
      experienceLevel: interview.experienceLevel,
      numberOfQuestions: interview.numberOfQuestions,
      resumeText,
    });

    interview.questions = questions;
    interview.generationStatus = 'generated';
    interview.status = 'ready';
    await interview.save();

    res.status(200).json({
      success: true,
      message: `${questions.length} questions generated successfully.`,
      interview,
    });
  } catch (err) {
    interview.generationStatus = 'failed';
    interview.generationError = err.message;
    await interview.save();
    return next(new AppError(`AI generation failed: ${err.message}`, 500));
  }
};

// ─── GET /api/interviews ──────────────────────────────────────────
exports.getMyInterviews = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [interviews, total] = await Promise.all([
    Interview.find({ userId: req.user._id })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .select('-questions'),
    Interview.countDocuments({ userId: req.user._id }),
  ]);

  res.status(200).json({
    success: true,
    count: interviews.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    interviews,
  });
};

// ─── GET /api/interviews/:id ──────────────────────────────────────
exports.getInterviewById = async (req, res, next) => {
  const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id })
    .populate({ path: 'resumeId', select: 'originalName fileUrl' });

  if (!interview) return next(new AppError('Interview not found.', 404));
  res.status(200).json({ success: true, interview });
};

// ─── DELETE /api/interviews/:id ───────────────────────────────────
exports.deleteInterview = async (req, res, next) => {
  const interview = await Interview.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!interview) return next(new AppError('Interview not found.', 404));
  res.status(200).json({ success: true, message: 'Interview deleted.' });
};
