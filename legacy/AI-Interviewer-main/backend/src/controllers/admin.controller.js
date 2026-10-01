const User        = require('../models/User.model');
const Interview   = require('../models/Interview.model');
const Session     = require('../models/Session.model');
const Resume      = require('../models/Resume.model');
const Job         = require('../models/Job.model');
const Transaction = require('../models/Transaction.model');
const AuditLog    = require('../models/AuditLog.model');
const AppError    = require('../utils/AppError');

const ADMIN_EMAIL = 'aftab@admin.com';
const ADMIN_ROLES = ['admin', 'super_admin'];


// ─── GET /api/admin/stats ──────────────────────────────────────────
exports.getStats = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    premiumUsers,
    totalInterviews,
    totalSessions,
    totalResumes,
    activeUsers,
    completedSessions,
    interviewsToday,
    jobsCount,
  ] = await Promise.all([
    User.countDocuments({ role: 'candidate' }),
    User.countDocuments({ role: 'candidate', isPremium: true }),
    Interview.countDocuments(),
    Session.countDocuments(),
    Resume.countDocuments(),
    User.countDocuments({ isActive: true, role: 'candidate' }),
    Session.countDocuments({ status: 'completed' }),
    Interview.countDocuments({ createdAt: { $gte: today } }),
    Job.countDocuments({ isArchived: false }),
  ]);

  const freeUsers = Math.max(0, totalUsers - premiumUsers);
  const applicationsCount = totalResumes + totalSessions;

  // Real aggregate platform revenue
  const revAgg = await Transaction.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalRevenue = revAgg[0]?.total || 0;

  // Recent registrations (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo }, role: 'candidate' });

  // Average session score
  const scoreAgg = await Session.aggregate([
    { $match: { status: 'completed', overallScore: { $ne: null } } },
    { $group: { _id: null, avgScore: { $avg: '$overallScore' } } },
  ]);

  // Fetch recent data to build system activity feed
  const [recentRegs, recentSess, recentRes] = await Promise.all([
    User.find({ role: 'candidate' }).sort('-createdAt').limit(5),
    Session.find().sort('-createdAt').limit(5).populate({ path: 'userId', select: 'name email' }).populate({ path: 'interviewId', select: 'jobTitle' }),
    Resume.find().sort('-createdAt').limit(5).populate({ path: 'userId', select: 'name email' }),
  ]);

  let activities = [];
  recentRegs.forEach(u => {
    activities.push({
      id: `user-${u._id}`,
      type: 'user',
      title: 'New Candidate Registered',
      message: `${u.name} (${u.email}) joined the platform`,
      timestamp: u.createdAt,
    });
  });
  recentSess.forEach(s => {
    if (s.userId) {
      activities.push({
        id: `session-${s._id}`,
        type: 'session',
        title: 'Interview Completed',
        message: `${s.userId.name} completed mock interview for ${s.interviewId?.jobTitle || 'Developer'}`,
        timestamp: s.createdAt,
        score: s.overallScore,
      });
    }
  });
  recentRes.forEach(r => {
    if (r.userId) {
      activities.push({
        id: `resume-${r._id}`,
        type: 'resume',
        title: 'Resume Uploaded',
        message: `${r.userId.name} uploaded a new resume file`,
        timestamp: r.createdAt,
      });
    }
  });

  // Sort unified activities in descending order
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  activities = activities.slice(0, 8);

  // Generate charts datasets (User Growth, Revenue, Interviews, Daily Activity)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [usersTrend, revTrend, intTrend] = await Promise.all([
    User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, role: 'candidate' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      }
    ]),
    Transaction.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'success' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$amount' }
        }
      }
    ]),
    Session.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const userGrowthMap = {};
  usersTrend.forEach(u => { userGrowthMap[u._id] = u.count; });
  
  const revMap = {};
  revTrend.forEach(r => { revMap[r._id] = r.total; });

  const intMap = {};
  intTrend.forEach(i => { intMap[i._id] = i.count; });

  const monthData = [];
  let cumulativeUsers = await User.countDocuments({ createdAt: { $lt: sixMonthsAgo }, role: 'candidate' });

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = monthNames[d.getMonth()];
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    const monthlyRegs = userGrowthMap[key] || 0;
    cumulativeUsers += monthlyRegs;

    monthData.push({
      monthName,
      users: cumulativeUsers,
      revenue: revMap[key] || 0,
      interviews: intMap[key] || 0
    });
  }

  const charts = {
    userGrowth: monthData.map(m => ({ month: m.monthName, users: m.users })),
    revenue: monthData.map(m => ({ month: m.monthName, amount: m.revenue })),
    interviews: monthData.map(m => ({ month: m.monthName, count: m.interviews })),
    dailyActivity: [],
  };

  // Daily activity distribution (days of current week Mon-Sun)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const startOfWeek = new Date();
  const dayOfWeek = startOfWeek.getDay();
  const diffOffset = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diffOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const [weekSessions, weekUsers] = await Promise.all([
    Session.aggregate([
      { $match: { createdAt: { $gte: startOfWeek } } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 }
        }
      }
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startOfWeek }, role: 'candidate' } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const sessionDaysMap = {};
  weekSessions.forEach(s => { sessionDaysMap[s._id] = s.count; });
  
  const userDaysMap = {};
  weekUsers.forEach(u => { userDaysMap[u._id] = u.count; });

  const mongoDayMapping = [2, 3, 4, 5, 6, 7, 1]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  charts.dailyActivity = daysOfWeek.map((day, idx) => {
    const mongoDay = mongoDayMapping[idx];
    return {
      day,
      sessions: sessionDaysMap[mongoDay] || 0,
      users: userDaysMap[mongoDay] || 0,
    };
  });

  // System warning / error logs from database
  const failures = await AuditLog.find({ status: { $in: ['failed', 'warning'] } })
    .sort('-createdAt')
    .limit(5);

  const recentErrors = failures.map(f => ({
    id: f._id,
    service: f.category.toUpperCase() + ' - ' + f.action,
    message: f.details,
    timestamp: f.createdAt,
    severity: f.status,
  }));

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      premiumUsers,
      freeUsers,
      interviewsToday,
      totalInterviews,
      jobsCount,
      applicationsCount,
      totalRevenue,
      activeUsers,
      newUsersThisWeek: newUsers,
      platformAvgScore: scoreAgg[0]?.avgScore?.toFixed(1) ?? 0,
      activities,
      charts,
      recentErrors,
    },
  });
};

