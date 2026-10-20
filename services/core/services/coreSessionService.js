const { createHmac, createHash, timingSafeEqual } = require('crypto');
const mongoose = require('mongoose');
const Session = require('../models/AuthSession');
const User = require('../models/User');
const COOKIE = 'ch_core_refresh', DAY = 86400000;
const enabled = () => process.env.CORE_SESSION_ENABLED === 'true';
const failure = (status, code) => Object.assign(new Error(code), { status, code });
const mac = value => createHmac('sha256', process.env.JWT_SECRET).update('core-session-v1:' + value).digest('base64url');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const hash = value => createHash('sha256').update(value).digest('hex');
const credential = (id, generation) => `${id}.${generation}.${mac(`refresh:${id}:${generation}`)}`;
const csrf = id => mac('csrf:' + id);
function origin(req) {
  if (!(process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).includes(req.get('origin'))) throw failure(403, 'CORE_ORIGIN_REQUIRED');
}
function setCookie(res, token, expiresAt) {
  // Insecure cookies are permitted only in explicitly local test/development environments.
  const local = ['test', 'development'].includes(process.env.NODE_ENV) && (process.env.ALLOWED_ORIGINS || '').split(',').every(x => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(x.trim()));
  res.cookie(COOKIE, token, { httpOnly: true, secure: !local, sameSite: 'strict', path: '/api', expires: expiresAt });
}
function parse(req) {
  const values = (req.get('cookie') || '').split(';').map(x => x.trim()).filter(x => x.startsWith(COOKIE + '='));
  if (values.length !== 1) throw failure(401, 'CORE_SESSION_INVALID');
  const token = values[0].slice(COOKIE.length + 1);
  const parts = /^([a-f0-9]{24})\.(0|[1-9][0-9]{0,4})\.([\w-]{43})$/.exec(token);
  if (!parts || !equal(token, credential(parts[1], Number(parts[2])))) throw failure(401, 'CORE_SESSION_INVALID');
  return { id: parts[1], generation: Number(parts[2]), token };
}
async function valid(row, user) {
  if (!row || !user || row.revokedAt || row.expiresAt <= new Date() || row.idleExpiresAt <= new Date() || row.sessionVersion !== (user.sessionVersion || 0) || user.membershipStatus === 'disabled') throw failure(401, 'CORE_SESSION_REVOKED');
}
async function assertAccess(claims, user) {
  if (!claims.sid) { if (enabled()) throw failure(401, 'CORE_LEGACY_TOKEN_REJECTED'); return; }
  user ||= await User.findById(claims.sub);
  const row = await Session.findById(claims.sid);
  await valid(row, user);
  if (String(row.userId) !== claims.sub || claims.sessionVersion !== row.sessionVersion) throw failure(401, 'CORE_SESSION_REVOKED');
}
async function issue(req, res, user) {
  const { generateToken } = require('../config/auth');
  if (!enabled()) return generateToken(user);
  origin(req);
  if (req.auth?.sid) {
    await assertAccess(req.auth, user);
    return generateToken(user, { sid: req.auth.sid, sessionVersion: user.sessionVersion || 0 });
  }
  if (user.membershipStatus === 'disabled') throw failure(401, 'CORE_SESSION_REVOKED');
  const id = new mongoose.Types.ObjectId(), token = credential(String(id), 0);
  const row = await Session.create({ _id: id, userId: user._id, sessionVersion: user.sessionVersion || 0, refreshHash: hash(token), idleExpiresAt: new Date(Date.now() + DAY), expiresAt: new Date(Date.now() + 7 * DAY) });
  setCookie(res, token, row.expiresAt);
  res.set('X-Core-CSRF', csrf(String(id)));
  return generateToken(user, { sid: String(id), sessionVersion: row.sessionVersion });
}
async function handle(req, res, operation) {
  if (!enabled()) throw failure(404, 'CORE_SESSIONS_DISABLED');
  origin(req);
  const proof = parse(req), row = await Session.findById(proof.id).select('+refreshHash');
  const user = row && await User.findById(row.userId);
  await valid(row, user);
  if (operation !== 'csrf' && !equal(req.get('x-core-csrf'), csrf(proof.id))) throw failure(403, 'CORE_CSRF_REQUIRED');
  if (proof.generation !== row.generation || !equal(hash(proof.token), row.refreshHash)) {
    if (proof.generation === row.generation - 1 && Date.now() - row.rotatedAt?.getTime() < 5000) {
      res.set('Retry-After', '1'); throw failure(409, 'CORE_REFRESH_CONCURRENT');
    }
    await Session.updateOne({ _id: row._id }, { $set: { revokedAt: new Date() } });
    throw failure(401, 'CORE_REFRESH_REPLAY');
  }
  if (operation === 'csrf') return res.json({ csrfToken: csrf(proof.id) });
  if (operation === 'logout' || operation === 'logout-all') {
    if (operation === 'logout-all') await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    await Session.updateMany(operation === 'logout-all' ? { userId: user._id } : { _id: row._id }, { $set: { revokedAt: new Date() } });
    setCookie(res, '', new Date(0)); return res.status(204).end();
  }
  if (row.generation >= 10000) throw failure(401, 'CORE_SESSION_EXHAUSTED');
  const token = credential(proof.id, row.generation + 1);
  const rotated = await Session.findOneAndUpdate({ _id: row._id, generation: row.generation, revokedAt: null }, { $inc: { generation: 1 }, $set: { refreshHash: hash(token), rotatedAt: new Date(), idleExpiresAt: new Date(Math.min(Date.now() + DAY, row.expiresAt.getTime())) } }, { new: true });
  if (!rotated) { res.set('Retry-After', '1'); throw failure(409, 'CORE_REFRESH_CONCURRENT'); }
  await assertAccess({ sid: proof.id, sub: String(user._id), sessionVersion: row.sessionVersion });
  setCookie(res, token, row.expiresAt);
  res.json({ token: require('../config/auth').generateToken(user, { sid: proof.id, sessionVersion: row.sessionVersion }), csrfToken: csrf(proof.id), user: await require('../utils/userDto').userDto(user, true) });
}
module.exports = { enabled, origin, issue, assertAccess, handle };
