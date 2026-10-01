'use strict';

/**
 * jobs.controller.js
 *
 * HTTP request/response boundary only.
 * All business logic stays in adzuna.service.js and the utils pipeline.
 *
 * Uses responseFormatter for consistent JSON envelopes.
 */

const adzunaService = require('../services/adzuna.service');
const Resume = require('../models/Resume.model');
const { matchUserToJobs } = require('../services/jobMatchService');
const { generateQuestionsDirect } = require('../services/ai.service');
const jobSearchService = require('../services/jobSearchService');
const {
  formatSearchResponse,
  formatJobDetail,
  formatCategories,
  formatValidationError,
} = require('../utils/responseFormatter');

// ─── Search Jobs ──────────────────────────────────────────────────────────────
/**
 * GET /api/jobs/search
 *
 * Spec §2.1: GET /jobs/search?q=...&page=1
 *
 * Query params:
 * @param {string}  [q]         - Natural-language query (primary, parsed by Query Parser)
 * @param {string}  [what]      - Keyword override (takes precedence over q)
 * @param {string}  [where]     - Location override
 * @param {number}  [page=1]    - Page number (1–50)
 * @param {number}  [results=20]- Results per page (1–50)
 * @param {string}  [country]   - 2-letter ISO country code
 * @param {string}  [category]  - Adzuna category tag
 * @param {string}  [contract]  - full_time | part_time | contract | permanent
 * @param {number}  [salaryMin] - Minimum salary
 * @param {number}  [salaryMax] - Maximum salary
 * @param {string}  [sortBy]    - date | salary | relevance
 * @param {string}  [sortDir]   - up | down
 *
 * Response 200 (§2.9):
 * {
 *   "page"    : 1,
 *   "total"   : 120,
 *   "results" : [
 *     { "title", "company", "location", "salary", "summary", "apply_url",
 *       "id", "skills", "posted_at", "score" }
 *   ],
 *   "totalPages"        : 6,
 *   "hasNextPage"        : true,
 *   "rawQuery"          : "python backend remote",
 *   "queryMeta"         : { "parser": "rule-based", "ambiguityScore": 10 },
 *   "duplicatesRemoved" : 3,
 *   "_cache"            : { "hit": false }  // non-production only
 * }
 */
const searchJobs = async (req, res) => {
  const {
    q,
    what,
    where,
    country,
    page        = 1,
    results     = 20,
    category,
    contract,
    salaryMin,
    salaryMax,
    sortBy      = 'relevance',
    sortDir     = 'down',
  } = req.query;

  const data = await adzunaService.searchJobs({
    q,
    what,
    where,
    country,
    page     : Number(page),
    results  : Number(results),
    category,
    contract,
    salaryMin,
    salaryMax,
    sortBy,
    sortDir,
  });

  res.status(200).json(
    formatSearchResponse({
      jobs             : data.jobs,
      total            : data.count,
      page             : data.page,
      pagination       : data.pagination,
      rawQuery         : q || null,
      queryMeta        : data.queryMeta,
      duplicatesRemoved: data.duplicatesRemoved,
      cacheInfo        : process.env.NODE_ENV !== 'production' || data.isFallback
        ? { hit: data.cacheHit, fallback: data.isFallback }
        : undefined,
    })
  );
};

// ─── Get Single Job ───────────────────────────────────────────────────────────
/**
 * GET /api/jobs/:id
 *
 * Spec §2.1: GET /jobs/:id
 *
 * @param {string} req.params.id  - Adzuna numeric job ID
 * @param {string} [req.query.country] - Optional 2-letter country code
 *
 * Response 200:
 * {
 *   success: true,
 *   data: Job   // normalised + scored single job
 * }
 */
const getJobById = async (req, res) => {
  const { id }      = req.params;
  const { country } = req.query;

  const job = await adzunaService.getJobById(id, country);

  res.status(200).json(formatJobDetail(job));
};

// ─── Get Categories ───────────────────────────────────────────────────────────
/**
 * GET /api/jobs/categories
 *
 * Query param: country (optional)
 */
const getCategories = async (req, res) => {
  const { country } = req.query;

  const categories = await adzunaService.getCategories(country);

  res.status(200).json(formatCategories(categories));
};

const getRecommendedJobs = async (req, res) => {
  const userId = req.user._id;

  // 1. Fetch user's default resume, or fallback to the most recently updated one
  let resume = await Resume.findOne({ userId, isDefault: true }).lean();
  if (!resume) {
    resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 }).lean();
  }

  if (!resume || !resume.parsedData || !Array.isArray(resume.parsedData.skills)) {
    return res.status(200).json({
      success: true,
      message: 'Please upload and parse your resume to get personalized recommendations.',
      results: [],
    });
  }

  const userSkills = resume.parsedData.skills;

  // 2. Query matching jobs matching >= 60%
  const recommendedJobs = await matchUserToJobs(userSkills);

  res.status(200).json({
    success: true,
    results: recommendedJobs,
  });
};

const generateQuestionsFromDesc = async (req, res, next) => {
  const { jobTitle, jobDescription } = req.body;
  try {
    const questions = await generateQuestionsDirect(jobTitle, jobDescription);
    res.status(200).json({
      success: true,
      questions,
    });
  } catch (err) {
    next(err);
  }
};

const { getFilteredJobs } = require('../services/postgresJobService');

const getActiveJobsList = async (req, res, next) => {
  try {
    const data = await getFilteredJobs(req.query);
    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchJobs, getJobById, getCategories, getRecommendedJobs, generateQuestionsFromDesc, getActiveJobsList };
