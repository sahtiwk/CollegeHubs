/**
 * controllers/adminJob.controller.js
 *
 * Handles Admin Job Posting Management:
 *   - CRUD operations for local jobs
 *   - Duplicate detection on creation
 *   - Bulk actions (Delete, Archive, Pin, Feature)
 *   - Search, sorting, pagination, and advanced filtering
 *   - Platform-wide job stats (Total, Pinned, Featured, Archived, Contract Types)
 */

const Job      = require('../models/Job.model');
const AppError = require('../utils/AppError');

// ─── Duplicate Detection Helper ──────────────────────────────────
// Returns true if a job with same title, company, and location already exists (unarchived).
const checkDuplicateJob = async (title, company, location) => {
  const existing = await Job.findOne({
    title:    { $regex: `^${title.trim()}$`, $options: 'i' },
    company:  { $regex: `^${company.trim()}$`, $options: 'i' },
    location: { $regex: `^${location.trim()}$`, $options: 'i' },
    isArchived: false,
  });
  return !!existing;
};

// ─── POST /api/admin/jobs ──────────────────────────────────────────
exports.createJob = async (req, res, next) => {
  const {
    title, company, location, description, salaryMin, salaryMax,
    contractType, category, isFeatured, isPinned, applyUrl, ignoreDuplicate
  } = req.body;

  if (!title || !company || !description) {
    return next(new AppError('Job title, company, and description are required.', 400));
  }

  // Duplicate Detection
  if (!ignoreDuplicate) {
    const isDup = await checkDuplicateJob(title, company, location || 'Remote');
    if (isDup) {
      return res.status(409).json({
        success: false,
        duplicateDetected: true,
        message: 'A job listing with the same title, company, and location already exists.',
      });
    }
  }

  const job = await Job.create({
    title: title.trim(),
    company: company.trim(),
    location: (location || 'Remote').trim(),
    description,
    salaryMin: salaryMin || null,
    salaryMax: salaryMax || null,
    contractType: contractType || 'full_time',
    category: category || 'General',
    isFeatured: !!isFeatured,
    isPinned: !!isPinned,
    applyUrl: (applyUrl || '').trim(),
    postedBy: req.admin._id,
  });

  res.status(201).json({ success: true, job });
};

// ─── GET /api/admin/jobs ───────────────────────────────────────────
exports.getAllJobs = async (req, res) => {
  const page         = parseInt(req.query.page)  || 1;
  const limit        = parseInt(req.query.limit) || 15;
  const skip         = (page - 1) * limit;
  const search       = req.query.search || '';
  const contractType = req.query.contractType;
  const filterType   = req.query.filterType; // 'all' | 'featured' | 'pinned' | 'archived'
  const sortBy       = req.query.sortBy  || 'createdAt';
  const sortDir      = req.query.sortDir || 'desc';

  const filter = {};

  if (search) {
    filter.$or = [
      { title:   { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }

  if (contractType && contractType !== 'all') {
    filter.contractType = contractType;
  }

  if (filterType && filterType !== 'all') {
    if (filterType === 'featured') filter.isFeatured = true;
    if (filterType === 'pinned')   filter.isPinned = true;
    if (filterType === 'archived') filter.isArchived = true;
  }

  // If not explicitly searching archived, filter them out by default
  if (filterType !== 'archived') {
    filter.isArchived = false;
  }

  // Sort query builder: Pinned jobs are always forced to the top, then custom sort
  const sortQuery = { isPinned: -1 };
  sortQuery[sortBy] = sortDir === 'asc' ? 1 : -1;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate({ path: 'postedBy', select: 'name email' }),
    Job.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { jobs, total, page, pages: Math.ceil(total / limit) },
  });
};

// ─── GET /api/admin/jobs/stats ─────────────────────────────────────
exports.getJobStats = async (req, res) => {
  const [totalJobs, pinnedJobs, featuredJobs, archivedJobs, contractTypeAgg] = await Promise.all([
    Job.countDocuments({ isArchived: false }),
    Job.countDocuments({ isPinned: true, isArchived: false }),
    Job.countDocuments({ isFeatured: true, isArchived: false }),
    Job.countDocuments({ isArchived: true }),
    Job.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$contractType', count: { $sum: 1 } } }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalJobs,
      pinnedJobs,
      featuredJobs,
      archivedJobs,
      contractTypes: contractTypeAgg,
    }
  });
};

