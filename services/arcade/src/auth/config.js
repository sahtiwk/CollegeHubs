// Server only: shared crypto contracts, never Core database models.
const { verifyModuleToken } = require('@collegehubs/contracts/module-token.cjs');
const fail = (status, code) => Object.assign(new Error(code), { status, code });
const opaquePattern = /^[a-zA-Z0-9_-]{43}$/;
const tokens = ['accent','secondary','background','surface','surfaceRaised','text','textMuted','border','success','warning','error'];
function configuration(env = process.env) {
  const origin = new URL(env.APP_ORIGIN || ''), core = new URL(env.CORE_API_BASE_URL || '');
  for (const url of [origin, core]) if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) throw fail(503, 'ARCADE_CONFIGURATION');
  if (env.CORE_TOKEN_AUDIENCE !== 'collegehubs-arcade' || !env.CORE_TOKEN_ISSUER || !/^[a-zA-Z0-9_-]{1,64}$/.test(env.CORE_KEY_ID || '') ||
      !/^[a-zA-Z0-9_-]{8,64}\.[a-zA-Z0-9_-]{43}$/.test(env.CORE_SERVICE_KEY || '')) throw fail(503, 'ARCADE_CONFIGURATION');
  const key = (env.CORE_PUBLIC_KEY || '').replace(/\\n/g, '\n');
  const parsed = require('node:crypto').createPublicKey(key);
  if (!key.startsWith('-----BEGIN PUBLIC KEY-----') || parsed.asymmetricKeyType !== 'rsa' || parsed.asymmetricKeyDetails.modulusLength < 2048) throw fail(503, 'ARCADE_CONFIGURATION');
  return { secure: origin.protocol === 'https:', origin: origin.origin, core: core.origin, issuer: env.CORE_TOKEN_ISSUER, publicKeys: { [env.CORE_KEY_ID]: key }, serviceKey: env.CORE_SERVICE_KEY };
}
function validateExchange(result, config) {
  const principal = verifyModuleToken(result?.token, { module: 'arcade', issuer: config.issuer, publicKeys: config.publicKeys });
  const theme = result.theme;
  if (!['/arcade', '/arcade/'].includes(result.returnPath) || theme?.hubId !== principal.hubId || theme.themeVersion !== principal.themeVersion ||
      typeof theme.name !== 'string' || theme.name.length > 200 || !theme.tokens || tokens.some(key => !/^#[a-fA-F0-9]{6}$/.test(theme.tokens[key]))) throw fail(401, 'INVALID_MODULE_THEME');
  return { principal, theme: { hubId: principal.hubId, name: theme.name, themeVersion: theme.themeVersion, tokens: Object.fromEntries(tokens.map(key => [key, theme.tokens[key]])) } };
}
module.exports = { configuration, validateExchange };
