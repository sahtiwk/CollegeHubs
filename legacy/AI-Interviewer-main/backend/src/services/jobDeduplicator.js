'use strict';

const Job = require('../models/Job.model');
const logger = require('../config/logger');

/**
 * Deduplicates a batch of incoming job listings against the database.
 * If a job already exists (by adzunaId), it prepares an update.
 * If a job is new, it prepares an insert.
 *
 * @param {Array<object>} rawJobs - Array of cleaned job objects
 * @returns {Promise<object>} - Deduplication write metrics
 */
const deduplicateAndSave = async (rawJobs) => {
  if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
    logger.info('🧹 JobDeduplicator: No jobs provided for deduplication.');
    return { success: true, processedCount: 0, updatedCount: 0, insertedCount: 0 };
  }

  // 1. Extract non-empty adzunaIds from the batch
  const adzunaIds = rawJobs
    .map((j) => j.adzunaId)
    .filter(Boolean);

  if (adzunaIds.length === 0) {
    logger.warn('⚠️ JobDeduplicator: None of the jobs contain a valid adzunaId. Skipping sync.');
    return { success: false, error: 'No valid adzunaIds found' };
  }

  logger.info(`🧹 JobDeduplicator: Deduplicating ${rawJobs.length} jobs against MongoDB using adzunaId index...`);

  try {
    // 2. Fetch existing records matching these IDs using the sparse unique index
    const existingJobs = await Job.find(
      { adzunaId: { $in: adzunaIds } },
      { adzunaId: 1 }
    ).lean();

    const existingIdsSet = new Set(existingJobs.map((j) => String(j.adzunaId)));
    logger.info(`🧹 JobDeduplicator: Found ${existingIdsSet.size} existing duplicate records in database.`);

    // 3. Compile bulk update operations
    const bulkOps = rawJobs.map((job) => {
      const isDuplicate = existingIdsSet.has(String(job.adzunaId));
      
      const { createdAt, ...jobData } = job;

      if (isDuplicate) {
        // If duplicate: update the existing document fields in place
        return {
          updateOne: {
            filter: { adzunaId: job.adzunaId },
            update: { 
              $set: jobData 
            },
          },
        };
      } else {
        // If new: insert as a fresh document
        return {
          updateOne: {
            filter: { adzunaId: job.adzunaId },
            update: {
              $set: jobData,
              $setOnInsert: { createdAt: createdAt || new Date() },
            },
            upsert: true,
          },
        };
      }
    });

    // 4. Run unordered bulk operations
    const result = await Job.bulkWrite(bulkOps, { ordered: false });

    // In bulkWrite, upserted returns new documents, modified/matched counts represent updates
    const insertedCount = result.upsertedCount + result.insertedCount;
    const updatedCount = result.modifiedCount;

    // Fetch total count of jobs currently saved in database
    const totalStored = await Job.countDocuments();

    logger.info(`📋 MongoDB updated: ${insertedCount + updatedCount} records`);
    logger.info(`📋 Duplicate skipped: ${existingIdsSet.size} records`);
    logger.info(`📋 Total jobs stored: ${totalStored} records`);

    return {
      success: true,
      processedCount: rawJobs.length,
      insertedCount,
      updatedCount,
    };

  } catch (error) {
    logger.error(`❌ JobDeduplicator Error: ${error.message}`);
    throw error;
  }
};

module.exports = { deduplicateAndSave };