// ─── GET /api/admin/jobs/:id ───────────────────────────────────────
exports.getJobById = async (req, res, next) => {
  const job = await Job.findById(req.params.id).populate({ path: 'postedBy', select: 'name email' });
  if (!job) return next(new AppError('Job listing not found.', 404));
  res.status(200).json({ success: true, job });
};

// ─── PATCH /api/admin/jobs/:id ─────────────────────────────────────
exports.updateJob = async (req, res, next) => {
  const {
    title, company, location, description, salaryMin, salaryMax,
    contractType, category, isFeatured, isPinned, isArchived, applyUrl
  } = req.body;

  const job = await Job.findById(req.params.id);
  if (!job) return next(new AppError('Job listing not found.', 404));

  const allowedFields = {};
  if (title !== undefined)        allowedFields.title        = title.trim();
  if (company !== undefined)      allowedFields.company      = company.trim();
  if (location !== undefined)     allowedFields.location     = location.trim();
  if (description !== undefined)  allowedFields.description  = description;
  if (salaryMin !== undefined)    allowedFields.salaryMin    = salaryMin;
  if (salaryMax !== undefined)    allowedFields.salaryMax    = salaryMax;
  if (contractType !== undefined) allowedFields.contractType = contractType;
  if (category !== undefined)     allowedFields.category     = category;
  if (isFeatured !== undefined)   allowedFields.isFeatured   = !!isFeatured;
  if (isPinned !== undefined)     allowedFields.isPinned     = !!isPinned;
  if (isArchived !== undefined)   allowedFields.isArchived   = !!isArchived;
  if (applyUrl !== undefined)     allowedFields.applyUrl     = applyUrl.trim();

  const updatedJob = await Job.findByIdAndUpdate(req.params.id, allowedFields, {
    new: true, runValidators: true,
  });

  res.status(200).json({ success: true, job: updatedJob });
};

// ─── DELETE /api/admin/jobs/:id ────────────────────────────────────
exports.deleteJob = async (req, res, next) => {
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) return next(new AppError('Job listing not found.', 404));
  res.status(200).json({ success: true, message: 'Job listing deleted successfully.' });
};

// ─── POST /api/admin/jobs/bulk ─────────────────────────────────────
exports.bulkJobAction = async (req, res, next) => {
  const { jobIds, action } = req.body;

  if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
    return next(new AppError('No job IDs provided.', 400));
  }

  const validActions = ['archive', 'unarchive', 'feature', 'unfeature', 'pin', 'unpin', 'delete'];
  if (!validActions.includes(action)) {
    return next(new AppError('Invalid bulk action.', 400));
  }

  if (action === 'archive') {
    await Job.updateMany({ _id: { $in: jobIds } }, { isArchived: true });
  } else if (action === 'unarchive') {
    await Job.updateMany({ _id: { $in: jobIds } }, { isArchived: false });
  } else if (action === 'feature') {
    await Job.updateMany({ _id: { $in: jobIds } }, { isFeatured: true });
  } else if (action === 'unfeature') {
    await Job.updateMany({ _id: { $in: jobIds } }, { isFeatured: false });
  } else if (action === 'pin') {
    await Job.updateMany({ _id: { $in: jobIds } }, { isPinned: true });
  } else if (action === 'unpin') {
    await Job.updateMany({ _id: { $in: jobIds } }, { isPinned: false });
  } else if (action === 'delete') {
    await Job.deleteMany({ _id: { $in: jobIds } });
  }

  res.status(200).json({
    success: true,
    message: `Bulk ${action} operation completed successfully on ${jobIds.length} listings.`,
  });
};
