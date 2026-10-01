'use strict';

const cron = require('node-cron');
const Job = require('../models/Job.model');
const logger = require('../config/logger');

// Lock to avoid overlapping runs
let isCleaning = false;

/**
 * Scans the database and deactivates job postings older than 30 days.
 * Sets isActive = false (soft deactivation).
 *
 * @returns {Promise<object>} - Cleanup metrics
 */
const runJobCleanup = async () => {
  if (isCleaning) {
    logger.warn('🧹 Job Cleanup Service: Previous cleanup run is still in progress. Skipping...');
    return;
  }

  isCleaning = true;
  logger.info('🧹 Job Cleanup Service: Starting soft deactivation run for old jobs...');

  try {
    // 1. Calculate cutoff threshold (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    logger.info(`🧹 Job Cleanup Service: Searching for jobs older than ${cutoffDate.toISOString()}...`);

    // 2. Perform bulk soft update setting isActive = false
    const result = await Job.updateMany(
      {
        $or: [
          { postedTime: { $lt: cutoffDate } },
          { createdAt: { $lt: cutoffDate } }
        ],
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );

    logger.info(`✅ Job Cleanup Service Completed. Deactivated (isActive = false): ${result.modifiedCount} jobs.`);
    return {
      success: true,
      deactivatedCount: result.modifiedCount
    };

  } catch (error) {
    logger.error(`❌ Job Cleanup Service Error: ${error.message}`);
    throw error;
  } finally {
    isCleaning = false;
  }
};

/**
 * Initializes the node-cron daily cleanup task.
 */
const initCleanupScheduler = () => {
  logger.info('⚙️ Initializing Daily Job Cleanup Cron Daemon...');

  // 1. Run once shortly after boot (30 seconds delay)
  setTimeout(() => {
    logger.info('⏰ Triggering initial startup job cleanup run...');
    runJobCleanup();
  }, 30 * 1000);

  // 2. Schedule cron to execute daily at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', () => {
    logger.info('⏰ Cron triggered: Starting daily job cleanup schedule...');
    runJobCleanup();
  });

  logger.info('✅ Daily Job Cleanup Cron Daemon successfully scheduled: [0 0 * * *]');
};

module.exports = { runJobCleanup, initCleanupScheduler };
