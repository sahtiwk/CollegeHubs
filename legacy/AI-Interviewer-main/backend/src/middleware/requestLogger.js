/**
 * middleware/requestLogger.js
 *
 * Custom request/response logger using Winston.
 * Logs method, url, status code, and response time.
 * Used alongside Morgan for structured logging in production.
 */

const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger[level](
      `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms) [${req.ip}]`
    );
  });

  next();
};

module.exports = requestLogger;
