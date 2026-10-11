// Server only: shared crypto contracts, never Core database models.
const { verifyModuleToken } = require('@collegehubs/contracts/module-token.cjs');
const { hash, opaque, requireCallback } = require('@collegehubs/contracts/module-session.cjs');
const fail = (status, code) => Object.assign(new Error(code), { status, code });
const opaquePattern = /^[a-zA-Z0-9_-]{43}$/;
const tokens = ['accent','secondary','background','surface','surfaceRaised','text','textMuted','border','success','warning','error'];
function configuration(env = process.env) {
  const origin = new URL(env.APP_ORIGIN || ''), core = new URL(env.CORE_API_BASE_URL || '');
  for (const url of [origin, core]) if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) throw fail(503, 'LEARN_CONFIGURATION');
  if (env.CORE_TOKEN_AUDIENCE !== 'collegehubs-learn' || !env.CORE_TOKEN_ISSUER || !/^[a-zA-Z0-9_-]{1,64}$/.test(env.CORE_KEY_ID || '') ||
      !/^[a-zA-Z0-9_-]{8,64}\.[a-zA-Z0-9_-]{43}$/.test(env.CORE_SERVICE_KEY || '')) throw fail(503, 'LEARN_CONFIGURATION');
  const key = (env.CORE_PUBLIC_KEY || '').replace(/\\n/g, '\n');
  const parsed = require('node:crypto').createPublicKey(key);
  if (!key.startsWith('-----BEGIN PUBLIC KEY-----') || parsed.asymmetricKeyType !== 'rsa' || parsed.asymmetricKeyDetails.modulusLength < 2048) throw fail(503, 'LEARN_CONFIGURATION');
  return { secure: origin.protocol === 'https:', origin: origin.origin, core: core.origin, issuer: env.CORE_TOKEN_ISSUER, publicKeys: { [env.CORE_KEY_ID]: key }, readKey: env.MODULE_READ_KEY, serviceKey: env.CORE_SERVICE_KEY };
}
function validateExchange(result, config) {
  const principal = verifyModuleToken(result?.token, { module: 'learn', issuer: config.issuer, publicKeys: config.publicKeys });
  const theme = result.theme;
  if (!['/learn', '/learn/'].includes(result.returnPath) || theme?.hubId !== principal.hubId || theme.themeVersion !== principal.themeVersion ||
      typeof theme.name !== 'string' || theme.name.length > 200 || !theme.tokens || tokens.some(key => !/^#[a-fA-F0-9]{6}$/.test(theme.tokens[key]))) throw fail(401, 'INVALID_MODULE_THEME');
  return { principal, theme: { hubId: principal.hubId, name: theme.name, themeVersion: theme.themeVersion, tokens: Object.fromEntries(tokens.map(key => [key, theme.tokens[key]])) } };
}
function authorizeSession(row, owner = null) {
  const p = row?.principal;
  if (!row || !/^[a-f0-9]{24}$/.test(row.user_id || '') || !/^[a-f0-9]{24}$/.test(row.hub_id || '') ||
      p?.sub !== row.user_id || p?.hubId !== row.hub_id || !Number.isSafeInteger(p.exp) || p.exp * 1000 <= Date.now() ||
      !Number.isFinite(+new Date(row.expires_at)) || +new Date(row.expires_at) <= Date.now() || +new Date(row.expires_at) > p.exp * 1000 ||
      (owner && (owner.userId !== row.user_id || owner.hubId !== row.hub_id))) throw fail(401, 'LEARN_SESSION_REQUIRED');
  return row;
}
function createSessionStore(pool, config, fetcher = fetch) {
  async function start() {
    const state = opaque();
    await pool.query('DELETE FROM module_session WHERE session_hash IN (SELECT session_hash FROM module_session WHERE expires_at <= now() LIMIT 100)');
    await pool.query('DELETE FROM module_handoff WHERE state_hash IN (SELECT state_hash FROM module_handoff WHERE expires_at <= now() LIMIT 100)');
    await pool.query('INSERT INTO module_handoff(state_hash, expires_at) VALUES ($1, now() + interval \'60 seconds\')', [hash(state)]);
    return state;
  }
  async function callback({ origin, cookieState, state, grant, module }) {
    if (module !== 'learn' || !opaquePattern.test(grant || '')) throw fail(400, 'INVALID_CALLBACK');
    try { requireCallback({ origin, expectedOrigin: config.origin, cookieState, state }); }
    catch { throw fail(403, 'CALLBACK_STATE_INVALID'); }
    const consumed = await pool.query('DELETE FROM module_handoff WHERE state_hash=$1 AND expires_at > now() RETURNING state_hash', [hash(state)]);
    if (consumed.rowCount !== 1) throw fail(409, 'CALLBACK_REPLAYED');
    // Burn state before exchange; any ambiguous failure requires a NEW handoff.
    let result;
    try {
      const response = await fetcher(config.core + '/api/auth/module-grants/exchange', { method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(4000),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.serviceKey }, body: JSON.stringify({ module: 'learn', grant, state }) });
      const reader = response.body.getReader(); let size = 0; const chunks = [];
      for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 16384) { await reader.cancel(); throw new Error('oversize'); } chunks.push(Buffer.from(part.value)); }
      if (!response.ok) throw new Error('exchange');
      result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { throw fail(503, 'HANDOFF_RESTART_REQUIRED'); }
    let checked;
    try { checked = validateExchange(result, config); } catch { throw fail(401, 'INVALID_MODULE_CREDENTIAL'); }
    const handle = opaque(), csrf = hash('csrf:' + handle), expiresAt = new Date(checked.principal.exp * 1000);
    await pool.query('INSERT INTO module_session(session_hash,user_id,hub_id,principal,theme,expires_at,csrf_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [hash(handle), checked.principal.sub, checked.principal.hubId, JSON.stringify(checked.principal), JSON.stringify(checked.theme), expiresAt, hash(csrf)]);
    return { handle, expiresAt };
  }
  async function get(handle, owner = null) {
    if (typeof handle !== 'string' || !opaquePattern.test(handle)) throw fail(401, 'LEARN_SESSION_REQUIRED');
    const { rows } = await pool.query('SELECT user_id,hub_id,principal,theme,expires_at,csrf_hash FROM module_session WHERE session_hash=$1 AND expires_at > now()', [hash(handle)]);
    return authorizeSession(rows[0], owner);
  }
  async function logout(handle, origin, csrfToken) {
    const row = await get(handle);
    const crypto = require('node:crypto');
    if (origin !== config.origin || typeof csrfToken !== 'string' || !/^[a-f0-9]{64}$/.test(row.csrf_hash || '') ||
        !crypto.timingSafeEqual(Buffer.from(hash(csrfToken)), Buffer.from(row.csrf_hash))) throw fail(403, 'CSRF_INVALID');
    await pool.query('DELETE FROM module_session WHERE session_hash=$1 AND user_id=$2 AND hub_id=$3', [hash(handle), row.user_id, row.hub_id]);
  }
  return { start, callback, get, logout };
}
function sessionDto(row, handle) {
  authorizeSession(row);
  return { userId: row.user_id, hubId: row.hub_id, username: row.principal.username, college: row.principal.college,
    membershipVersion: row.principal.membershipVersion, expiresAt: new Date(row.expires_at).toISOString(), theme: row.theme, csrfToken: hash('csrf:' + handle) };
}
module.exports = { configuration, validateExchange, authorizeSession, createSessionStore, sessionDto };
