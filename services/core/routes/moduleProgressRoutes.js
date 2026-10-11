const { authenticate } = require('../middleware/auth');
const { requireHubAccess } = require('../services/hubAccess');
module.exports = config => {
  const router = require('express').Router();
  const reader = require('../services/moduleReadService').createModuleReader(config);
  router.get('/me/module-progress', authenticate, async (req, res) => {
    try {
      if (Object.keys(req.query).length) return res.status(400).json({ error: { code: 'INVALID_QUERY' } });
      const owner = await requireHubAccess(req.auth);
      const data = await reader.summary(owner);
      const current = await requireHubAccess(req.auth);
      if (String(current.hubId) !== String(owner.hubId) || current.membershipVersion !== owner.membershipVersion) return res.status(403).json({ error: { code: 'MEMBERSHIP_CHANGED' } });
      res.json(data);
    } catch (error) { res.status(error.status || 503).json({ error: { code: error.code || 'PROGRESS_UNAVAILABLE' } }); }
  });
  return router;
};
