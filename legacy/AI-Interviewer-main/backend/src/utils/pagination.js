'use strict';

/**
 * pagination.js — Pagination Layer
 *
 * Computes pagination metadata from Adzuna total count and current page state.
 * Keeps pagination math out of the controller and service.
 *
 * Usage:
 *   const { buildPaginationMeta, slicePage } = require('./pagination');
 *
 *   // When results come pre-paged from Adzuna:
 *   const meta = buildPaginationMeta({ totalCount: 480, page: 2, resultsPerPage: 20 });
 *
 *   // When results need to be sliced locally (e.g. for cached full result sets):
 *   const { items, meta } = slicePage(allJobs, { page: 2, resultsPerPage: 20, totalCount: 480 });
 */

// ─── Limits ───────────────────────────────────────────────────────────────────
const MAX_PAGE     = 50;   // Adzuna hard limit
const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;
const MAX_SIZE     = 50;

// ─── Core Builders ────────────────────────────────────────────────────────────

/**
 * Build a standardised pagination metadata object.
 *
 * @param {object} opts
 * @param {number} opts.totalCount      - Total results reported by Adzuna
 * @param {number} [opts.page]          - Current page (1-indexed)
 * @param {number} [opts.resultsPerPage]- Results per page
 * @returns {{
 *   page:         number,
 *   resultsPerPage: number,
 *   totalCount:   number,
 *   totalPages:   number,
 *   hasNextPage:  boolean,
 *   hasPrevPage:  boolean,
 *   nextPage:     number|null,
 *   prevPage:     number|null,
 * }}
 */
function buildPaginationMeta({ totalCount = 0, page = DEFAULT_PAGE, resultsPerPage = DEFAULT_SIZE } = {}) {
  const safePage    = Math.max(1, Math.min(Number(page) || DEFAULT_PAGE, MAX_PAGE));
  const safeSize    = Math.max(1, Math.min(Number(resultsPerPage) || DEFAULT_SIZE, MAX_SIZE));
  const totalPages  = safeSize > 0 ? Math.ceil(totalCount / safeSize) : 0;
  const hasNextPage = safePage < totalPages && safePage < MAX_PAGE;
  const hasPrevPage = safePage > 1;

  return {
    page          : safePage,
    resultsPerPage: safeSize,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage : hasNextPage ? safePage + 1 : null,
    prevPage : hasPrevPage ? safePage - 1 : null,
  };
}

/**
 * Slice a flat array into a single page and return both the items and meta.
 * Useful when you have a full in-memory result set and want to paginate locally.
 *
 * @param {any[]} items                 - Full list of items
 * @param {object} opts
 * @param {number} [opts.page]
 * @param {number} [opts.resultsPerPage]
 * @param {number} [opts.totalCount]    - Defaults to items.length
 * @returns {{ items: any[], meta: object }}
 */
function slicePage(items, { page = DEFAULT_PAGE, resultsPerPage = DEFAULT_SIZE, totalCount } = {}) {
  const safeSize   = Math.max(1, Math.min(Number(resultsPerPage) || DEFAULT_SIZE, MAX_SIZE));
  const safePage   = Math.max(1, Math.min(Number(page) || DEFAULT_PAGE, MAX_PAGE));
  const count      = totalCount ?? items.length;
  const start      = (safePage - 1) * safeSize;
  const end        = start + safeSize;

  return {
    items: items.slice(start, end),
    meta : buildPaginationMeta({ totalCount: count, page: safePage, resultsPerPage: safeSize }),
  };
}

/**
 * Validate and coerce raw page/results query params into safe integers.
 * Returns { page, results } with sane defaults and bounds applied.
 *
 * @param {object} query - Express req.query
 * @returns {{ page: number, results: number }}
 */
function sanitizePaginationParams(query = {}) {
  return {
    page   : Math.max(1, Math.min(parseInt(query.page,    10) || DEFAULT_PAGE, MAX_PAGE)),
    results: Math.max(1, Math.min(parseInt(query.results, 10) || DEFAULT_SIZE, MAX_SIZE)),
  };
}

module.exports = { buildPaginationMeta, slicePage, sanitizePaginationParams, MAX_PAGE, DEFAULT_PAGE, DEFAULT_SIZE, MAX_SIZE };
