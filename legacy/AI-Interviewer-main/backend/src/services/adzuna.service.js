'use strict';

/**
 * adzuna.service.js
 *
 * All communication with the Adzuna REST API lives here.
 * Controllers never call Adzuna directly — they go through this service.
 *
 * Pipeline per request:
 *   mergeWithParsed()     → queryParser     → structured params
 *   → jobsCache.getSortedList() (Redis L0 — return early on HIT, slice to page)
 *   → fetchAllPages()           (concurrent fetch of N Adzuna pages in parallel)
 *   → normalizeJobs()           (§2.5: strip HTML, parse salary, extract skills)
 *   → deduplicateJobs()         (§2.6: SADD dedupe:{query_hash} in Redis)
 *   → scoreJobs()               (§2.7: deterministic scoring, 0–100)
 *   → sort() + jobsCache.setSortedList() (Redis L0, EX 900s)
 *   → slicePage()               (§2.8: paginate from sorted list)
 *   → return result
 *
 * Adzuna base URL: https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
 */

const { fetchJSON }             = require('../utils/adzunaClient');
const jobsCache                 = require('../utils/jobsCache');
const { mergeWithParsed }       = require('../utils/queryParser');
const { scoreJobs, scoreJob }   = require('../utils/scoringEngine');
const { buildPaginationMeta, slicePage } = require('../utils/pagination');
const { normalizeJob, normalizeJobs }    = require('../utils/jobNormalizer');
const { deduplicateJobs }       = require('../utils/deduplicator');

const ADZUNA_BASE_URL   = 'https://api.adzuna.com/v1/api/jobs';
const ADZUNA_APP_ID     = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY    = process.env.ADZUNA_APP_KEY;
const DEFAULT_COUNTRY   = process.env.ADZUNA_COUNTRY  || 'gb';
const DEFAULT_RESULTS   = 20;   // jobs per page served to client
// §2.8: how many Adzuna pages to prefetch per query (default 3 = 60 raw jobs)
const PREFETCH_PAGES    = parseInt(process.env.ADZUNA_PREFETCH_PAGES, 10) || 3;


// ─── URL Builder ──────────────────────────────────────────────────────────────
/**
 * Build a fully-qualified Adzuna search URL from query options.
 *
 * @param {object} params
 * @param {string}  params.what        - Keywords / job title
 * @param {string}  [params.where]     - Location
 * @param {string}  [params.country]   - Country code (default: DEFAULT_COUNTRY)
 * @param {number}  [params.page]      - Page number (default: 1)
 * @param {number}  [params.results]   - Results per page (default: DEFAULT_RESULTS)
 * @param {string}  [params.category]  - Adzuna category tag
 * @param {string}  [params.contract]  - full_time | part_time | contract | permanent
 * @param {number}  [params.salaryMin] - Minimum salary
 * @param {number}  [params.salaryMax] - Maximum salary
 * @param {string}  [params.sortBy]    - date | salary | relevance
 * @param {string}  [params.sortDir]   - up | down
 * @returns {string} Full URL string
 */
function buildSearchURL({
  what,
  where       = '',
  country     = DEFAULT_COUNTRY,
  page        = 1,
  results     = DEFAULT_RESULTS,
  category    = '',
  contract    = '',
  salaryMin   = '',
  salaryMax   = '',
  sortBy      = 'relevance',
  sortDir     = 'down',
}) {
  const qs = new URLSearchParams({
    app_id:           ADZUNA_APP_ID,
    app_key:          ADZUNA_APP_KEY,
    results_per_page: results,
  });

  if (sortBy === 'date' || sortBy === 'salary') {
    qs.set('sort_by', sortBy);
  }

  if (what && what !== 'null')      qs.set('what',          what);
  if (where && where !== 'null')     qs.set('where',         where);
  if (category && category !== 'null')  qs.set('category',      category);
  if (contract && contract !== 'null')  qs.set('contract_type', contract);
  if (salaryMin) qs.set('salary_min',    salaryMin);
  if (salaryMax) qs.set('salary_max',    salaryMax);

  return `${ADZUNA_BASE_URL}/${country}/search/${page}?${qs.toString()}`;
}

