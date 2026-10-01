'use strict';

/**
 * responseFormatter.js — §2.9 Response Format
 *
 * Converts internal job objects (§2.5 schema) into the clean public API shape:
 *
 *   {
 *     "page"   : 1,
 *     "total"  : 120,
 *     "results": [
 *       {
 *         "title"    : "Senior Python Backend Engineer",
 *         "company"  : "XYZ",
 *         "location" : "Remote",
 *         "salary"   : "₹15L–₹25L",
 *         "summary"  : "Build scalable APIs...",
 *         "apply_url": "https://..."
 *       }
 *     ]
 *   }
 *
 * Extended fields (useful for UI — not "bloated" internal fields):
 *   id, skills, posted_at, score, totalPages, hasNextPage
 *
 * Internal fields NEVER exposed: raw description, scoreBreakdown,
 *   salary_min/max (numbers), salary_currency, contract, category, source.
 */

// ─── Salary Formatter ────────────────────────────────────────────────────────

const CURRENCY_SYMBOL = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  INR: '₹',
  AUD: 'A$',
  CAD: 'CA$',
  NZD: 'NZ$',
  SGD: 'S$',
  ZAR: 'R',
  RUB: '₽',
};

/**
 * Format a salary value into a compact human-readable string.
 *
 * INR uses Lakh notation  (100,000 = 1L):  "₹15L"
 * All others use K notation (1,000 = 1K):  "£60K"
 *
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
function formatAmount(amount, currency) {
  const sym = CURRENCY_SYMBOL[currency] ?? currency ?? '';

  if (currency === 'INR') {
    const lakhs = amount / 100_000;
    // Show one decimal only when needed: 1.5L but 15L
    return `${sym}${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)}L`;
  }

  const k = amount / 1_000;
  return `${sym}${k % 1 === 0 ? k : k.toFixed(1)}K`;
}

/**
 * Build a human-readable salary range string.
 *
 * Examples:
 *   "₹15L–₹25L"   (INR, range)
 *   "£60K–£80K"   (GBP, range)
 *   "$80K+"        (USD, min only)
 *   "Up to €70K"  (EUR, max only)
 *   null           (no data)
 *
 * @param {number|null} min
 * @param {number|null} max
 * @param {string}      currency
 * @returns {string|null}
 */
function formatSalary(min, max, currency = 'GBP') {
  if (!min && !max) return null;

  const cur = (currency || 'GBP').toUpperCase();

  if (min && max) {
    return `${formatAmount(min, cur)}–${formatAmount(max, cur)}`;
  }
  if (min) {
    return `${formatAmount(min, cur)}+`;
  }
  return `Up to ${formatAmount(max, cur)}`;
}

// ─── Summary Builder ─────────────────────────────────────────────────────────

const SUMMARY_MAX_CHARS = 180;

/**
 * Build a short plain-text summary from a full description.
 * The description is already HTML-stripped (§2.5 normalizer).
 * We take the first complete sentence or truncate at SUMMARY_MAX_CHARS.
 *
 * @param {string} description
 * @returns {string|null}
 */
function buildSummary(description) {
  if (!description) return null;

  // Collapse newlines to spaces for the summary
  const flat = description.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (flat.length <= SUMMARY_MAX_CHARS) return flat;

  // Try to cut at a sentence boundary within the limit
  const sentenceEnd = flat.slice(0, SUMMARY_MAX_CHARS).lastIndexOf('.');
  if (sentenceEnd > SUMMARY_MAX_CHARS * 0.5) {
    return flat.slice(0, sentenceEnd + 1);
  }

  // Fall back to word boundary
  const wordEnd = flat.slice(0, SUMMARY_MAX_CHARS).lastIndexOf(' ');
  return `${flat.slice(0, wordEnd > 0 ? wordEnd : SUMMARY_MAX_CHARS)}…`;
}

// ─── Job Presenter ────────────────────────────────────────────────────────────

/**
 * Map a single internal job object (§2.5) to the §2.9 public API shape.
 *
 * Fields exposed:
 *   §2.9 required : title, company, location, salary, summary, apply_url
 *   Extended UI   : id, skills, posted_at, score
 *
 * Fields suppressed (internal only):
 *   description, scoreBreakdown, salary_min, salary_max, salary_currency,
 *   source, contract, category, raw Adzuna fields.
 *
 * @param {object} job - Internal job object from scoringEngine / normalizer
 * @returns {object}
 */
