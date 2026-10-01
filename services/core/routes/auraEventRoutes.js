const express = require('express');
const { serviceAuth, serviceError } = require('../middleware/serviceAuth');
const { failure } = require('../services/moduleTokenService');
const { createAuraEventService } = require('../services/auraEventService');
function auraEventRoutes({ rules = null } = {}) {
  const router = express.Router(), service = createAuraEventService({ rules }), buckets = new Map();
  router.post('/events', serviceAuth, async (req, res) => {
    try {
      const now = Date.now();
      for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
      const key = req.service.keyId, bucket = buckets.get(key) || { count: 0, until: now + 60000 };
      if (bucket.count >= 120) { res.set('Retry-After', String(Math.ceil((bucket.until - now) / 1000))); throw failure(429, 'EVENT_RATE_LIMIT', 'Too many events; retry later'); }
      if (buckets.size >= 10000 && !buckets.has(key)) throw failure(503, 'EVENT_BUSY', 'Event ingestion is temporarily busy');
      bucket.count++; buckets.set(key, bucket);
      const result = await service.ingest(req.service, req.body);
      res.status(result.status).json(result.body);
    } catch (err) { serviceError(res, err); }
  });
  return router;
}
module.exports = { auraEventRoutes };
