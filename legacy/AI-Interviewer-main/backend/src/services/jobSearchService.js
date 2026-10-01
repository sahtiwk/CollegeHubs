'use strict';

const Job = require('../models/Job.model');

/**
 * Service to retrieve active paginated jobs from MongoDB, sorted by latest first.
 * Supports optional keyword, location, category, contractType, and salaryMin filters.
 *
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.keyword]
 * @param {string} [params.location]
 * @param {string} [params.category]
 * @param {string} [params.contractType]
 * @param {number|string} [params.salaryMin]
 * @returns {Promise<object>} - Clean JSON paginated envelope
 */
const getActiveJobs = async ({
  page = 1,
  limit = 20,
  keyword,
  location,
  category,
  contractType,
  salaryMin
}) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  // Build the MongoDB filter criteria dynamically
  const filter = { isActive: true };

  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { company: { $regex: keyword, $options: 'i' } }
    ];
  }

  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }

  if (category) {
    filter.category = { $regex: category, $options: 'i' };
  }

  if (contractType) {
    filter.contractType = contractType;
  }

  if (salaryMin) {
    const salMinVal = Number(salaryMin);
    if (!isNaN(salMinVal)) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { salaryMax: { $gte: salMinVal } },
          { salaryMin: { $gte: salMinVal } }
        ]
      });
    }
  }

  // Execute count and query concurrently to maximize throughput
  const [total, results] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter)
      .sort({ postedTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  // Formatter to map MongoDB fields to UI-expected schema properties
  const presentDbJob = (job) => {
    let salaryStr = 'Competitive Salary';
    if (job.salaryMin || job.salaryMax) {
      const minVal = job.salaryMin ? Math.round(job.salaryMin).toLocaleString() : null;
      const maxVal = job.salaryMax ? Math.round(job.salaryMax).toLocaleString() : null;
      if (minVal && maxVal) {
        salaryStr = minVal === maxVal ? `£${minVal}` : `£${minVal} – £${maxVal}`;
      } else if (minVal) {
        salaryStr = `£${minVal}+`;
      } else if (maxVal) {
        salaryStr = `£${maxVal}`;
      }
    }

    let summaryStr = 'No description provided.';
    if (job.description) {
      const flat = job.description.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (flat.length <= 150) {
        summaryStr = flat;
      } else {
        const sentenceEnd = flat.slice(0, 150).lastIndexOf('.');
        if (sentenceEnd > 75) {
          summaryStr = flat.slice(0, sentenceEnd + 1);
        } else {
          const wordEnd = flat.slice(0, 150).lastIndexOf(' ');
          summaryStr = `${flat.slice(0, wordEnd > 0 ? wordEnd : 150)}…`;
        }
      }
    }

    return {
      id: job.adzunaId || job._id.toString(),
      title: job.title || '',
      company: job.company || 'Not Specified',
      location: job.location || 'Remote',
      salary: salaryStr,
      summary: summaryStr,
      apply_url: job.redirectUrl || '',
      url: job.redirectUrl || '',
      category: job.category || '',
      postedTime: job.postedTime || job.createdAt || null,
      isActive: job.isActive
    };
  };

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    total,
    page: pageNum,
    totalPages,
    results: results.map(presentDbJob)
  };
};

module.exports = { getActiveJobs };
