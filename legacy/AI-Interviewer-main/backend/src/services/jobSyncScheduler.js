'use strict';

const cron = require('node-cron');
const { syncJobs } = require('./jobSyncService');
const logger = require('../config/logger');

// Mutex lock to avoid overlapping scheduler execution
let isSyncing = false;

/**
 * Runs the sync pipeline and logs specific metrics.
 */
const runScheduledSync = async () => {
  if (isSyncing) {
    logger.warn('🔄 Job Sync Scheduler: Previous sync is still running. Skipping...');
    return;
  }

  isSyncing = true;
  logger.info('📋 Cron started: Adzuna Job Sync');

  try {
    // We execute sync for standard tech search parameters
    const keyword = 'developer';
    const location = '';
    const page = 1;

    const result = await syncJobs(keyword, location, page);

    // Summing fetched jobs (upserted + matched)
    const fetchedCount = (result.upsertedCount || 0) + (result.matchedCount || 0);

    logger.info(`📋 Jobs Fetched: ${fetchedCount}`);
    logger.info(`📋 Jobs Updated: ${result.modifiedCount || 0}`);
    logger.info(`📋 Jobs Inserted: ${result.upsertedCount || 0}`);
    logger.info('📋 Sync Completed');

  } catch (error) {
    logger.error(`❌ Job Sync Scheduler Error: ${error.message}`);
  } finally {
    isSyncing = false;
  }
};

/**
 * Starts the Node-Cron cron-scheduler daemon.
 */
const initSyncScheduler = () => {
  logger.info('⚙️ Initializing Adzuna Job Sync Cron Daemon...');

  // 1. Run once shortly after startup (15 seconds delay)
  setTimeout(() => {
    logger.info('⏰ Triggering initial startup Adzuna sync run...');
    runScheduledSync();
  }, 15 * 1000);

  // 2. Schedule cron to execute every 3 hours (at minute 0 of every 3rd hour)
  cron.schedule('0 */3 * * *', () => {
    logger.info('⏰ Cron triggered: Starting Adzuna Job Sync schedule...');
    runScheduledSync();
  });

  logger.info('✅ Adzuna Job Sync Cron Daemon successfully scheduled: [0 */3 * * *]');
};

module.exports = { initSyncScheduler, runScheduledSync };
