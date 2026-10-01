/**
 * controllers/adminScraper.controller.js
 *
 * Implements Job Scraper Control and Configurations.
 * Uses Adzuna search client to pull job postings and import them into local DB.
 */

const ScraperConfig = require('../models/ScraperConfig.model');
const ScraperLog    = require('../models/ScraperLog.model');
const Job           = require('../models/Job.model');
const User          = require('../models/User.model');
const adzunaService = require('../services/adzuna.service');
const AppError      = require('../utils/AppError');

const ADMIN_EMAIL = 'aftab@admin.com';

// In-memory reference to the running scheduler interval
let schedulerIntervalId = null;

// ─── Scraper Execution Task ──────────────────────────────────────
const runScrapeExecution = async (config, runByAdminId = null) => {
  const startTime = new Date();
  
  // Create running log
  const log = await ScraperLog.create({
    startTime,
    status: 'running',
  });

  try {
    // If scheduler-triggered, find super admin for postedBy field
    let adminId = runByAdminId;
    if (!adminId) {
      const superAdmin = await User.findOne({ email: ADMIN_EMAIL });
      adminId = superAdmin ? superAdmin._id : null;
    }

    if (!adminId) {
      throw new Error('No admin user found to associate with imported job listings.');
    }

    let jobsImported   = 0;
    let jobsUpdated    = 0;
    let duplicateCount = 0;

    // Iterate through configured keywords and fetch from Adzuna
    for (const keyword of config.keywords) {
      try {
        const searchResults = await adzunaService.searchJobs({
          what: keyword,
          country: config.country || 'us',
          results: config.maxJobs || 20,
        });

        const rawJobsList = searchResults?.jobs || [];

        for (const rJob of rawJobsList) {
          // Normalize contract type
          let contractType = 'full_time';
          if (rJob.contract === 'part_time') contractType = 'part_time';
          if (rJob.contract === 'contract')  contractType = 'contract';
          if (rJob.contract === 'internship')contractType = 'internship';

          // Duplicate checks (same title, company, location)
          const existing = await Job.findOne({
            title:    { $regex: `^${rJob.title.trim()}$`, $options: 'i' },
            company:  { $regex: `^${rJob.company.trim()}$`, $options: 'i' },
            location: { $regex: `^${rJob.location.trim()}$`, $options: 'i' },
          });

          if (existing) {
            // If already exists, we skip it or update description/salary if changed
            if (existing.isArchived) {
              existing.isArchived = false;
              await existing.save();
              jobsUpdated++;
            } else {
              duplicateCount++;
            }
          } else {
            // Create local job listing
            await Job.create({
              title:        rJob.title.trim(),
              company:      rJob.company.trim(),
              location:     rJob.location ? rJob.location.trim() : 'Remote',
              description:  rJob.description || 'No description provided.',
              salaryMin:    rJob.salary_min || null,
              salaryMax:    rJob.salary_max || null,
              contractType,
              category:     rJob.category || 'General',
              applyUrl:     rJob.url || '',
              postedBy:     adminId,
            });
            jobsImported++;
          }
        }
      } catch (err) {
        console.error(`[Scraper] Error fetching keyword "${keyword}":`, err.message);
      }
    }

    // Save success log
    log.endTime = new Date();
    log.status  = 'success';
    log.jobsImported   = jobsImported;
    log.jobsUpdated    = jobsUpdated;
    log.duplicateCount = duplicateCount;
    await log.save();

    // Update config stats
    config.lastRun = new Date();
    config.status  = 'idle';
    await config.save();

  } catch (err) {
    // Save failure log
    log.endTime = new Date();
    log.status  = 'failed';
    log.error   = err.message;
    await log.save();

    // Reset status in config
    config.status = 'idle';
    await config.save();
    console.error('[Scraper] Job Scrape task failed:', err.message);
  }
};

