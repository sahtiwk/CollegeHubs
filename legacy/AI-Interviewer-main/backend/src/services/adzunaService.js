'use strict';

const axios = require('axios');
const logger = require('../config/logger');

// Retrieve credentials (check both standard and ADZUNA-prefixed variables)
const APP_ID = process.env.APP_ID || process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.APP_KEY || process.env.ADZUNA_APP_KEY;
const COUNTRY = process.env.ADZUNA_COUNTRY || 'gb'; // Default country code is 'gb'
const BASE_URL = 'https://api.adzuna.com/v1/api/jobs';

/**
 * Strips HTML formatting tags from string descriptions.
 *
 * @param {string} text
 * @returns {string} - Sanitized string
 */
const cleanHtml = (text) => {
  if (!text) return '';
  return text.replace(/<\/?[^>]+(>|$)/g, '').trim();
};

/**
 * Queries the external Adzuna REST API for job vacancies.
 *
 * @param {string} keyword - Search keywords / role title
 * @param {string} location - Target city or remote
 * @param {number} [page=1] - Pagination page
 * @returns {Promise<Array<object>>} - Cleaned flat JSON list of jobs
 */
const fetchJobs = async (keyword, location, page = 1) => {
  if (!APP_ID || !APP_KEY) {
    logger.error('❌ Adzuna Service: Missing App ID or App Key credentials.');
    throw new Error('Adzuna API credentials are not configured.');
  }

  logger.info(`🔍 Adzuna Service: Querying keyword: "${keyword}", location: "${location}", page: ${page}...`);

  // Construct query options
  const params = {
    app_id: APP_ID,
    app_key: APP_KEY,
    results_per_page: 20,
  };

  if (keyword) params.what = keyword;
  if (location) params.where = location;

  try {
    const url = `${BASE_URL}/${COUNTRY.toLowerCase()}/search/${Math.max(1, parseInt(page, 10))}`;
    
    const response = await axios.get(url, { params });

    if (!response.data || !Array.isArray(response.data.results)) {
      logger.warn('⚠️ Adzuna Service: Received empty response.');
      logger.info('📋 API success: Adzuna query returned empty list');
      return [];
    }

    // Map raw nested Adzuna objects into clean flat JSON
    const cleanedJobs = response.data.results.map((rawJob) => ({
      adzunaId: String(rawJob.id),
      title: (rawJob.title || '').trim(),
      company: (rawJob.company && rawJob.company.display_name) || 'Not Specified',
      location: (rawJob.location && rawJob.location.display_name) || 'Remote',
      description: cleanHtml(rawJob.description),
      salaryMin: rawJob.salary_min ? Number(rawJob.salary_min) : null,
      salaryMax: rawJob.salary_max ? Number(rawJob.salary_max) : null,
      category: (rawJob.category && rawJob.category.label) || 'Programming',
      contractType: rawJob.contract_time || rawJob.contract_type || 'Full-time',
      redirectUrl: rawJob.redirect_url || '',
      source: 'Adzuna',
      isActive: true,
      createdAt: rawJob.created ? new Date(rawJob.created) : new Date(),
    }));

    logger.info(`📋 API success: Adzuna query returned ${cleanedJobs.length} jobs.`);
    return cleanedJobs;

  } catch (error) {
    logger.error(`📋 API failed: Adzuna query failed - Error: ${error.message}`);
    throw error;
  }
};

module.exports = { fetchJobs };
