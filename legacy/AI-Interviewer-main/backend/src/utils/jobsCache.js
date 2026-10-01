'use strict';

/**
 * jobsCache.js — §2.3 + §2.8 Redis Caching Strategy
 *
 * Level 0 — Sorted List Cache  (§2.8 — primary for pagination)
 *   Key  : jobs:sorted:{sha256(query_params)}
 *   Value: full pre-scored, pre-sorted job array (JSON)
 *   TTL  : JOBS_CACHE_SEARCH_TTL_S  (default 900s / 15 min)
 *
 * Level 1 — Per-page Result Cache  (§2.3 — legacy, kept for compat)
 *   Key  : jobs:{sha256(query_params)}:page:{page}
 *   TTL  : JOBS_CACHE_SEARCH_TTL_S
 *
 * Level 2 — Job Detail Cache
 *   Key  : job:{job_id}
 *   TTL  : JOBS_CACHE_DETAIL_TTL_S  (default 3600s / 1 hr)
 *
 * Level 3 — Stale Fallback Cache (§4)
 *   Key  : jobs:stale:{sha256(query_params)} OR jobs:fallback:last_success
 *   Value: Pre-scored job array, served ONLY if Adzuna API fails completely
 *   TTL  : 7 days
 *
 * Fallback: when Redis is unavailable every method returns null (cache miss).
 * The service falls back to a live Adzuna API call — no error reaches the client.
 */

const crypto      = require('crypto');
const { getClient } = require('../config/redis');

// ─── TTL Configuration ────────────────────────────────────────────────────────
const SEARCH_TTL_S = parseInt(process.env.JOBS_CACHE_SEARCH_TTL_S, 10) || 900;  // 15 min
const DETAIL_TTL_S = parseInt(process.env.JOBS_CACHE_DETAIL_TTL_S, 10) || 3600; // 1 hr
const STALE_TTL_S  = 7 * 24 * 3600; // 7 days (Fallback cache)

// ─── Key Builders ─────────────────────────────────────────────────────────────

/**
 * Build a deterministic SHA-256 hash from a query-params object.
 * Only enumerable, non-empty values are included; keys are sorted so
 * { what:'python', where:'london' } and { where:'london', what:'python' }
 * produce the same hash.
 *
 * @param {object} params
 * @returns {string} 16-char hex prefix (enough uniqueness, keeps keys short)
 */
function hashParams(params) {
  const stable = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  return crypto.createHash('sha256').update(stable).digest('hex').slice(0, 16);
}

/**
 * Search cache key: jobs:{hash(query_params)}:page:{page}
 *
 * @param {object} params - All search params (without page)
 * @param {number} page
 * @returns {string}
 */
function searchKey(params, page) {
  // Exclude pagination params from the hash so page is in the key explicitly
  const { page: _p, results: _r, ...searchParams } = params;
  return `jobs:${hashParams(searchParams)}:page:${page}`;
}

/**
 * Sorted-list cache key: jobs:sorted:{hash(query_params)}
 * Stores the full pre-scored array for a query (page-independent).
 *
 * @param {object} params - All search params (page/results excluded from hash)
 * @returns {string}
 */
function sortedListKey(params) {
  const { page: _p, results: _r, ...searchParams } = params;
  return `jobs:sorted:${hashParams(searchParams)}`;
}

/**
 * Stale list cache key: jobs:stale:{hash(query_params)} (§4)
 */
function staleListKey(params) {
  const { page: _p, results: _r, ...searchParams } = params;
  return `jobs:stale:${hashParams(searchParams)}`;
}

const GLOBAL_FALLBACK_KEY = 'jobs:fallback:last_success';

/**
 * Job detail cache key: job:{job_id}
 *
 * @param {string|number} jobId
 * @returns {string}
 */
function detailKey(jobId) {
  return `job:${jobId}`;
}

// ─── Safe Redis Wrapper ───────────────────────────────────────────────────────
// All Redis calls are wrapped so a connection failure never throws to the caller.

async function safeGet(key) {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (raw) {
      console.log(`[Redis] Cache HIT (data served from Redis) for key: ${key}`);
      return JSON.parse(raw);
    }
    console.log(`[Redis] Cache MISS (data served from Database) for key: ${key}`);
    return null;
  } catch (err) {
    console.warn(`[jobsCache] GET failed for key "${key}":`, err.message);
    return null;
  }
}

