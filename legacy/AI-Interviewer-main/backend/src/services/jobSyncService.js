'use strict';

const { fetchJobs } = require('./adzunaService');
const { deduplicateAndSave } = require('./jobDeduplicator');
const logger = require('../config/logger');

/**
 * Fetches jobs from Adzuna API and synchronization-updates or inserts them into MongoDB.
 * Implements high-performance bulk write operations to ensure scalability.
 *
 * @param {string} keyword - Search keywords / role title
 * @param {string} location - Target city or remote
 * @param {number} [page=1] - Pagination page
 * @returns {Promise<object>} - Synchronization stats (matched, upserted, modified count)
 */
const syncJobs = async (keyword, location, page = 1) => {
  logger.info(`🔄 JobSyncService: Starting synchronization for keyword: "${keyword}", location: "${location}", page: ${page}...`);

  try {
    // 1. Fetch flat clean JSON jobs from Adzuna
    const jobs = await fetchJobs(keyword, location, page);

    if (!Array.isArray(jobs) || jobs.length === 0) {
      logger.info('🔄 JobSyncService: No jobs retrieved from Adzuna. Synchronization complete.');
      return { success: true, matchedCount: 0, upsertedCount: 0, modifiedCount: 0 };
    }

    // 2. Delegate to deduplication and save service
    const result = await deduplicateAndSave(jobs);

    return {
      success: true,
      matchedCount: result.updatedCount,
      upsertedCount: result.insertedCount,
      modifiedCount: result.updatedCount,
    };

  } catch (error) {
    logger.error(`❌ JobSyncService failed: ${error.message}`);
    throw error;
  }
};

module.exports = { syncJobs };
