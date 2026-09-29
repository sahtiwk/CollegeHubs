const { createPrivateKey, createPublicKey } = require('node:crypto');
const definitions = Object.freeze({
  arcade: { label: 'Arcade', audience: 'collegehubs-arcade', scope: 'module:arcade', returnPaths: ['/arcade', '/arcade/'] },
  interview: { label: 'Interview', audience: 'collegehubs-interview', scope: 'module:interview', returnPaths: ['/interview', '/interview/'] },
  learn: { label: 'Learn', audience: 'collegehubs-learn', scope: 'module:learn', returnPaths: ['/learn', '/learn/'] },
});
function integer(env, name, fallback, max) {
  const value = Number(env[name] || fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error('Invalid ' + name);
  return value;
}
function moduleConfig(env = process.env) {
  const enabled = (env.ENABLE_MODULES || '').split(',').map(value => value.trim()).filter(value => value && value !== 'false');
  if (enabled.some(name => !Object.hasOwn(definitions, name)) || new Set(enabled).size !== enabled.length) throw new Error('ENABLE_MODULES must list explicit module names');
  if (!enabled.length) return { enabled };
  const origin = new URL(env.APP_ORIGIN);
  if (origin.origin !== env.APP_ORIGIN || origin.username || origin.password ||
    !(origin.protocol === 'https:' || (env.NODE_ENV !== 'production' && origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)))) throw new Error('Invalid APP_ORIGIN');
  if (!(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).includes(origin.origin)) throw new Error('APP_ORIGIN must be in ALLOWED_ORIGINS');
  const kid = env.CORE_MODULE_KEY_ID;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(kid || '')) throw new Error('CORE_MODULE_KEY_ID required');
  const privateKey = createPrivateKey((env.CORE_MODULE_PRIVATE_KEY || '').replace(/\\n/g, '\n'));
  if (privateKey.asymmetricKeyType !== 'rsa' || privateKey.asymmetricKeyDetails.modulusLength < 2048) throw new Error('RSA key of at least 2048 bits required');
  const rawKeys = JSON.parse(env.CORE_MODULE_PUBLIC_KEYS || '{}');
  if (!rawKeys || Array.isArray(rawKeys) || typeof rawKeys !== 'object' || Object.keys(rawKeys).length > 8) throw new Error('Invalid public key map');
  const publicKeys = Object.create(null);
  for (const [id, pem] of Object.entries(rawKeys)) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || typeof pem !== 'string' || !pem.startsWith('-----BEGIN PUBLIC KEY-----')) throw new Error('Only public PEM keys are allowed');
    const key = createPublicKey(pem.replace(/\\n/g, '\n'));
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new Error('Invalid RSA public key');
    publicKeys[id] = key.export({ type: 'spki', format: 'pem' });
  }
  if (publicKeys[kid] !== createPublicKey(privateKey).export({ type: 'spki', format: 'pem' })) throw new Error('Active private/public key mismatch');
  const retentionDays = integer(env, 'CORE_GRANT_BINDING_RETENTION_DAYS', 30, 30);
  if (retentionDays !== 30) throw new Error('Grant bindings must be retained for 30 days');
  return { enabled, origin: origin.origin, kid, privateKey, publicKeys,
    issuer: env.CORE_TOKEN_ISSUER || 'collegehubs-core',
    accessTtl: integer(env, 'MODULE_ACCESS_TTL_SECONDS', 900, 900),
    grantTtl: integer(env, 'MODULE_GRANT_TTL_SECONDS', 60, 60),
    retentionDays };
}
module.exports = { definitions, moduleConfig };