// ─── Multi-page Fetcher (§2.8) ────────────────────────────────────────────────
/**
 * Fetch PREFETCH_PAGES Adzuna pages concurrently and merge raw results.
 * Failed pages are skipped (Promise.allSettled) to avoid a single bad page
 * blocking the whole response.
 *
 * @param {object} params - Effective search params
 * @returns {Promise<object[]>} Merged raw Adzuna job objects
 */
async function fetchAllPages(params) {
  const pageNumbers = Array.from({ length: PREFETCH_PAGES }, (_, i) => i + 1);

  const settled = await Promise.allSettled(
    pageNumbers.map((p) => fetchJSON(buildSearchURL({ ...params, page: p })))
  );

  const rawJobs = [];
  let   totalCount = 0;
  let   failedCount = 0;

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === 'fulfilled') {
      const data = result.value;
      rawJobs.push(...(data.results ?? []));
      if (i === 0) totalCount = data.count ?? 0; // Adzuna total from first page
    } else {
      failedCount++;
      console.warn(`[adzuna.service] Page ${i + 1} fetch failed:`, result.reason?.message);
    }
  }

  // If ALL pages failed to fetch, we have a total API failure
  const fetchFailed = failedCount === settled.length && settled.length > 0;

  return { rawJobs, totalCount, fetchFailed };
}

// ─── Credential Guard ─────────────────────────────────────────────────────────
function assertCredentials() {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw Object.assign(
      new Error('Adzuna credentials are not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY.'),
      { status: 500, code: 'MISSING_CREDENTIALS' }
    );
  }
}

// ─── Public Service Methods ───────────────────────────────────────────────────

/**
 * Search for jobs — §2.8 multi-page fetch + sorted list pagination.
 *
 * Strategy:
 *   1. Check Redis L0 for a pre-built sorted list for this query.
 *   2. MISS: fetch PREFETCH_PAGES pages concurrently from Adzuna.
 *   3. Normalize ALL raw jobs together (clean HTML, parse salary, extract skills).
 *   4. Dedup ALL across pages (Redis SADD).
 *   5. Score ALL with the §2.7 deterministic formula.
 *   6. Sort descending by score — this is now the canonical order.
 *   7. Cache the full sorted list in Redis L0 (EX 900s).
 *   8. Slice to the requested page and return.
 *
 * Consistent pagination: pages 2/3/4 always slice from the same sorted list.
 *
 * @param {object} rawParams
 * @returns {Promise<object>}
 */
