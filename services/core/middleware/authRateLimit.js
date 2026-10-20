const { createHmac } = require('crypto');
const Throttle = require('../models/AuthThrottle');
function authRateLimit({ now = Date.now, maxBuckets = 10000 } = {}) {
  const buckets = new Map();
  const rules = [
    [/^\/auth\/login$/, 'login', 120, 600000],
    [/^\/auth\/register$/, 'register', 60, 3600000],
    [/^\/google\/(auth|link(?:\/start)?)$/, 'google', 60, 600000],
    [/^\/auth\/verification\//, 'verification', 60, 600000],
    [/^\/me\/email-change$/, 'verification', 60, 600000],
    [/^\/auth\/(csrf|refresh)$/, 'renewal', 300, 60000],
    [/^\/auth\/module-grants$/, 'grant', 120, 60000],
  ];
  function deny(res, seconds) {
    res.set('Retry-After', String(Math.max(1, seconds)));
    return res.status(429).json({ code: 'AUTH_RATE_LIMIT', error: 'Too many attempts. Please wait before retrying.', retryable: true });
  }
  return async (req, res, next) => {
    if (req.method !== 'POST' && !(req.method === 'GET' && req.path === '/auth/csrf')) return next();
    const rule = rules.find(([pattern]) => pattern.test(req.path));
    if (!rule) return next();
    const [, group, limit, windowMs] = rule, time = now();
    // Never trust caller-supplied forwarding headers. Configure edge limits separately.
    const key = group + ':' + req.ip;
    for (const [id, value] of buckets) if (value.until <= time) buckets.delete(id);
    if (!buckets.has(key) && buckets.size >= maxBuckets) return deny(res, 60);
    const bucket = buckets.get(key) || { count: 0, until: time + windowMs };
    buckets.set(key, bucket); bucket.count++;
    if (bucket.count > limit) return deny(res, Math.ceil((bucket.until - time) / 1000));
    let account;
    if (group === 'google' && req.path.startsWith('/google/link')) {
      try { account = require('../config/auth').verifyToken(/^Bearer (\S+)$/i.exec(req.get('authorization') || '')?.[1]).sub; }
      catch { return next(); } // The route rejects invalid access; no anonymous account lookup.
    }
    if (group !== 'login' && !account) return next();
    // Fixed-window persisted account budget, identical for existing and unknown emails.
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    const period = 900000, start = Math.floor(time / period) * period;
    const id = createHmac('sha256', process.env.JWT_SECRET).update(group + '-budget:' + (account || email) + ':' + start).digest('hex');
    try {
      let row;
      try { row = await Throttle.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(start + period) } }, { upsert: true, new: true }); }
      catch (error) { if (error.code !== 11000) throw error; row = await Throttle.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { new: true }); }
      if (!row || row.count > 20) return deny(res, Math.ceil((start + period - time) / 1000));
      next();
    } catch { res.status(503).json({ code: 'AUTH_LIMIT_UNAVAILABLE', error: 'Sign-in is temporarily unavailable.', retryable: true }); }
  };
}
module.exports = { authRateLimit };
