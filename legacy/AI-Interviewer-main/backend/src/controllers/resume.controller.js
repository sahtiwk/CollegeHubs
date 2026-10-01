const pdf = require('pdf-parse');
const Resume = require('../models/Resume.model');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');
const { parseResumeAndJD } = require('../services/ai.service');
const { chunkDocument, chunkResumeAndJD, estimateTokens } = require('../services/chunking.service');
const { normalizeText } = require('../utils/normalizer');


// ─── POST /api/resumes/upload ─────────────────────────────────────
exports.uploadResume = async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a file.', 400));
  }

  const { path: fileUrl, originalname, filename, size, mimetype } = req.file;

  // Extract text from PDF for AI context
  let extractedText = null;
  let parseStatus = 'pending';

  try {
    if (mimetype === 'application/pdf') {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdf(buffer);
      extractedText = pdfData.text?.slice(0, 8000) ?? null; // Limit to 8k chars
      parseStatus = 'parsed';
    }
  } catch {
    parseStatus = 'failed';
  }

  // AI-powered structured extraction (resume-only, no JD needed)
  let parsedData = null;
  let isParsed = false;
  if (extractedText) {
    try {
      parsedData = await parseResumeAndJD(extractedText, '');
      isParsed = true;
    } catch {
      // Non-fatal — raw text still stored
    }
  }

  const resume = await Resume.create({
    userId: req.user._id,
    fileName: filename,
    originalName: originalname,
    fileUrl,
    publicId: req.file.public_id || filename,
    fileSize: size,
    mimeType: mimetype,
    extractedText,
    parseStatus,
    parsedData,
    isParsed,
    isDefault: false,
  });

  // Auto-set as default if first resume
  const count = await Resume.countDocuments({ userId: req.user._id });
  if (count === 1) {
    resume.isDefault = true;
    await resume.save();
  }

  res.status(201).json({ success: true, resume });
};

// ─── GET /api/resumes ─────────────────────────────────────────────
exports.getMyResumes = async (req, res) => {
  const resumes = await Resume.find({ userId: req.user._id }).sort('-createdAt');
  res.status(200).json({ success: true, count: resumes.length, resumes });
};

// ─── DELETE /api/resumes/:id ──────────────────────────────────────
exports.deleteResume = async (req, res, next) => {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
  if (!resume) return next(new AppError('Resume not found.', 404));

  // Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(resume.publicId, { resource_type: 'raw' });
  } catch {
    // Log but don't fail deletion
  }

  await resume.deleteOne();
  res.status(200).json({ success: true, message: 'Resume deleted successfully.' });
};

// ─── PATCH /api/resumes/:id/default ──────────────────────────────
exports.setDefaultResume = async (req, res, next) => {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
  if (!resume) return next(new AppError('Resume not found.', 404));

  resume.isDefault = true;
  await resume.save(); // pre-save hook clears old defaults

  res.status(200).json({ success: true, message: 'Default resume updated.', resume });
};

// ─── POST /api/resumes/:id/parse ──────────────────────────────────
// Re-parse resume with an optional job description for richer context
exports.parseResume = async (req, res, next) => {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
  if (!resume) return next(new AppError('Resume not found.', 404));

  if (!resume.extractedText) {
    return next(new AppError('No text extracted from this resume. Upload a valid PDF.', 400));
  }

  const jdText = req.body.jobDescription || '';

  try {
    const parsedData = await parseResumeAndJD(resume.extractedText, jdText);
    resume.parsedData = parsedData;
    resume.isParsed = true;
    await resume.save();

    res.status(200).json({ success: true, parsedData });
  } catch (err) {
    return next(new AppError(`AI parsing failed: ${err.message}`, 500));
  }
};

// ─── POST /api/resumes/chunk-preview ──────────────────────────────
// Debug endpoint: run semantic chunker on raw text, view metadata-tagged output
exports.chunkPreview = async (req, res, next) => {
  const { resumeText = '', jobDescription = '' } = req.body;

  if (!resumeText && !jobDescription) {
    return next(new AppError('Provide at least one of resumeText or jobDescription.', 400));
  }

  const chunks = chunkResumeAndJD(resumeText, jobDescription);

  const enriched = chunks.map((chunk, i) => ({
    index:             i,
    content:           chunk.content,
    normalizedContent: normalizeText(chunk.content),
    metadata:          chunk.metadata,
    estimatedTokens:   estimateTokens(chunk.content),
    charCount:         chunk.content.length,
  }));

  const summary = {
    totalChunks:       enriched.length,
    resumeChunks:      enriched.filter((c) => c.metadata.type === 'resume').length,
    jdChunks:          enriched.filter((c) => c.metadata.type === 'job_description').length,
    sectionsFound:     [...new Set(enriched.map((c) => c.metadata.section))],
    avgTokensPerChunk: Math.round(enriched.reduce((s, c) => s + c.estimatedTokens, 0) / (enriched.length || 1)),
    maxTokensInChunk:  Math.max(...enriched.map((c) => c.estimatedTokens)),
  };

  res.status(200).json({ success: true, summary, chunks: enriched });
};