async function searchJobs(rawParams) {
  assertCredentials();

  // ── Query Parser ───────────────────────────────────────────────────
  const { q, ...explicitParams } = rawParams;
  const params = await mergeWithParsed(explicitParams, q);

  const queryMeta = params._queryMeta;
  delete params._queryMeta;

  params.country = params.country || DEFAULT_COUNTRY;
  params.results = params.results || DEFAULT_RESULTS;
  const page     = Math.max(1, parseInt(params.page, 10) || 1);
  params.page    = page; // keep in params for cache key consistency

  // ── Redis L0: sorted list cache ──────────────────────────────────────
  const cachedSortedList = await jobsCache.getSortedList(params);

  if (cachedSortedList) {
    const { items: pageJobs, meta: pagination } = slicePage(cachedSortedList, {
      page,
      resultsPerPage: params.results,
    });
    return {
      count            : cachedSortedList.length,
      page,
      jobs             : pageJobs,
      duplicatesRemoved: 0,
      pagination,
      effectiveParams  : params,
      queryMeta,
      cacheHit         : true,
    };
  }

  // ── Fetch PREFETCH_PAGES pages concurrently (§2.8) ───────────────────
  const { rawJobs, fetchFailed } = await fetchAllPages(params);

  // ── §4 Failure Handling: Adzuna API is down ────────────────────────
  if (fetchFailed) {
    console.warn('[adzuna.service] Complete Adzuna API failure. Attempting stale fallback...');
    const fallbackList = await jobsCache.getStaleFallback(params);
    
    if (fallbackList && fallbackList.length > 0) {
      const { items: pageJobs, meta: pagination } = slicePage(fallbackList, {
        page,
        resultsPerPage: params.results,
      });
      return {
        count            : fallbackList.length,
        page,
        jobs             : pageJobs,
        duplicatesRemoved: 0,
        pagination,
        effectiveParams  : params,
        queryMeta,
        cacheHit         : true,
        isFallback       : true,
      };
    }
    
    // No fallback available, throw to let the error handler format it
    throw new Error('Adzuna API is currently unavailable and no fallback data exists.');
  }

  // ── Normalize ALL (§2.5) ─────────────────────────────────────────
  const normalizedJobs = normalizeJobs(rawJobs, params.country);

  // ── Dedup ALL (§2.6) ─────────────────────────────────────────────
  const { jobs: dedupedJobs, duplicatesRemoved } = await deduplicateJobs(normalizedJobs, params);

  // ── Score + Sort ALL (§2.7) ────────────────────────────────────────
  // scoreJobs returns sorted-desc by score (canonical order for all pages)
  const sortedList = scoreJobs(dedupedJobs, params);

  // ── Cache sorted list in Redis L0 (non-blocking) ────────────────────
  jobsCache.setSortedList(params, sortedList).catch(() => {});

  // ── Slice to requested page (§2.8) ────────────────────────────────
  const { items: pageJobs, meta: pagination } = slicePage(sortedList, {
    page,
    resultsPerPage: params.results,
  });

  return {
    count            : sortedList.length,
    page,
    jobs             : pageJobs,
    duplicatesRemoved,
    pagination,
    effectiveParams  : params,
    queryMeta,
    cacheHit         : false,
  };
}

/**
 * Fetch a single job by Adzuna job ID.
 *
 * @param {string} jobId
 * @param {string} [country]
 * @returns {Promise<object>}
 */
async function getJobById(jobId, country = DEFAULT_COUNTRY) {
  assertCredentials();

  // ── Level 2 Cache: job:{job_id} (Redis) ─────────────────────────────
  const cachedJob = await jobsCache.getDetail(jobId);
  if (cachedJob) return { ...cachedJob, cacheHit: true };

  // ── Adzuna API Call ───────────────────────────────────────────────
  const qs  = new URLSearchParams({ app_id: ADZUNA_APP_ID, app_key: ADZUNA_APP_KEY });
  const url = `${ADZUNA_BASE_URL}/${country}/jobs/${jobId}?${qs.toString()}`;
  const raw = await fetchJSON(url);

  const job = scoreJob(normalizeJob(raw, country), {});

  // ── Store in Redis L2 (non-blocking) ───────────────────────────────
  jobsCache.setDetail(jobId, job).catch(() => {});

  return job;
}

/**
 * Fetch available job categories from Adzuna.
 *
 * @param {string} [country]
 * @returns {Promise<object[]>}
 */
async function getCategories(country = DEFAULT_COUNTRY) {
  assertCredentials();

  // Categories change rarely — cache for 30 min in Redis
  const cacheKey = `categories:${country}`;
  const cached   = await jobsCache.getDetail(cacheKey);
  if (cached) return cached;

  const qs   = new URLSearchParams({ app_id: ADZUNA_APP_ID, app_key: ADZUNA_APP_KEY });
  const url  = `${ADZUNA_BASE_URL}/${country}/categories?${qs.toString()}`;
  const data = await fetchJSON(url);

  const categories = data.results ?? [];
  jobsCache.setDetail(cacheKey, categories, 30 * 60).catch(() => {});
  return categories;
}

module.exports = { searchJobs, getJobById, getCategories };
