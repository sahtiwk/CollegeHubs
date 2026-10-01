/**
 * middleware/index.js — Barrel file
 *
 * Centralises all middleware exports so routes can import cleanly:
 *   const { protect, restrictTo } = require('../middleware');
 */

const { protect, restrictTo } = require('./auth.middleware');
const errorHandler             = require('./errorHandler');
const upload                   = require('./upload.middleware');

module.exports = {
  protect,
  restrictTo,
  errorHandler,
  upload,
};
