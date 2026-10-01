'use strict';

/**
 * scoringEngine.js — §2.7 Deterministic Scoring Algorithm
 *
 * Assigns a numeric relevance score (0–100) to each job.
 * Zero LLM involvement — fully deterministic, O(n) per result set.
 *
 * Score formula (spec §2.7):
 *   Score = (KeywordMatch * 0.4) +
 *           (Recency      * 0.2) +
 *           (SalaryScore  * 0.2) +
 *           (LocationMatch* 0.1) +
 *           (ExperienceMatch*0.1)
 *
 * Each dimension returns a value in [0, 1].
 * Final score is multiplied by 100 → integer in [0, 100].
 *
 * User context is read from the parsed query params:
 *   params.what       → keywords for KeywordMatch
 *   params.where      → location string for LocationMatch
 *   params.remote     → boolean for LocationMatch
 *   params.salaryMin  → expected minimum salary for SalaryScore
 *   params.experience → expected years of experience for ExperienceMatch
 */

// ─── Dimension 1: Keyword Match (weight 0.4) ─────────────────────────────────

/**
 * Tokenize a string into lowercase words, stripping punctuation.
 *
 * @param {string} str
 * @returns {string[]}
 */
function tokenize(str) {
  if (!str) return [];
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Keyword Match — simple weighted overlap across title, skills, description.
 *
 *   score = matched_keywords / total_keywords   (spec §2.7)
 *
 * Weighting strategy:
 *   Title match   counts as weight 3 (highest signal)
 *   Skills match  counts as weight 2
 *   Description   counts as weight 1
 *
 * The final ratio is normalised to [0, 1] using the weighted denominator.
 *
 * @param {object} job
 * @param {string} what - Raw keyword string from query params
 * @returns {number} 0–1
 */
function keywordScore(job, what) {
  if (!what) return 0.5; // no keyword filter → neutral

  const queryTokens = tokenize(what);
  if (queryTokens.length === 0) return 0.5;

  const titleTokens  = new Set(tokenize(job.title));
  const skillTokens  = new Set(
    Array.isArray(job.skills)
      ? job.skills.flatMap((s) => tokenize(s))
      : []
  );
  const descTokens   = new Set(tokenize(job.description?.slice(0, 2000))); // cap for speed

  let weightedMatches = 0;
  const WEIGHT_TITLE  = 3;
  const WEIGHT_SKILL  = 2;
  const WEIGHT_DESC   = 1;
  const MAX_WEIGHT    = WEIGHT_TITLE + WEIGHT_SKILL + WEIGHT_DESC; // 6 per token

  for (const token of queryTokens) {
    let w = 0;
    if (titleTokens.has(token))  w += WEIGHT_TITLE;
    if (skillTokens.has(token))  w += WEIGHT_SKILL;
    if (descTokens.has(token))   w += WEIGHT_DESC;
    weightedMatches += w;
  }

  const maxPossible = queryTokens.length * MAX_WEIGHT;
  return maxPossible === 0 ? 0 : Math.min(1, weightedMatches / maxPossible);
}

// ─── Dimension 2: Recency (weight 0.2) ───────────────────────────────────────

/**
 * Recency Score — exponential decay (spec §2.7):
 *   score = Math.exp(-0.1 * days_old)
 *
 * Day 0  → 1.000
 * Day 7  → 0.497
 * Day 14 → 0.247
 * Day 30 → 0.050
 * Day 60 → 0.002
 *
 * @param {object} job
 * @returns {number} 0–1
 */
function recencyScore(job) {
  if (!job.posted_at) return 0.1; // unknown posting date → low score

  const postedMs = new Date(job.posted_at).getTime();
  if (isNaN(postedMs)) return 0.1;

  const daysOld = Math.max(0, (Date.now() - postedMs) / (1000 * 60 * 60 * 24));
  return Math.exp(-0.1 * daysOld);
}

// ─── Dimension 3: Salary Score (weight 0.2) ──────────────────────────────────

/**
 * Salary Score (spec §2.7):
 *   If user specifies expected salary (salaryMin):
 *     if (job.salary_max >= expected)  score = 1
 *     else                             score = job.salary_max / expected
 *
 *   If no user salary expectation:
 *     disclosed salary ranges → 0.8 (transparency bonus)
 *     partial disclosure      → 0.5
 *     no salary at all        → 0.1
 *
 * @param {object} job
 * @param {number|null} expectedSalary - User's minimum salary expectation
 * @returns {number} 0–1
 */
function salaryScore(job, expectedSalary) {
  const jobMax = job.salary_max;
  const jobMin = job.salary_min;

  // User has specified a salary expectation
  if (expectedSalary && expectedSalary > 0) {
    if (!jobMax) return 0.1; // no salary info — can't evaluate
    return jobMax >= expectedSalary ? 1 : jobMax / expectedSalary;
  }

  // No user expectation — reward transparency
  if (jobMin && jobMax) return 0.8;
  if (jobMin || jobMax) return 0.5;
  return 0.1;
}

// ─── Dimension 4: Location Match (weight 0.1) ────────────────────────────────

/**
 * Location Score (spec §2.7):
 *   remote match  → 1.0
 *   same city     → 1.0
 *   different city→ 0.5
 *   no filter     → 0.5 (neutral)
 *
 * @param {object}  job
 * @param {string}  where  - Location string from query params
 * @param {boolean} remote - Whether user searched for remote jobs
 * @returns {number} 0–1
 */
function locationScore(job, where, remote) {
  // Remote match: user wants remote AND job is remote
  if (remote) {
    const isRemote = /remote/i.test(job.location ?? '') ||
                     /remote/i.test(job.contract  ?? '');
    return isRemote ? 1.0 : 0.3;
  }

  // No location preference
  if (!where) return 0.5;

  const jobLoc   = (job.location ?? '').toLowerCase().trim();
  const userLoc  = where.toLowerCase().trim();

  if (!jobLoc) return 0.3; // job has no location info

  // Exact or near-exact city match
  if (jobLoc === userLoc) return 1.0;

  // Token overlap — handles "London, UK" matching "London"
  const jobTokens  = new Set(tokenize(jobLoc));
  const userTokens = tokenize(userLoc);

  const matched = userTokens.filter((t) => jobTokens.has(t)).length;
  if (matched === userTokens.length) return 1.0;   // all tokens match
  if (matched > 0)                   return 0.5;   // partial match (different city/region)
  return 0.3;                                       // no overlap
}

// ─── Dimension 5: Experience Match (weight 0.1) ──────────────────────────────

// Seniority → typical experience range (mid-point used for gap calculation)
const SENIORITY_MAP = [
  { regex: /\bjunior\b|\bgrad(?:uate)?\b|\bentry[\s-]?level\b/i, years: 1  },
  { regex: /\bassociate\b/i,                                       years: 2  },
  { regex: /\bmid[\s-]?level\b/i,                                 years: 3  },
  { regex: /\bsenior\b|\bsr\b/i,                                  years: 5  },
  { regex: /\blead\b/i,                                           years: 7  },
  { regex: /\bstaff\b/i,                                          years: 8  },
  { regex: /\bprincipal\b/i,                                      years: 10 },
  { regex: /\bdirector\b/i,                                       years: 12 },
  { regex: /\bvp\b|\bvice\s+president\b/i,                       years: 15 },
];

const EXPLICIT_EXP_RE = /\b(\d{1,2})\s*[+]?\s*(?:years?|yrs?)\b/i;

/**
 * Infer the experience level (years) required by a job from its title
 * and the first 500 chars of its description.
 *
 * @param {object} job
 * @returns {number|null} Estimated required experience in years, or null
 */
function inferJobExperience(job) {
  const corpus = `${job.title ?? ''} ${(job.description ?? '').slice(0, 500)}`;

  // 1. Explicit years ("5+ years experience")
  const m = EXPLICIT_EXP_RE.exec(corpus);
  if (m) return parseInt(m[1], 10);

  // 2. Seniority keyword
  for (const { regex, years } of SENIORITY_MAP) {
    if (regex.test(corpus)) return years;
  }

  return null;
}

/**
 * Experience Match Score (spec §2.7):
 *   diff = abs(user_experience - job_experience)
 *   → lower diff = higher score
 *
 * Gap → Score mapping:
 *   0 years  → 1.00 (perfect fit)
 *   1 year   → 0.85
 *   2 years  → 0.70
 *   3 years  → 0.50
 *   4 years  → 0.30
 *   5+ years → 0.10
 *
 * @param {object}     job
 * @param {number|null} userExperience - Years from query params
 * @returns {number} 0–1
 */
function experienceScore(job, userExperience) {
  if (userExperience === null || userExperience === undefined) return 0.5;

  const jobExperience = inferJobExperience(job);
  if (jobExperience === null) return 0.5; // can't determine → neutral

  const diff = Math.abs(userExperience - jobExperience);

  if (diff === 0)  return 1.00;
  if (diff === 1)  return 0.85;
  if (diff === 2)  return 0.70;
  if (diff === 3)  return 0.50;
  if (diff === 4)  return 0.30;
  return 0.10;
}

// ─── Final Score Function ─────────────────────────────────────────────────────

/**
 * Compute a deterministic relevance score for a single job.
 *
 * Spec §2.7 formula:
 *   Score = (KeywordMatch * 0.4) + (Recency * 0.2) + (SalaryScore * 0.2) +
 *           (LocationMatch * 0.1) + (ExperienceMatch * 0.1)
 *
 * @param {object} job    - Normalised job (§2.5 internal schema)
 * @param {object} params - Parsed query params (what, where, remote, salaryMin, experience)
 * @returns {object} job with { score: number, scoreBreakdown: object } attached
 */
function computeScore(job, params = {}) {
  const { what, where, remote = false, salaryMin, experience } = params;

  const kw  = keywordScore   (job, what);
  const rec = recencyScore   (job);
  const sal = salaryScore    (job, salaryMin ?? null);
  const loc = locationScore  (job, where, remote);
  const exp = experienceScore(job, experience ?? null);

  const raw = kw * 0.4 + rec * 0.2 + sal * 0.2 + loc * 0.1 + exp * 0.1;

  return {
    ...job,
    score: Math.round(Math.min(100, raw * 100)),
    scoreBreakdown: {
      keywordMatch    : +(kw  * 100).toFixed(1),
      recency         : +(rec * 100).toFixed(1),
      salaryScore     : +(sal * 100).toFixed(1),
      locationMatch   : +(loc * 100).toFixed(1),
      experienceMatch : +(exp * 100).toFixed(1),
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Score and sort an array of normalised jobs.
 * Returns jobs sorted highest score first.
 *
 * @param {object[]} jobs
 * @param {object}   params
 * @returns {object[]}
 */
function scoreJobs(jobs, params = {}) {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];
  return jobs
    .map((job) => computeScore(job, params))
    .sort((a, b) => b.score - a.score);
}

/**
 * Score a single job (used for detail view).
 *
 * @param {object} job
 * @param {object} params
 * @returns {object}
 */
function scoreJob(job, params = {}) {
  return computeScore(job, params);
}

module.exports = {
  scoreJobs,
  scoreJob,
  computeScore,
  // Exported for unit testing each dimension independently
  keywordScore,
  recencyScore,
  salaryScore,
  locationScore,
  experienceScore,
  inferJobExperience,
};
