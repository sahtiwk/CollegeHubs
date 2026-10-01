/**
 * middleware/rbac.js
 *
 * Implements Role-Based Access Control (RBAC) middleware mapping.
 * Connects permissions identifiers to specific platform actions.
 */

const AppError = require('../utils/AppError');

// Master Roles & Permissions Map
const ROLE_PERMISSIONS = {
  super_admin: ['*'], // wildcard access
  admin: [
    'view:users', 'update:users',
    'view:jobs', 'create:jobs', 'update:jobs', 'delete:jobs',
    'view:templates', 'create:templates', 'update:templates', 'delete:templates',
    'view:payments', 'view:scraper', 'run:scraper',
    'view:prompts', 'update:prompts',
    'view:logs', 'view:analytics', 'view:settings', 'update:settings'
  ],
  content_manager: [
    'view:jobs', 'create:jobs', 'update:jobs', 'delete:jobs',
    'view:templates', 'create:templates', 'update:templates', 'delete:templates',
    'view:scraper', 'run:scraper',
  ],
  support: [
    'view:users', 'update:users',
    'view:payments', 'refund:payments',
    'view:logs',
  ],
};

// Evaluate permissions check
const hasPermission = (role, permission) => {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true; // super admin override
  return perms.includes(permission);
};

// Retrieve permissions list for a role
const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

// Express check permission middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    // req.admin must be attached by auth middleware
    const admin = req.admin;
    if (!admin) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!hasPermission(admin.role, permission)) {
      return next(new AppError('Forbidden: Insufficient privileges for this action.', 403));
    }

    next();
  };
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  requirePermission,
};
