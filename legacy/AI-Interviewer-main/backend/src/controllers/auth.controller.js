const { validationResult } = require('express-validator');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const { sendTokenResponse } = require('../utils/jwt.utils');

const ADMIN_EMAIL = 'aftab@admin.com';

// ─── POST /api/auth/register ───────────────────────────────────────
exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  // Assign super_admin role automatically for the designated admin email
  const role = email.toLowerCase() === ADMIN_EMAIL ? 'super_admin' : 'candidate';
  const user = await User.create({ name, email, password, role });
  sendTokenResponse(user, 201, res);
};

// ─── POST /api/auth/login ─────────────────────────────────────────
exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated.', 403));
  }

  if (user.isBanned) {
    return next(new AppError('Your account has been banned due to violation of terms.', 403));
  }

  // Ensure admin email always has super_admin role (self-healing)
  if (email.toLowerCase() === ADMIN_EMAIL && user.role !== 'super_admin') {
    user.role = 'super_admin';
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
};

// ─── POST /api/auth/refresh ────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token is required.', 400));
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError('User no longer exists.', 401));

    const { generateAccessToken } = require('../utils/jwt.utils');
    const accessToken = generateAccessToken(user._id);

    res.status(200).json({ success: true, accessToken });
  } catch {
    return next(new AppError('Invalid or expired refresh token.', 401));
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, user });
};

// ─── POST /api/auth/logout ────────────────────────────────────────
exports.logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};
