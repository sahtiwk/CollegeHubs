/**
 * middleware/adminAuth.middleware.js
 *
 * Admin-specific authentication middleware.
 * Separated from auth.middleware.js so admin routes have their own
 * protection layer, independent of regular user auth.
 *
 * Roles hierarchy:
 *   super_admin > admin > candidate
 *
 * Middleware:
 *   protectAdmin     — verifies JWT, ensures role is admin or super_admin
 *   requireSuperAdmin — further restricts to super_admin only
 */

const jwt     = require('jsonwebtoken');
const User    = require('../models/User.model');
const AppError = require('../utils/AppError');

const ADMIN_ROLES = ['admin', 'super_admin'];

// ─── protectAdmin ─────────────────────────────────────────────────
// Verifies the Bearer token and confirms the user holds an admin role.
// Attaches the full user document to req.admin (not req.user, to avoid
// collision with regular user middleware on shared routes).
exports.protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Admin access requires authentication. Please log in.', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user) {
      return next(new AppError('The admin account no longer exists.', 401));
    }

    // Must hold an admin-level role
    if (!ADMIN_ROLES.includes(user.role)) {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    if (!user.isActive) {
      return next(new AppError('This admin account has been deactivated.', 403));
    }

    if (user.isBanned) {
      return next(new AppError('This admin account has been banned.', 403));
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('Password recently changed. Please log in again.', 401));
    }

    // Attach as req.admin AND req.user for compatibility with shared controllers
    req.admin = user;
    req.user  = user;
    next();

  } catch (err) {
    if (err.name === 'JsonWebTokenError')  return next(new AppError('Invalid admin token.', 401));
    if (err.name === 'TokenExpiredError') return next(new AppError('Admin token expired. Please log in again.', 401));
    return next(err);
  }
};

// ─── requireSuperAdmin ────────────────────────────────────────────
// Must be used AFTER protectAdmin.
// Restricts the route to super_admin only.
exports.requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== 'super_admin') {
    return next(new AppError('This action requires Super Admin privileges.', 403));
  }
  next();
};

// ─── isAdminRole helper (utility, not middleware) ─────────────────
exports.isAdminRole = (role) => ADMIN_ROLES.includes(role);
