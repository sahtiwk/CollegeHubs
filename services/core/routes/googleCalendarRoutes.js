const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireHubAccess } = require('../services/hubAccess');
const sync = require('../services/googleCalendarSync');
router.use(authenticate);
router.use((req, res, next) => {
  if (req.method !== 'GET' && (!(process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).includes(req.get('Origin')) || req.get('X-Requested-With') !== 'XmlHttpRequest')) return res.status(403).json({ error: { code: 'CALENDAR_ORIGIN', message: 'Use the application to manage calendar sync' } });
  next();
});
const route = fn => async (req, res) => {
  try {
    if (Object.keys(req.query).length) return res.status(400).json({ error: { code: 'CALENDAR_QUERY', message: 'Unexpected query' } });
    const context = await requireHubAccess(req.auth);
    res.json(await fn(req, context));
  } catch (error) { res.status([400,403,404,409].includes(error.status) ? error.status : 503).json({ error: { code: error.code || 'CALENDAR_UNAVAILABLE', message: error.status && error.status < 500 ? error.message : 'Calendar sync unavailable. Try again later.' } }); }
};
function body(req, allowed) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).some(k => !allowed.includes(k))) throw Object.assign(Error('Unexpected calendar request'), { status: 400, code: 'CALENDAR_BODY' });
  return req.body;
}
router.get('/', route((req, context) => sync.status(context)));
router.post('/start', route((req, context) => sync.start(context, body(req, ['channelId']).channelId)));
router.post('/connect', route((req, context) => sync.connect(context, body(req, ['nonce','code']), req.get('Origin'))));
router.post('/refresh', route((req, context) => { body(req, []); return sync.queue(context); }));
router.post('/disconnect', route((req, context) => { body(req, []); return sync.disconnect(context); }));
module.exports = router;
