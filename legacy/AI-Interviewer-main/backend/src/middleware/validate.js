/**
 * middleware/validate.js
 *
 * Reusable express-validator result checker.
 * Drop this after any validation chain to auto-reject bad requests:
 *
 *   router.post('/login', [...validationRules], validate, loginController);
 */

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array()[0].msg;
    return next(new AppError(message, 400));
  }
  next();
};

module.exports = validate;
