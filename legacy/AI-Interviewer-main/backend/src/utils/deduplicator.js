'use strict';

/**
 * deduplicator.js — §2.6 Job Deduplication Layer
 *
 * Removes duplicate jobs from a result set using Redis Sets.
 *
 * Strategy:
 *   - Job fingerprint  : SHA-256(normalised title + '|' + company + '|' + location)
 *   - Redis key        : dedupe:{query_hash}  (a Redis Set)
 *   - Algorithm        : SADD returns 1 for a new member, 0 for a duplicate
 *   - TTL              : matches the search cache TTL so the set expires with it
 *
 * Redis key format (from spec §2.6):
 *   SADD dedupe:{query_hash} job_hash
 *
 * Pipeline position:
 *   normalizeJobs() → deduplicateJobs() → scoreJobs()
 *
 * Graceful degradation:
 *   If Redis is unavailable the function falls back to in-process dedup
 *   (same hash set stored in memory for the lifetime of that request).
 *   No errors are propagated to callers.
 */

const crypto      = require('crypto');
const { getClient } = require('../config/redis');
const { SEARCH_TTL_S } = require('./jobsCache');

// ─── Fingerprint Builders ─────────────────────────────────────────────────────

/**
 * Compute a short, stable SHA-256 fingerprint for a single job.
 * Normalised before hashing: lowercase, trimmed, multiple-spaces collapsed.
 *
 * Fields used: title + company + location  (spec §2.6)
 *
 * @param {object} job - Normalised job object (§2.5 internal schema)
 * @returns {string}   - 16-char hex fingerprint
 */
function jobFingerprint(job) {
  const normalise = (s) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const raw = [
    normalise(job.title),
    normalise(job.company),
    normalise(job.location),
  ].join('|');

  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

/**
 * Compute the Redis Set key for a specific query.
 * Uses the same hash algorithm as jobsCache.hashParams for consistency.
 *
 * @param {object} params - Effective search params (without page)
 * @returns {string}  e.g. "dedupe:3f2a1b9c4d8e7f6a"
 */
function dedupeKey(params) {
  const { page: _p, results: _r, ...searchParams } = params;
  const stable = Object.entries(searchParams)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const hash = crypto.createHash('sha256').update(stable).digest('hex').slice(0, 16);
  return `dedupe:${hash}`;
}

// ─── Redis-backed Deduplication ───────────────────────────────────────────────

/**
 * Deduplicate a batch of normalised jobs using Redis SADD.
 *
 * SADD returns 1 for each member that was newly added, 0 for duplicates.
 * We keep only jobs whose fingerprint was added (not seen before for this query).
 *
 * Uses a Redis pipeline for efficiency — one round-trip for N SADDs.
 *
 * @param {object[]} jobs       - Normalised job objects (§2.5 schema)
 * @param {object}   params     - Effective search params (used to build dedupe key)
 * @param {number}   [ttl]      - TTL for the Redis Set in seconds
 * @returns {Promise<{ jobs: object[], duplicatesRemoved: number }>}
 */
async function deduplicateJobs(jobs, params, ttl = SEARCH_TTL_S) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return { jobs: [], duplicatesRemoved: 0 };
  }

  const redis = getClient();

  // ── Redis path ────────────────────────────────────────────────────
  if (redis) {
    try {
      return await redisDedup(jobs, params, ttl, redis);
    } catch (err) {
      console.warn('[Deduplicator] Redis dedup failed, falling back to in-process:', err.message);
    }
  }

  // ── In-process fallback ───────────────────────────────────────────
  return inProcessDedup(jobs);
}

/**
 * Redis-backed dedup using pipeline SADD + EXPIRE.
 */
async function redisDedup(jobs, params, ttl, redis) {
  const key = dedupeKey(params);

  // Build fingerprints in one pass
  const fingerprints = jobs.map((job) => jobFingerprint(job));

  // Pipeline all SADDs + one EXPIRE → single round-trip
  const pipeline = redis.pipeline();
  for (const fp of fingerprints) {
    pipeline.sadd(key, fp);
  }
  pipeline.expire(key, ttl);

  const results = await pipeline.exec();
  // results[i] = [error, returnValue] — SADD returns 1 (new) or 0 (duplicate)

  const unique       = [];
  let duplicatesRemoved = 0;

  for (let i = 0; i < jobs.length; i++) {
    const [err, added] = results[i];
    if (err) {
      // On per-command error keep the job (safe default)
      unique.push(jobs[i]);
    } else if (added === 1) {
      unique.push(jobs[i]);
    } else {
      duplicatesRemoved++;
      console.debug(`[Deduplicator] Duplicate removed: "${jobs[i].title}" @ ${jobs[i].company}`);
    }
  }

  return { jobs: unique, duplicatesRemoved };
}

/**
 * In-process fallback dedup (single-request scope, no cross-request memory).
 * Protects against duplicates within the same Adzuna response page.
 */
function inProcessDedup(jobs) {
  const seen             = new Set();
  const unique           = [];
  let duplicatesRemoved  = 0;

  for (const job of jobs) {
    const fp = jobFingerprint(job);
    if (seen.has(fp)) {
      duplicatesRemoved++;
    } else {
      seen.add(fp);
      unique.push(job);
    }
  }

  return { jobs: unique, duplicatesRemoved };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Manually expire the dedupe set for a query (e.g. on forced cache refresh).
 *
 * @param {object} params
 */
async function clearDedupeSet(params) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(dedupeKey(params));
  } catch (err) {
    console.warn('[Deduplicator] clearDedupeSet failed:', err.message);
  }
}

module.exports = {
  deduplicateJobs,
  jobFingerprint,
  dedupeKey,
  clearDedupeSet,
};
