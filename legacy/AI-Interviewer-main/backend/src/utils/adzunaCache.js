'use strict';

/**
 * adzunaCache.js — lightweight in-process TTL cache
 *
 * Prevents duplicate Adzuna calls for the same query within the TTL window.
 * Suitable for low-to-mid traffic. Swap for Redis in high-throughput production.
 *
 * Usage:
 *   const cache = require('../utils/adzunaCache');
 *   const cached = cache.get(key);
 *   if (cached) return cached;
 *   const result = await expensiveFetch();
 *   cache.set(key, result);
 */

const DEFAULT_TTL_MS = parseInt(process.env.ADZUNA_CACHE_TTL_MS, 10) || 5 * 60 * 1000; // 5 min

const store = new Map(); // key → { value, expiresAt }

/**
 * Retrieve a cached value.
 * @param {string} key
 * @returns {any|null}
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Store a value with TTL.
 * @param {string} key
 * @param {any}    value
 * @param {number} [ttl] - TTL in milliseconds
 */
function set(key, value, ttl = DEFAULT_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

/** Remove a specific key. */
function del(key) {
  store.delete(key);
}

/** Wipe the entire cache (useful in tests). */
function flush() {
  store.clear();
}

/**
 * Return a snapshot of cache state for the debug endpoint.
 * Expired entries are purged before reporting.
 */
function stats() {
  // Evict stale entries first
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(key);
  }
  return {
    size    : store.size,
    keys    : [...store.keys()],
    ttlMs   : parseInt(process.env.ADZUNA_CACHE_TTL_MS, 10) || 5 * 60 * 1000,
  };
}

/** Build a deterministic cache key from a query-params object. */
function buildKey(params) {
  return JSON.stringify(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

module.exports = { get, set, del, flush, buildKey, stats };
