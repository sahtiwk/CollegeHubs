const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireTenant } = require('../services/hubAccess');
const { definitions } = require('../config/modules');
const { issueGrant, exchangeGrant, authenticateService, failure } = require('../services/moduleTokenService');
function moduleAuthRoutes(config) {
  const router = express.Router();
  const buckets = new Map();
  function limit(key, res, maximum = 10) {
    const now = Date.now();
    for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
    const bucket = buckets.get(key) || { count: 0, until: now + 60000 };
    if (bucket.count >= maximum) { res.set('Retry-After', String(Math.ceil((bucket.until - now) / 1000))); throw failure(429, 'HANDOFF_RATE_LIMIT', 'Too many handoff attempts. Please wait.'); }
    if (buckets.size >= 10000 && !buckets.has(key)) throw failure(503, 'HANDOFF_BUSY', 'Handoff is temporarily busy');
    bucket.count++; buckets.set(key, bucket);
  }
  function error(res, err) {
    const status = err.status || 503;
    return res.status(status).json({ error: { code: err.code || 'HANDOFF_UNAVAILABLE', message: err.status ? err.message : 'Handoff is temporarily unavailable', retryable: status === 503 || status === 429 } });
  }
  router.get('/modules', authenticate, requireTenant, (req, res) => res.json({ items: Object.entries(definitions).map(([name, definition]) => ({
    module: name, label: definition.label, enabled: config.enabled.includes(name), routePath: '/' + name, startPath: '/api/' + name + '/auth/start',
  })) }));
  router.post('/module-grants', authenticate, requireTenant, async (req, res) => {
    try {
      if (!config.enabled.length) throw failure(503, 'MODULE_UNAVAILABLE', 'Modules are not available yet');
      if (req.get('Origin') !== config.origin) throw failure(403, 'ORIGIN_FORBIDDEN', 'Handoff origin is not allowed');
      limit('user:' + req.hub.userId, res);
      res.status(201).json(await issueGrant(req.user, req.body, config));
    } catch (err) { error(res, err); }
  });
  router.post('/module-grants/exchange', async (req, res) => {
    try {
      const credential = await authenticateService(req.get('Authorization'));
      // This is a server-to-server endpoint; browser requests are never accepted.
      if (req.get('Origin')) throw failure(403, 'SERVICE_ONLY', 'Exchange requires a server request');
      limit('service:' + credential.keyId, res, 120);
      res.json(await exchangeGrant(credential, req.body, config));
    } catch (err) { error(res, err); }
  });
  return router;
}
module.exports = { moduleAuthRoutes };