// ─── Initialize Scheduler ────────────────────────────────────────
exports.initScraperScheduler = async () => {
  try {
    let config = await ScraperConfig.findOne();
    if (!config) {
      config = await ScraperConfig.create({});
    }

    if (schedulerIntervalId) {
      clearInterval(schedulerIntervalId);
      schedulerIntervalId = null;
    }

    if (config.isActiveScheduler && config.status !== 'paused') {
      const intervalMs = config.scrapeInterval * 60 * 1000;
      schedulerIntervalId = setInterval(async () => {
        // Reload config in case settings changed
        const activeConfig = await ScraperConfig.findOne();
        if (activeConfig && activeConfig.isActiveScheduler && activeConfig.status !== 'paused') {
          activeConfig.status = 'running';
          await activeConfig.save();
          await runScrapeExecution(activeConfig);
        }
      }, intervalMs);
      console.log(`[Scraper] Automatic job scheduler initialized at interval: ${config.scrapeInterval} min.`);
    }
  } catch (err) {
    console.error('[Scraper] Scheduler initialization error:', err.message);
  }
};

// ─── GET /api/admin/scraper/status ────────────────────────────────
exports.getScraperStatus = async (req, res) => {
  let config = await ScraperConfig.findOne();
  if (!config) {
    config = await ScraperConfig.create({});
  }

  res.status(200).json({
    success: true,
    data: {
      config,
      schedulerRunning: !!schedulerIntervalId,
    },
  });
};

// ─── PATCH /api/admin/scraper/settings ────────────────────────────
exports.updateScraperSettings = async (req, res, next) => {
  const { scrapeInterval, maxJobs, keywords, country, remoteOnly, enabledSources } = req.body;

  let config = await ScraperConfig.findOne();
  if (!config) {
    config = new ScraperConfig();
  }

  if (scrapeInterval !== undefined) config.scrapeInterval = scrapeInterval;
  if (maxJobs !== undefined)        config.maxJobs        = maxJobs;
  if (keywords !== undefined)       config.keywords       = keywords;
  if (country !== undefined)        config.country        = country;
  if (remoteOnly !== undefined)     config.remoteOnly     = remoteOnly;
  if (enabledSources !== undefined) config.enabledSources = enabledSources;

  await config.save();

  // Re-init scheduler to pick up changes
  await exports.initScraperScheduler();

  res.status(200).json({ success: true, config });
};

// ─── POST /api/admin/scraper/run ──────────────────────────────────
exports.triggerManualScrape = async (req, res, next) => {
  const config = await ScraperConfig.findOne();
  if (!config) {
    return next(new AppError('Scraper configurations not found.', 500));
  }

  if (config.status === 'running') {
    return next(new AppError('Scraper task is already running.', 400));
  }

  config.status = 'running';
  await config.save();

  // Run asynchronously in the background to avoid HTTP timeout
  runScrapeExecution(config, req.admin._id);

  res.status(202).json({
    success: true,
    message: 'Manual scraping task triggered successfully in the background.',
  });
};

// ─── POST /api/admin/scraper/pause ────────────────────────────────
exports.pauseScraperScheduler = async (req, res) => {
  const config = await ScraperConfig.findOne();
  if (config) {
    config.isActiveScheduler = false;
    await config.save();
  }

  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
  }

  res.status(200).json({
    success: true,
    message: 'Scraper scheduler paused successfully.',
    config,
  });
};

// ─── POST /api/admin/scraper/resume ───────────────────────────────
exports.resumeScraperScheduler = async (req, res) => {
  const config = await ScraperConfig.findOne();
  if (config) {
    config.isActiveScheduler = true;
    await config.save();
  }

  await exports.initScraperScheduler();

  res.status(200).json({
    success: true,
    message: 'Scraper scheduler resumed successfully.',
    config,
  });
};

// ─── GET /api/admin/scraper/logs ──────────────────────────────────
exports.getScraperLogs = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ScraperLog.find().sort('-startTime').skip(skip).limit(limit),
    ScraperLog.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: { logs, total, page, pages: Math.ceil(total / limit) },
  });
};
