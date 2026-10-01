const User = require('../models/User.model');
const Session = require('../models/Session.model');
const AppError = require('../utils/AppError');

// ─── GET /api/users/profile ───────────────────────────────────────
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({ path: 'resumes', select: 'fileName originalName isDefault parseStatus createdAt' });

  res.status(200).json({ success: true, user });
};

// ─── PUT /api/users/profile ───────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  const { name, avatar } = req.body;

  const allowedFields = {};
  if (name) allowedFields.name = name;
  if (avatar) allowedFields.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, allowedFields, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, user });
};

// ─── PUT /api/users/change-password ───────────────────────────────
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  res.status(200).json({ success: true, message: 'Password updated successfully.' });
};

// ─── GET /api/users/dashboard ─────────────────────────────────────
exports.getDashboard = async (req, res) => {
  const userId = req.user._id;

  const [totalSessions, completedSessions, recentSessions] = await Promise.all([
    Session.countDocuments({ userId }),
    Session.countDocuments({ userId, status: 'completed' }),
    Session.find({ userId, status: 'completed' })
      .sort('-createdAt')
      .limit(5)
      .populate({ path: 'interviewId', select: 'jobTitle company experienceLevel' }),
  ]);

  const scoreAgg = await Session.aggregate([
    { $match: { userId, status: 'completed', overallScore: { $ne: null } } },
    { $group: { _id: null, avgScore: { $avg: '$overallScore' }, maxScore: { $max: '$overallScore' } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalSessions,
      completedSessions,
      averageScore: scoreAgg[0]?.avgScore?.toFixed(1) ?? 0,
      bestScore: scoreAgg[0]?.maxScore ?? 0,
      recentSessions,
    },
  });
};
