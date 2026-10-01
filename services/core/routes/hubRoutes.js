const router = require('express').Router();
const Hub = require('../models/Hub');
const Channel = require('../models/Channel');
const { authenticate } = require('../middleware/auth');
const { requireHubAccess, scopedFilter } = require('../services/hubAccess');
const { hubPresentation } = require('../services/hubPresentation');
router.use(authenticate);
router.use('/:hubId', async (req, res, next) => {
  try { req.hub = await requireHubAccess(req.user, req.params.hubId); res.set('Cache-Control', 'no-store'); next(); }
  catch (err) { res.status(err.status || 503).json({ error: err.status ? err.message : 'Membership check unavailable' }); }
});
router.get('/:hubId/theme', async (req, res) => {
  try {
    const hub = await Hub.findOne({ _id: req.hub.hubId, status: 'active' });
    if (!hub) return res.status(403).json({ error: 'Hub unavailable' });
    res.json(hubPresentation(hub));
  } catch { res.status(503).json({ error: 'Theme unavailable' }); }
});
router.get('/:hubId/channels', async (req, res) => {
  try {
    const rows = await Channel.find(scopedFilter(req.hub, { archivedAt: null })).select('_id hubId slug title kind').sort({ slug: 1 }).limit(50);
    res.json({ items: rows.map(row => ({ _id: row._id, hubId: row.hubId, slug: row.slug, title: row.title, kind: row.kind })) });
  } catch { res.status(503).json({ error: 'Channels unavailable' }); }
});
module.exports = router;
