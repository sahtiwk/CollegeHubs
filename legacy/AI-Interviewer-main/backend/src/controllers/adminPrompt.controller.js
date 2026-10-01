/**
 * controllers/adminPrompt.controller.js
 *
 * Implements Prompt Management Controllers:
 *   - Fetches and updates active AI prompt contents
 *   - Auto-seeds baseline defaults on first launch (self-healing)
 *   - Appends version history updates
 *   - Restores previous version snapshots
 */

const SystemPrompt = require('../models/SystemPrompt.model');
const AppError     = require('../utils/AppError');

// ─── Default Prompts Dictionary (Self-Healing Seeds) ─────────────
const DEFAULT_PROMPTS = [
  {
    category: 'interview',
    name: 'Interview Conversation Follow-Up',
    description: 'Dictates the persona and speech formatting of the AI Interviewer during candidate voice sessions.',
    content: 'Act as an AI interviewer. The candidate just responded to the following question. Provide a brief, conversational, and direct 1-3 sentence follow-up or acknowledgment based ONLY on their answer. Do not return JSON. Just speak as an interviewer naturally.',
  },
  {
    category: 'resume_parser',
    name: 'Structured Resume & JD Extractor',
    description: 'Parses unstructured candidate files and job descriptions into standard schema layouts.',
    content: `You are an expert resume and job description parser.

Extract structured data in strict JSON format.

From Resume:
- name
- skills (array)
- experience (array of objects: role, company, duration, tech)
- projects (array: title, tech stack, description)
- education

From Job Description:
- role
- required_skills (array)
- preferred_skills (array)
- responsibilities (array)

Rules:
- Do not hallucinate
- If missing, return empty array or null
- Keep output strictly JSON`,
  },
  {
    category: 'ats_scorer',
    name: 'Candidate Alignment Match Scorer',
    description: 'Scores the relevance match rate between candidates and active platform listings.',
    content: `You are a strict technical recruiter evaluating a candidate's resume against a job description.

Analyze the match rate, compute a score out of 100, identify skill gaps, and provide recommendations.

Format output as JSON:
{
  "score": Number,
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "suggestion": "Detailed evaluation text..."
}`,
  },
  {
    category: 'career_coach',
    name: 'Interactive Career Coach Advice',
    description: 'Provides suggestions, skill benchmarks, and learning recommendations.',
    content: 'You are an empathetic, expert career coach. Analyze the user\'s resume, mock interview performance, and profile to provide helpful career guidance, tips for technical improvement, and interview preparation action plans.',
  },
  {
    category: 'job_recommendation',
    name: 'Platform Job Recommendations',
    description: 'Recommends matching job openings based on resume details.',
    content: 'Analyze the user\'s profile and skills, then match them to available listings. Return matches in JSON format detailing why they are a strong match and suggestions on how to improve application success rate.',
  },
  {
    category: 'feedback_report',
    name: 'Interview Session Final Report Evaluator',
    description: 'Calculates the overall mock interview score and formats summaries.',
    content: `You are a senior interviewer providing a final interview report. Evaluate the candidate's answers, score their communication, technical depth, and speed.

Format output as a structured report:
{
  "scores": {
    "technical": Number,
    "communication": Number
  },
  "strongPoints": ["point1", "point2"],
  "weakPoints": ["point3", "point4"],
  "detailedFeedback": "Overall feedback text..."
}`,
  },
];

// Seed defaults helper
const seedDefaultPrompts = async () => {
  for (const def of DEFAULT_PROMPTS) {
    const exists = await SystemPrompt.findOne({ category: def.category });
    if (!exists) {
      await SystemPrompt.create({
        ...def,
        version: 1,
        history: [{
          version: 1,
          content: def.content,
          changeReason: 'Seed Default Preset',
        }]
      });
    }
  }
};

// ─── GET /api/admin/prompts ────────────────────────────────────────
exports.getAllPrompts = async (req, res) => {
  // Ensure default prompts exist
  await seedDefaultPrompts();

  const prompts = await SystemPrompt.find().sort('name').populate({ path: 'lastUpdatedBy', select: 'name email' });
  res.status(200).json({ success: true, data: prompts });
};

// ─── GET /api/admin/prompts/:id ────────────────────────────────────
exports.getPromptById = async (req, res, next) => {
  const prompt = await SystemPrompt.findById(req.params.id)
    .populate({ path: 'lastUpdatedBy', select: 'name email' })
    .populate({ path: 'history.updatedBy', select: 'name email' });
    
  if (!prompt) return next(new AppError('Prompt category not found.', 404));
  res.status(200).json({ success: true, prompt });
};

// ─── PATCH /api/admin/prompts/:id ──────────────────────────────────
exports.updatePrompt = async (req, res, next) => {
  const { content, changeReason } = req.body;

  if (!content || !content.trim()) {
    return next(new AppError('Prompt content cannot be empty.', 400));
  }

  const prompt = await SystemPrompt.findById(req.params.id);
  if (!prompt) return next(new AppError('Prompt category not found.', 404));

  // Push current version into history log
  const prevHistoryItem = {
    version: prompt.version,
    content: prompt.content,
    changeReason: changeReason || 'Modified via Prompt Editor',
    updatedBy: req.admin._id,
    updatedAt: new Date(),
  };

  prompt.history.push(prevHistoryItem);
  prompt.content = content;
  prompt.version += 1;
  prompt.lastUpdatedBy = req.admin._id;

  await prompt.save();

  res.status(200).json({ success: true, prompt });
};

// ─── POST /api/admin/prompts/:id/restore ───────────────────────────
exports.restorePromptVersion = async (req, res, next) => {
  const { targetVersion } = req.body;

  if (!targetVersion) {
    return next(new AppError('Target version number is required.', 400));
  }

  const prompt = await SystemPrompt.findById(req.params.id);
  if (!prompt) return next(new AppError('Prompt category not found.', 404));

  // Search history log for the target version
  const historicItem = prompt.history.find(h => h.version === parseInt(targetVersion));
  // Check if current matches
  if (prompt.version === parseInt(targetVersion)) {
    return next(new AppError('Target version is already the active version.', 400));
  }

  if (!historicItem && parseInt(targetVersion) !== 1) {
    return next(new AppError('Specified version not found in history logs.', 404));
  }

  // Push current active content into history
  const activeHistory = {
    version: prompt.version,
    content: prompt.content,
    changeReason: `Reverted active prompt back to version v${targetVersion}`,
    updatedBy: req.admin._id,
    updatedAt: new Date(),
  };
  prompt.history.push(activeHistory);

  // Restore content
  prompt.content = historicItem ? historicItem.content : prompt.history[0].content; // fallback to seed
  prompt.version += 1;
  prompt.lastUpdatedBy = req.admin._id;

  await prompt.save();

  res.status(200).json({
    success: true,
    message: `Successfully restored prompt to version v${targetVersion}. Current active version is now v${prompt.version}`,
    prompt
  });
};
