// No Core DB or third-party dependency: modules verify with their configured public keys.
const { createPublicKey, verify } = require('node:crypto');
const audiences = { arcade: 'collegehubs-arcade', interview: 'collegehubs-interview', learn: 'collegehubs-learn' };
const fields = ['iss', 'aud', 'sub', 'hubId', 'scope', 'iat', 'nbf', 'exp', 'jti', 'membershipVersion'];
function verifyReadToken(token, { module: name, issuer, publicKeys, now = Math.floor(Date.now() / 1000) }) {
  const invalid = () => { throw new Error('Invalid or expired module credential'); };
  try {
    if (!Object.hasOwn(audiences, name) || typeof issuer !== 'string' || !issuer || typeof token !== 'string' || token.length > 8192) return invalid();
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[a-zA-Z0-9_-]+$/.test(part))) return invalid();
    const header = JSON.parse(Buffer.from(parts[0], 'base64url'));
    if (header.alg !== 'RS256' || header.typ !== 'JWT' || typeof header.kid !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(header.kid) ||
        Object.keys(header).some(key => !['alg', 'typ', 'kid'].includes(key)) || !Object.hasOwn(publicKeys, header.kid)) return invalid();
    const key = createPublicKey(publicKeys[header.kid]);
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048 ||
        !verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url'))) return invalid();
    const c = JSON.parse(Buffer.from(parts[1], 'base64url'));
    if (!c || Object.keys(c).length !== fields.length || fields.some(field => !Object.hasOwn(c, field)) ||
        c.iss !== issuer || c.aud !== audiences[name] ||
        !Array.isArray(c.scope) || c.scope.length !== 1 || c.scope[0] !== 'module:' + name + ':summary:read' ||
        typeof c.sub !== 'string' || !/^[a-f0-9]{24}$/.test(c.sub) || typeof c.hubId !== 'string' || !/^[a-f0-9]{24}$/.test(c.hubId) ||
        typeof c.jti !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(c.jti) ||
        !Number.isSafeInteger(c.membershipVersion) || c.membershipVersion < 0 ||
        ![c.iat, c.nbf, c.exp, now].every(Number.isSafeInteger) ||
        c.iat < 0 || c.nbf !== c.iat || c.iat > now || c.exp <= now || c.exp <= c.iat || c.exp - c.iat > 30) return invalid();
    return Object.freeze({ ...c, scope: Object.freeze([...c.scope]) });
  } catch { return invalid(); }
}
const countFields = Object.freeze({ learn: ['enrollments', 'completedNodes', 'completedQuizzes', 'pending'], arcade: ['completedGames', 'wins', 'pending'], interview: ['completedInterviews', 'pending'] });
function authorizeRead(req, config, name) {
  const { timingSafeEqual } = require('node:crypto');
  const deny = () => { throw Object.assign(new Error('Read delegation required'), { status: 401, code: 'READ_DELEGATION_REQUIRED' }); };
  const supplied = req.get('Authorization');
  if (req.get('Origin') || req.get('Cookie') || Object.keys(req.query).length || !/^[a-zA-Z0-9_-]{43}$/.test(config.readKey || '') || typeof supplied !== 'string') return deny();
  const expected = Buffer.from('Bearer ' + config.readKey), actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return deny();
  try { return verifyReadToken(req.get('X-Module-Read'), { ...config, module: name }); } catch { return deny(); }
}
module.exports = { verifyReadToken, authorizeRead, countFields };