async function safeSet(key, value, ttlSeconds) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    console.log(`[Redis] Cache Updated for key: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (err) {
    console.warn(`[jobsCache] SET failed for key "${key}":`, err.message);
  }
}

async function safeDel(key) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(key);
    console.log(`[Redis] Cache Key Deleted: ${key}`);
  } catch (err) {
    console.warn(`[jobsCache] DEL failed for key "${key}":`, err.message);
  }
}

// ─── Level 0: Sorted List Cache (§2.8) ───────────────────────────────────────

/**
 * Read the full pre-scored, pre-sorted job list for a query.
 * Used by §2.8 pagination: fetch once, slice many times.
 *
 * @param {object} params
 * @returns {Promise<object[]|null>}
 */
async function getSortedList(params) {
  const key = sortedListKey(params);
  const hit = await safeGet(key);
  if (hit) console.debug(`[jobsCache] HIT  ${key} (${hit.length} jobs)`);
  else     console.debug(`[jobsCache] MISS ${key}`);
  return hit;
}

/**
 * Store the full pre-scored, pre-sorted job list.
 * (§4: Also populate the stale fallback and global fallback caches)
 *
 * @param {object}   params
 * @param {object[]} jobs   - Full scored & sorted array
 * @param {number}   [ttl]
 */
async function setSortedList(params, jobs, ttl = SEARCH_TTL_S) {
  const key = sortedListKey(params);
  
  // Set main L0 cache
  await safeSet(key, jobs, ttl);

  // §4 Failure Handling: Save as stale fallback (if we have results)
  if (jobs && jobs.length > 0) {
    await safeSet(staleListKey(params), jobs, STALE_TTL_S);
    await safeSet(GLOBAL_FALLBACK_KEY,  jobs, STALE_TTL_S);
  }

  console.debug(`[jobsCache] SET  ${key} (${jobs.length} jobs, TTL ${ttl}s)`);
}

/**
 * §4 Failure Handling
 * Retrieve stale data for this query, or fall back to the last successful query globally.
 *
 * @param {object} params
 * @returns {Promise<object[]|null>}
 */
async function getStaleFallback(params) {
  const staleKey = staleListKey(params);
  let hit = await safeGet(staleKey);
  
  if (hit) {
    console.warn(`[jobsCache] Using STALE fallback for key ${staleKey}`);
    return hit;
  }
  
  hit = await safeGet(GLOBAL_FALLBACK_KEY);
  if (hit) {
    console.warn(`[jobsCache] Using GLOBAL fallback last_success`);
    return hit;
  }
  
  return null;
}

/**
 * Invalidate the sorted list (and optionally all per-page keys) for a query.
 *
 * @param {object} params
 */
async function delSortedList(params) {
  await safeDel(sortedListKey(params));
}

// ─── Level 1: Per-page Result Cache (§2.3 — kept for backward compat) ────────

/**
 * Read a cached per-page search result.
 *
 * @param {object} params
 * @param {number} page
 * @returns {Promise<object|null>}
 */
async function getSearch(params, page) {
  const key = searchKey(params, page);
  const hit = await safeGet(key);
  if (hit) console.debug(`[jobsCache] HIT  ${key}`);
  else     console.debug(`[jobsCache] MISS ${key}`);
  return hit;
}

/**
 * Store a per-page search result.
 *
 * @param {object} params
 * @param {number} page
 * @param {object} result
 * @param {number} [ttl]
 */
async function setSearch(params, page, result, ttl = SEARCH_TTL_S) {
  const key = searchKey(params, page);
  await safeSet(key, result, ttl);
  console.debug(`[jobsCache] SET  ${key} (TTL ${ttl}s)`);
}

/**
 * Invalidate a specific search result page.
 *
 * @param {object} params
 * @param {number} page
 */
async function delSearch(params, page) {
  await safeDel(searchKey(params, page));
}

// ─── Level 2: Job Detail Cache ────────────────────────────────────────────────

/**
 * Read a cached job detail.
 *
 * @param {string|number} jobId
 * @returns {Promise<object|null>}
 */
async function getDetail(jobId) {
  const key = detailKey(jobId);
  const hit = await safeGet(key);
  if (hit) console.debug(`[jobsCache] HIT  ${key}`);
  else     console.debug(`[jobsCache] MISS ${key}`);
  return hit;
}

/**
 * Store a job detail.
 *
 * @param {string|number} jobId
 * @param {object}        job
 * @param {number}        [ttl] - Override TTL in seconds
 */
async function setDetail(jobId, job, ttl = DETAIL_TTL_S) {
  const key = detailKey(jobId);
  await safeSet(key, job, ttl);
  console.debug(`[jobsCache] SET  ${key} (TTL ${ttl}s)`);
}

/**
 * Invalidate a cached job detail.
 *
 * @param {string|number} jobId
 */
async function delDetail(jobId) {
  await safeDel(detailKey(jobId));
}

// ─── Cache Stats ──────────────────────────────────────────────────────────────

/**
 * Return basic Redis info for the /cache-stats debug endpoint.
 *
 * @returns {Promise<object>}
 */
async function stats() {
  const redis = getClient();
  if (!redis) {
    return { connected: false, reason: 'Redis disabled or not connected' };
  }
  try {
    const info    = await redis.info('memory');
    const dbSize  = await redis.dbsize();
    const memLine = info.match(/used_memory_human:(\S+)/);

    return {
      connected       : true,
      keyCount        : dbSize,
      usedMemory      : memLine ? memLine[1] : 'unknown',
      searchTtlS      : SEARCH_TTL_S,
      detailTtlS      : DETAIL_TTL_S,
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

// ─── Key Utilities (exported for tests) ──────────────────────────────────────
module.exports = {
  // Level 0 — Sorted list (§2.8)
  getSortedList,
  setSortedList,
  delSortedList,

  // Level 3 — Stale Fallback (§4)
  getStaleFallback,

  // Level 1 — Per-page (§2.3, backward compat)
  getSearch,
  setSearch,
  delSearch,

  // Level 2 — Job detail
  getDetail,
  setDetail,
  delDetail,

  // Diagnostics
  stats,

  // Key builders (useful in tests)
  sortedListKey,
  searchKey,
  detailKey,
  hashParams,

  // TTL constants
  SEARCH_TTL_S,
  DETAIL_TTL_S,
};
