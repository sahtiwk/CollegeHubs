const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireHubAccess } = require('../services/hubAccess');
const reads = require('../services/auraReadService');
for (const resource of ['history', 'achievements']) router.get('/me/aura/' + resource, authenticate, async (req, res) => {
  try {
    const context = await requireHubAccess(req.auth);
    if (resource === 'achievements') reads.only(req.query, []);
    const result = resource === 'history' ? await reads.history(context, req.query) : { hubId: context.hubId, userId: context.userId, items: await reads.achievements(context) };
    res.set('Cache-Control', 'no-store').json(result);
  } catch (error) { res.status(error.status || 503).json({ error: { code: error.code || 'AURA_UNAVAILABLE', message: error.status ? error.message : 'Progress unavailable; retry shortly', retryable: !error.status } }); }
});
router.get(['/me/aura', '/me/progress'], authenticate, async (req, res) => {
  try { reads.only(req.query, []); const context = await requireHubAccess(req.auth); res.set('Cache-Control', 'no-store').json(await reads.summary(context)); }
  catch (error) { res.status(error.status || 503).json({ error: { code: error.code || 'AURA_UNAVAILABLE', message: error.status ? error.message : 'Aura unavailable; retry shortly', retryable: !error.status } }); }
});
router.get('/hubs/:hubId/leaderboard', authenticate, async (req, res) => {
  try { const context = await requireHubAccess(req.auth, req.params.hubId); res.set('Cache-Control', 'no-store').json(await reads.leaderboard(context, req.query)); }
  catch (error) { res.status(error.status || 503).json({ error: { code: error.code || 'RANKING_UNAVAILABLE', message: error.status ? error.message : 'Rankings unavailable; retry shortly', retryable: !error.status } }); }
});
module.exports = router;