// ─── GET /api/admin/users ──────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  const page    = parseInt(req.query.page)  || 1;
  const limit   = parseInt(req.query.limit) || 20;
  const skip    = (page - 1) * limit;
  const search  = req.query.search || '';
  const role    = req.query.role;
  const status  = req.query.status;
  const sortBy  = req.query.sortBy  || 'createdAt';
  const sortDir = req.query.sortDir || 'desc';

  const filter = {};
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role && role !== 'all') {
    filter.role = role;
  }
  
  if (status && status !== 'all') {
    if (status === 'active') {
      filter.isActive = true;
      filter.isBanned = false;
    } else if (status === 'inactive') {
      filter.isActive = false;
      filter.isBanned = false;
    } else if (status === 'banned') {
      filter.isBanned = true;
    } else if (status === 'premium') {
      filter.isPremium = true;
    }
  }

  // Build dynamic sort query
  const sortQuery = {};
  sortQuery[sortBy] = sortDir === 'asc' ? 1 : -1;

  const [users, total] = await Promise.all([
    User.find(filter).sort(sortQuery).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { users, total, page, pages: Math.ceil(total / limit) },
  });
};

// ─── GET /api/admin/users/:id ──────────────────────────────────────
exports.getUserById = async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate('resumes')
    .populate({
      path: 'sessions',
      options: { sort: { createdAt: -1 } },
      populate: { path: 'interviewId', select: 'jobTitle company' }
    });
  if (!user) return next(new AppError('User not found.', 404));

  const [interviewCount, sessionCount, resumeCount] = await Promise.all([
    Interview.countDocuments({ userId: user._id }),
    Session.countDocuments({ userId: user._id }),
    Resume.countDocuments({ userId: user._id }),
  ]);

  res.status(200).json({
    success: true,
    data: { user, interviewCount, sessionCount, resumeCount },
  });
};

// ─── PATCH /api/admin/users/:id ────────────────────────────────────
exports.updateUser = async (req, res, next) => {
  const { name, role, isActive, isBanned, isPremium, credits, creditsChange } = req.body;

  // Prevent removing admin role from the super admin
  const target = await User.findById(req.params.id);
  if (!target) return next(new AppError('User not found.', 404));
  // Prevent modifying the super admin's own role
  if (target.email === ADMIN_EMAIL && role && role !== 'super_admin') {
    return next(new AppError('Cannot change the role of the super admin.', 403));
  }

  const allowedFields = {};
  if (name !== undefined) allowedFields.name = name;
  if (role !== undefined) allowedFields.role = role;
  if (isActive !== undefined) allowedFields.isActive = isActive;
  if (isBanned !== undefined) allowedFields.isBanned = isBanned;
  if (isPremium !== undefined) allowedFields.isPremium = isPremium;
  if (credits !== undefined) allowedFields.credits = credits;

  if (creditsChange !== undefined) {
    allowedFields.$inc = { credits: creditsChange };
  }

  const user = await User.findByIdAndUpdate(req.params.id, allowedFields, {
    new: true, runValidators: true,
  });

  res.status(200).json({ success: true, user });
};

