const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const names = new Set(['arcade', 'interview', 'learn']);
const hash = value => createHash('sha256').update(value).digest('hex');
const opaque = () => randomBytes(32).toString('base64url');
function matchesHash(value, expected) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(value) &&
    typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected) &&
    timingSafeEqual(Buffer.from(hash(value)), Buffer.from(expected));
}
function requireCallback({ origin, expectedOrigin, state, cookieState }) {
  if (!expectedOrigin || origin !== expectedOrigin || typeof cookieState !== 'string' ||
    !/^[a-zA-Z0-9_-]{43}$/.test(cookieState) || !matchesHash(state, hash(cookieState))) throw new Error('Invalid callback origin or browser state');
}
function requireMutation({ origin, expectedOrigin, csrfToken, csrfHash }) {
  if (!expectedOrigin || origin !== expectedOrigin || !matchesHash(csrfToken, csrfHash)) throw new Error('Invalid mutation origin or CSRF token');
}
function cookie(module, name, value, maxAge) {
  if (!names.has(module) || !['state', 'session'].includes(name) || (value && !/^[a-zA-Z0-9_-]{43}$/.test(value)) ||
      !Number.isSafeInteger(maxAge) || maxAge < 0 || maxAge > (name === 'state' ? 60 : 900)) throw new Error('Invalid cookie');
  return 'ch_' + module + '_' + name + '=' + value + '; Path=/' + module + '; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge;
}
module.exports = { hash, opaque, matchesHash, requireCallback, requireMutation, cookie };
