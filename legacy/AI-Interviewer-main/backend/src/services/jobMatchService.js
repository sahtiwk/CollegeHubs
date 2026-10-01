'use strict';

const Job = require('../models/Job.model');
const logger = require('../config/logger');

// Common tech keywords to extract from description if the job has no parsed skills
const TECH_SKILLS_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'rust', 'golang', 'ruby', 'php',
  'react', 'angular', 'vue', 'next.js', 'svelte', 'node.js', 'express', 'nest.js', 'django',
  'flask', 'spring', 'laravel', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'graphql', 'rest api', 'ci/cd', 'git'
];

/**
 * Extracts technology keywords from a job description text.
 */
const extractSkillsFromDescription = (description) => {
  if (!description) return [];
  const descLower = description.toLowerCase();
  const extracted = [];

  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const skill of TECH_SKILLS_KEYWORDS) {
    const escaped = escapeRegExp(skill);
    const regex = new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i');
    if (regex.test(descLower)) {
      extracted.push(skill);
    }
  }
  return extracted;
};

/**
 * Compares user skills with job descriptions to calculate match percentages and filter listings.
 *
 * @param {Array<string>} userSkills - Array of user skills (e.g. ['React', 'Node.js', 'Javascript'])
 * @param {Array<object>} [jobsList] - Optional array of jobs. If omitted, queries all active jobs from MongoDB.
 * @returns {Promise<Array<object>>} - List of jobs matching >= 60%, sorted by highest match score
 */
const matchUserToJobs = async (userSkills, jobsList = null) => {
  if (!Array.isArray(userSkills) || userSkills.length === 0) {
    logger.warn('⚠️ JobMatchService: Provided user skills array is empty.');
    return [];
  }

  // Normalize user skills to lowercase
  const normUserSkills = userSkills.map((s) => s.toLowerCase().trim());
  logger.info(`🎯 JobMatchService: Evaluating match scores against user skills: [${userSkills.join(', ')}]...`);

  try {
    // 1. Retrieve jobs list (either passed argument or query active DB documents)
    let jobs = jobsList;
    if (!jobs) {
      logger.info('🎯 JobMatchService: Querying active jobs from MongoDB...');
      jobs = await Job.find({ isActive: true }).lean();
    }

    const matchedJobs = [];

    // 2. Loop through jobs and evaluate match percentage
    for (const job of jobs) {
      // Get job's required skills (pre-parsed skills array or extract from description)
      let jobSkills = Array.isArray(job.skills) ? job.skills.map((s) => s.toLowerCase().trim()) : [];
      if (jobSkills.length === 0 && job.description) {
        jobSkills = extractSkillsFromDescription(job.description);
      }

      let matchScore = 0;

      if (jobSkills.length > 0) {
        // Calculate intersection of candidate skills and job requirements
        const overlaps = jobSkills.filter((skill) => normUserSkills.includes(skill));
        matchScore = Math.round((overlaps.length / jobSkills.length) * 100);
      } else if (job.description) {
        // Fallback: Scan job description text for user skills directly
        const descLower = job.description.toLowerCase();
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        let matchedCount = 0;
        for (const skill of normUserSkills) {
          const regex = new RegExp(`(?<!\\w)${escapeRegExp(skill)}(?!\\w)`, 'i');
          if (regex.test(descLower)) {
            matchedCount++;
          }
        }
        matchScore = Math.round((matchedCount / normUserSkills.length) * 100);
      }

      // 3. Filter jobs: Keep only those with at least 60% match
      if (matchScore >= 60) {
        matchedJobs.push({
          ...job,
          matchScore,
        });
      }
    }

    // 4. Sort results: Highest score first
    matchedJobs.sort((a, b) => b.matchScore - a.matchScore);

    logger.info(`✅ JobMatchService: Found ${matchedJobs.length} matching jobs with >= 60% match score.`);
    return matchedJobs;

  } catch (error) {
    logger.error(`❌ JobMatchService Error: ${error.message}`);
    throw error;
  }
};

module.exports = { matchUserToJobs, extractSkillsFromDescription };