// ─── POST /api/admin/users/bulk ────────────────────────────────────
exports.bulkUserAction = async (req, res, next) => {
  const { userIds, action } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return next(new AppError('No user IDs provided.', 400));
  }

  if (!['activate', 'deactivate', 'ban', 'unban', 'delete'].includes(action)) {
    return next(new AppError('Invalid bulk action.', 400));
  }

  // Prevent modifying the super admin in bulk actions
  const safeUserIds = [];
  const usersToInspect = await User.find({ _id: { $in: userIds } });
  
  usersToInspect.forEach(u => {
    if (u.email !== ADMIN_EMAIL) {
      safeUserIds.push(u._id);
    }
  });

  if (safeUserIds.length === 0) {
    return next(new AppError('No modifications allowed on the protected super admin account.', 403));
  }

  if (action === 'activate') {
    await User.updateMany({ _id: { $in: safeUserIds } }, { isActive: true });
  } else if (action === 'deactivate') {
    await User.updateMany({ _id: { $in: safeUserIds } }, { isActive: false });
  } else if (action === 'ban') {
    await User.updateMany({ _id: { $in: safeUserIds } }, { isBanned: true });
  } else if (action === 'unban') {
    await User.updateMany({ _id: { $in: safeUserIds } }, { isBanned: false });
  } else if (action === 'delete') {
    // Cascade delete user data for all targeted users
    await Promise.all([
      Interview.deleteMany({ userId: { $in: safeUserIds } }),
      Session.deleteMany({ userId: { $in: safeUserIds } }),
      Resume.deleteMany({ userId: { $in: safeUserIds } }),
      User.deleteMany({ _id: { $in: safeUserIds } }),
    ]);
  }

  res.status(200).json({
    success: true,
    message: `Bulk ${action} operation completed successfully on ${safeUserIds.length} users.`,
  });
};

// ─── DELETE /api/admin/users/:id ───────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));
  if (user.email === ADMIN_EMAIL) {
    return next(new AppError('Cannot delete the super admin account.', 403));
  }

  // Cascade delete all user data
  await Promise.all([
    Interview.deleteMany({ userId: user._id }),
    Session.deleteMany({ userId: user._id }),
    Resume.deleteMany({ userId: user._id }),
    user.deleteOne(),
  ]);

  res.status(200).json({ success: true, message: 'User and all associated data deleted.' });
};

// ─── GET /api/admin/interviews ─────────────────────────────────────
exports.getAllInterviews = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip  = (page - 1) * limit;

  const [interviews, total] = await Promise.all([
    Interview.find()
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({ path: 'userId', select: 'name email' }),
    Interview.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: { interviews, total, page, pages: Math.ceil(total / limit) },
  });
};

// ─── DELETE /api/admin/interviews/:id ──────────────────────────────
exports.deleteInterview = async (req, res, next) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) return next(new AppError('Interview not found.', 404));

  await Promise.all([
    Session.deleteMany({ interviewId: interview._id }),
    interview.deleteOne(),
  ]);

  res.status(200).json({ success: true, message: 'Interview and its sessions deleted.' });
};

// ─── GET /api/admin/sessions ───────────────────────────────────────
exports.getAllSessions = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip  = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    Session.find()
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({ path: 'userId',      select: 'name email' })
      .populate({ path: 'interviewId', select: 'jobTitle company' }),
    Session.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: { sessions, total, page, pages: Math.ceil(total / limit) },
  });
};

// ─── DELETE /api/admin/sessions/:id ───────────────────────────────
exports.deleteSession = async (req, res, next) => {
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) return next(new AppError('Session not found.', 404));

  res.status(200).json({ success: true, message: 'Session deleted.' });
};

// ─── GET /api/admin/resumes ────────────────────────────────────────
exports.getAllResumes = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip  = (page - 1) * limit;

  const [resumes, total] = await Promise.all([
    Resume.find()
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({ path: 'userId', select: 'name email' }),
    Resume.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: { resumes, total, page, pages: Math.ceil(total / limit) },
  });
};

// ─── DELETE /api/admin/resumes/:id ────────────────────────────────
exports.deleteResume = async (req, res, next) => {
  const resume = await Resume.findByIdAndDelete(req.params.id);
  if (!resume) return next(new AppError('Resume not found.', 404));

  res.status(200).json({ success: true, message: 'Resume deleted.' });
};