function presentJob(job) {
  return {
    // ── §2.9 required fields ──────────────────────────────────────────
    title    : job.title     ?? null,
    company  : job.company   ?? null,
    location : job.location  ?? null,
    salary   : formatSalary(job.salary_min, job.salary_max, job.salary_currency),
    summary  : buildSummary(job.description),
    apply_url: job.url       ?? null,

    // ── Extended UI fields (useful but not bloated) ───────────────────
    id        : job.id        ?? null,
    skills    : job.skills    ?? [],
    posted_at : job.posted_at ?? null,
    score     : job.score     ?? null,  // 0–100 relevance score
  };
}

// ─── Search Response (§2.9) ──────────────────────────────────────────────────

/**
 * Format a paginated job search response in the exact §2.9 shape.
 *
 * @param {object}   opts
 * @param {object[]} opts.jobs               - Scored & normalised job objects (page slice)
 * @param {number}   opts.total              - Total jobs in the sorted list
 * @param {number}   opts.page               - Current page number
 * @param {object}   opts.pagination         - Output of slicePage().meta
 * @param {string}   [opts.rawQuery]         - Original q string echoed for UI
 * @param {object}   [opts.queryMeta]        - { parser, ambiguityScore }
 * @param {number}   [opts.duplicatesRemoved]- Dedup count
 * @param {object}   [opts.cacheInfo]        - { hit: boolean } — dev only
 * @returns {object}
 */
function formatSearchResponse({
  jobs,
  total,
  page,
  pagination,
  rawQuery,
  queryMeta,
  duplicatesRemoved,
  cacheInfo,
} = {}) {
  const response = {
    page   : page     ?? 1,
    total  : total    ?? 0,
    results: (jobs ?? []).map(presentJob),
  };

  // Extended top-level pagination helpers
  if (pagination) {
    response.totalPages  = pagination.totalPages  ?? null;
    response.hasNextPage = pagination.hasNextPage  ?? false;
    response.hasPrevPage = pagination.hasPrevPage  ?? false;
  }

  // Optional metadata — only include when present
  if (rawQuery)           response.rawQuery          = rawQuery;
  if (queryMeta)          response.queryMeta         = queryMeta;
  if (duplicatesRemoved)  response.duplicatesRemoved = duplicatesRemoved;
  if (cacheInfo)          response._cache            = cacheInfo;

  return response;
}

// ─── Job Detail Response ─────────────────────────────────────────────────────

/**
 * Format a single job detail response.
 * Includes the full description (not truncated to summary).
 *
 * @param {object} job
 * @returns {object}
 */
function formatJobDetail(job) {
  const presented = presentJob(job);

  // Detail view gets the full description, not the truncated summary
  return {
    ...presented,
    description: job.description ?? null,
    contract   : job.contract    ?? null,
    category   : job.category    ?? null,
  };
}

// ─── Categories Response ─────────────────────────────────────────────────────

/**
 * @param {object[]} categories
 * @returns {object}
 */
function formatCategories(categories) {
  return {
    total  : categories?.length ?? 0,
    results: categories ?? [],
  };
}

// ─── Error Responses ─────────────────────────────────────────────────────────

/**
 * @param {object[]} errors - express-validator error array
 * @returns {object}
 */
function formatValidationError(errors) {
  return {
    success: false,
    error  : {
      code   : 'VALIDATION_ERROR',
      message: 'One or more query parameters are invalid.',
      details: errors,
    },
  };
}

/**
 * @param {Error}  err
 * @param {number} [statusCode]
 * @returns {object}
 */
function formatError(err, statusCode) {
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    success: false,
    error  : {
      code   : err.code    ?? 'INTERNAL_ERROR',
      message: err.message ?? 'An unexpected error occurred.',
      ...(isDev && err.stack ? { stack: err.stack } : {}),
    },
    ...(statusCode ? { statusCode } : {}),
  };
}

// ─── Express Middleware Helpers ───────────────────────────────────────────────

/**
 * Attach convenience senders to the Express response object.
 * Use as middleware: router.use(responseFormatter.attach)
 */
function attach(req, res, next) {
  res.sendSearch     = (opts)       => res.status(200).json(formatSearchResponse(opts));
  res.sendJobDetail  = (job)        => res.status(200).json(formatJobDetail(job));
  res.sendCategories = (cats)       => res.status(200).json(formatCategories(cats));
  res.sendError      = (err, status = 500) => res.status(status).json(formatError(err, status));
  next();
}

module.exports = {
  // §2.9 primary formatters
  formatSearchResponse,
  formatJobDetail,
  formatCategories,

  // Utilities (used internally + for tests)
  presentJob,
  formatSalary,
  buildSummary,

  // Error helpers
  formatValidationError,
  formatError,

  // Express middleware
  attach,

  // Kept for backward compat (delegates to formatSearchResponse)
  formatJobList: formatSearchResponse,
};
