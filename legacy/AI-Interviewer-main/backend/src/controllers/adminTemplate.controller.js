/**
 * controllers/adminTemplate.controller.js
 *
 * CRUD actions for AI Interview Templates.
 * Allows managing prompt triggers, languages, and voice settings.
 */

const InterviewTemplate = require('../models/InterviewTemplate.model');
const AppError          = require('../utils/AppError');

// ─── POST /api/admin/templates ─────────────────────────────────────
exports.createTemplate = async (req, res, next) => {
  const {
    name, difficulty, duration, questionCount, systemPrompt,
    evaluationPrompt, feedbackPrompt, voiceId, voiceSpeed, voicePitch, language
  } = req.body;

  if (!name || !systemPrompt || !evaluationPrompt || !feedbackPrompt) {
    return next(new AppError('Template name and all prompts are required.', 400));
  }

  const template = await InterviewTemplate.create({
    name: name.trim(),
    difficulty: difficulty || 'medium',
    duration: duration || 30,
    questionCount: questionCount || 5,
    systemPrompt,
    evaluationPrompt,
    feedbackPrompt,
    voiceId: voiceId || 'alloy',
    voiceSpeed: voiceSpeed || 1.0,
    voicePitch: voicePitch || 1.0,
    language: language || 'en',
    postedBy: req.admin._id,
  });

  res.status(201).json({ success: true, template });
};

// ─── GET /api/admin/templates ──────────────────────────────────────
exports.getAllTemplates = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip  = (page - 1) * limit;
  const search     = req.query.search || '';
  const difficulty = req.query.difficulty;

  const filter = {};
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (difficulty && difficulty !== 'all') {
    filter.difficulty = difficulty;
  }

  const [templates, total] = await Promise.all([
    InterviewTemplate.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({ path: 'postedBy', select: 'name email' }),
    InterviewTemplate.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { templates, total, page, pages: Math.ceil(total / limit) },
  });
};

// ─── GET /api/admin/templates/:id ──────────────────────────────────
exports.getTemplateById = async (req, res, next) => {
  const template = await InterviewTemplate.findById(req.params.id)
    .populate({ path: 'postedBy', select: 'name email' });
  if (!template) return next(new AppError('Template not found.', 404));
  res.status(200).json({ success: true, template });
};

// ─── PATCH /api/admin/templates/:id ────────────────────────────────
exports.updateTemplate = async (req, res, next) => {
  const {
    name, difficulty, duration, questionCount, systemPrompt,
    evaluationPrompt, feedbackPrompt, voiceId, voiceSpeed, voicePitch, language
  } = req.body;

  const template = await InterviewTemplate.findById(req.params.id);
  if (!template) return next(new AppError('Template not found.', 404));

  const allowedFields = {};
  if (name !== undefined)             allowedFields.name             = name.trim();
  if (difficulty !== undefined)       allowedFields.difficulty       = difficulty;
  if (duration !== undefined)         allowedFields.duration         = duration;
  if (questionCount !== undefined)    allowedFields.questionCount    = questionCount;
  if (systemPrompt !== undefined)     allowedFields.systemPrompt     = systemPrompt;
  if (evaluationPrompt !== undefined) allowedFields.evaluationPrompt = evaluationPrompt;
  if (feedbackPrompt !== undefined)   allowedFields.feedbackPrompt   = feedbackPrompt;
  if (voiceId !== undefined)          allowedFields.voiceId          = voiceId;
  if (voiceSpeed !== undefined)       allowedFields.voiceSpeed       = voiceSpeed;
  if (voicePitch !== undefined)       allowedFields.voicePitch       = voicePitch;
  if (language !== undefined)         allowedFields.language         = language.trim();

  const updated = await InterviewTemplate.findByIdAndUpdate(req.params.id, allowedFields, {
    new: true, runValidators: true,
  });

  res.status(200).json({ success: true, template: updated });
};

// ─── DELETE /api/admin/templates/:id ───────────────────────────────
exports.deleteTemplate = async (req, res, next) => {
  const template = await InterviewTemplate.findByIdAndDelete(req.params.id);
  if (!template) return next(new AppError('Template not found.', 404));
  res.status(200).json({ success: true, message: 'Interview template deleted.' });
};
