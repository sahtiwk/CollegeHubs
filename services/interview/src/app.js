const express = require('express');
const { fail } = require('./errors');
function createApp({ connection, models, config, fetcher = fetch }) {
  const app = express(), store = require('./auth/sessionService').createSessionStore(models, config, fetcher);
  app.use(express.json({ limit: '16kb' })); app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/health/live', (_req, res) => res.json({ status: 'live' }));
  app.get(['/health/ready', '/api/interview/health/ready'], async (_req, res) => { try { if (connection.readyState !== 1) throw Error(); await connection.db.command({ ping: 1 }, { maxTimeMS: 2000 }); res.json({ status: 'ready' }); } catch { res.status(503).json({ error: { code: 'INTERVIEW_DB_UNAVAILABLE', retryable: true } }); } });
  const buckets = new Map();
  app.use('/api/interview', (req, res, next) => {
    try {
      if (connection.readyState !== 1) throw fail(503, 'INTERVIEW_DB_UNAVAILABLE');
      if (Object.keys(req.query).length) throw fail(400, 'QUERY_NOT_ALLOWED');
      if (req.get('Origin') && req.get('Origin') !== config.origin || !['GET', 'HEAD'].includes(req.method) && req.get('Origin') !== config.origin) throw fail(403, 'ORIGIN_FORBIDDEN');
      const now = Date.now(); for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
      const key = (req.ip || 'unknown') + (req.path === '/resumes/upload' ? ':upload' : ':api'), value = buckets.get(key) || { count: 0, until: now + 60000 };
      if (value.count >= (req.path === '/resumes/upload' ? 30 : 300) || buckets.size >= 10000 && !buckets.has(key)) { res.set('Retry-After', '60'); throw fail(429, 'RATE_LIMIT'); }
      value.count++; buckets.set(key, value); next();
    } catch (error) { next(error); }
  });
  app.use('/api/interview', require('./auth/sessionRoutes').sessionRoutes(config, store));
  app.use('/api/interview', require('./routes').routes(connection, models, store));
  app.use((_req, res) => res.status(404).json({ error: { code: 'INTERVIEW_ROUTE_NOT_FOUND', retryable: false } }));
  app.use((error, _req, res, _next) => { const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : error.status || 503; res.status(status).json({ error: { code: error.type === 'entity.too.large' ? 'BODY_TOO_LARGE' : error.type === 'entity.parse.failed' ? 'INVALID_JSON' : error.status ? error.code : 'INTERVIEW_UNAVAILABLE', retryable: [429, 503].includes(status) } }); });
  return app;
}
module.exports = { createApp };
