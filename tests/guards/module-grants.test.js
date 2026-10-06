const test = require('node:test');
const assert = require('node:assert/strict');

test('G2: SPA coordinator deduplicates bootstrap and discards account-switch/logout/expired results', async () => {
  const { createSessionCoordinator } = await import('../../apps/web/src/auth/moduleSessionState.js');
  let token = 'alice'; const state = createSessionCoordinator(() => token);
  let finish, calls = 0;
  const work = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const old = state.run('alice:hub-a:1', work); const duplicate = state.run('alice:hub-a:1', work);
  assert.equal(calls, 1); assert.equal(old, duplicate);
  const alice = { userId: 'alice', expiresAt: new Date(Date.now() + 60000).toISOString() };
  const bob = { userId: 'bob', expiresAt: alice.expiresAt };
  token = 'bob'; state.clear(); const current = state.run('bob:hub-b:1', async () => bob);
  finish(alice); await assert.rejects(old, { name: 'AbortError' }); assert.equal(await current, bob);
  assert.equal(await state.run('bob:hub-b:1', () => { throw new Error('cached'); }), bob);
  assert.equal(state.clear(), bob);
  const pending = state.run('bob:hub-b:1', work); state.clear(); finish(bob); await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(state.run('bob:hub-b:1', async () => ({ ...bob, expiresAt: new Date(0).toISOString() })), /expired/);
  // Even without an event, changed Core credentials invalidate a late response.
  const changed = state.run('bob:hub-b:1', work); token = 'charlie'; finish(bob); await assert.rejects(changed, { name: 'AbortError' });
});

test('G2: real Core → gateway → Learn SQL bootstrap, isolation, replay, expiry and logout', { skip: !process.env.GUARD_APP_ORIGIN || !process.env.GUARD_LEARN_DATABASE_URL }, async () => {
  const { Pool } = require('pg');
  const db = new URL(process.env.GUARD_LEARN_DATABASE_URL);
  assert.ok(['127.0.0.1', 'localhost'].includes(db.hostname)); assert.match(db.pathname, /^\/collegehubs_demo_learn_/);
  const base = process.env.GUARD_APP_ORIGIN;
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
  const pool = new Pool({ connectionString: db.toString() }); const jar = new Map();
  const request = async (path, { method = 'GET', body, token, origin = base, csrf, cookies = true } = {}) => {
    const response = await fetch(base + path, { method, redirect: 'manual', headers: { ...(origin ? { Origin: origin } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(cookies ? { Cookie: [...jar].map(([k,v]) => k + '=' + v).join('; ') } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (cookies) for (const value of response.headers.getSetCookie()) { const [key, val] = value.split(';')[0].split('='); jar.set(key, val); }
    return response;
  };
  try {
    const name = 'guard-' + require('node:crypto').randomBytes(5).toString('hex');
    const registered = await request('/api/auth/register', { method: 'POST', body: { username: name, email: name + '@cvr.ac.in', password: 'Disposable-fixture-32!' } });
    assert.equal(registered.status, 201); const core = await registered.json(); assert.equal(core.user.membershipStatus, 'active');
    const bootstrap = async () => {
      const started = await request('/api/learn/auth/start', { method: 'POST' }); assert.equal(started.status, 201);
      const { state } = await started.json();
      const grant = await request('/api/auth/module-grants', { method: 'POST', token: core.token, body: { module: 'learn', state, returnPath: '/learn' } }); assert.equal(grant.status, 201);
      const issued = await grant.json(); assert.equal(issued.callbackPath, '/api/learn/auth/callback');
      return { module: 'learn', state, grant: issued.grant };
    };
    let body = await bootstrap();
    assert.equal((await request('/api/learn/auth/callback', { method: 'POST', body, origin: 'https://foreign.example' })).status, 403);
    assert.equal((await request('/api/learn/auth/callback', { method: 'POST', body, cookies: false })).status, 403);
    const good = await request('/api/learn/auth/callback', { method: 'POST', body }); assert.equal(good.status, 200);
    assert.equal(good.headers.get('location'), null); assert.match(good.headers.get('set-cookie'), /Path=\/api\/learn/);
    const dto = await (await request('/api/learn/session')).json();
    assert.equal(dto.userId, core.user._id); assert.equal(dto.hubId, core.user.hubId); assert.equal(dto.membershipVersion, core.user.membershipVersion);
    assert.equal(dto.theme.hubId, core.user.hubId); assert.equal(dto.token, undefined);
    // Resend consumed state even with its old cookie: database, not cookie clearing, prevents replay.
    jar.set('ch_learn_state', body.state);
    assert.equal((await request('/api/learn/auth/callback', { method: 'POST', body })).status, 409);
    const graph = await (await request('/api/learn/spike/graph')).json(); assert.equal(graph.userId, core.user._id); assert.equal(graph.hubId, core.user.hubId); assert.equal(graph.synthetic, true);
    assert.equal((await request('/api/learn/spike/graph?hubId=' + id(999))).status, 400);
    assert.equal((await request('/api/learn/spike/graph?userId=' + id(999))).status, 400);
    assert.equal((await request('/api/learn/generate-dag')).status, 404);
    assert.equal((await request('/api/unknown-route')).status, 404);
    assert.equal((await request('/api/learn/logout', { method: 'POST', csrf: 'forged' })).status, 403);
    assert.equal((await request('/api/learn/logout', { method: 'POST', csrf: dto.csrfToken, origin: null })).status, 403);
    assert.equal((await request('/api/learn/logout', { method: 'POST', csrf: dto.csrfToken })).status, 200);
    assert.equal((await request('/api/learn/session')).status, 401);
    body = await bootstrap(); await pool.query('UPDATE module_handoff SET expires_at=now()-interval \'1 second\' WHERE state_hash=$1', [digest(body.state)]);
    assert.equal((await request('/api/learn/auth/callback', { method: 'POST', body })).status, 409);
    body = await bootstrap(); assert.equal((await request('/api/learn/auth/callback', { method: 'POST', body })).status, 200);
    await pool.query('UPDATE module_session SET expires_at=now()-interval \'1 second\' WHERE session_hash=$1', [digest(jar.get('ch_learn_session'))]);
    assert.equal((await request('/api/learn/session')).status, 401);
  } finally { await pool.end(); }
});

test('G2: gateway preserves boundary headers/body/cookies and rejects redirect/open proxy/HTML', async () => {
  const { proxyApi } = await import('../../apps/web/functions/api/[[path]].ts');
  let target;
  const fake = async (url, options) => { target = String(url); assert.equal(options.headers.get('origin'), 'https://app.example'); assert.equal(options.headers.get('x-csrf-token'), 'csrf'); assert.equal(options.headers.get('cookie'), 'ch_learn_session=opaque'); assert.equal(options.headers.get('authorization'), null); assert.equal(Buffer.from(options.body).toString(), '{"module":"learn"}'); return new Response('{}', { headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'ch_learn_session=test; Path=/api/learn; HttpOnly; Secure; SameSite=Lax' } }); };
  const req = () => new Request('https://app.example/api/learn/auth/callback', { method: 'POST', headers: { Origin: 'https://app.example', 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf', Cookie: 'ch_learn_session=opaque', Authorization: 'Bearer core-private' }, body: '{"module":"learn"}' });
  const result = await proxyApi(req(), { LEARN_API_ORIGIN: 'https://learn.example' }, fake);
  assert.equal(target, 'https://learn.example/api/learn/auth/callback'); assert.equal(result.status, 200); assert.match(result.headers.get('set-cookie'), /HttpOnly; Secure/);
  assert.equal((await proxyApi(req(), { LEARN_API_ORIGIN: 'https://learn.example/path' }, fake)).status, 503);
  assert.equal((await proxyApi(req(), { LEARN_API_ORIGIN: 'https://learn.example' }, async () => new Response('', { status: 302, headers: { Location: 'https://foreign.example' } }))).status, 502);
  assert.equal((await proxyApi(req(), { LEARN_API_ORIGIN: 'https://learn.example' }, async () => new Response('<html>fallback</html>'))).status, 502);
  assert.equal((await proxyApi(new Request('https://app.example/learn'), { LEARN_API_ORIGIN: 'https://learn.example' }, fake)).status, 400);
  assert.equal((await proxyApi(new Request('https://app.example/api'), {}, fake)).status, 404);
  assert.equal((await proxyApi(new Request('https://app.example/api/arcade/session'), { LEARN_API_ORIGIN: 'https://learn.example' }, fake)).status, 503);
});

test('G2: Learn HTTP adapter is JSON-only, scoped and fail-closed', async () => {
  const { createApp: createLearnApp } = await import('../../services/learn/src/app.ts');
  const state = 's'.repeat(43);
  const app = createLearnApp({ config: { origin: 'http://localhost:5173', secure: false },
    pool: { query: async () => ({ rows: [{ ok: 1 }] }) },
    store: { start: async () => state, get: async () => { throw Object.assign(new Error('denied'), { status: 401 }); } } });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.equal((await fetch(base + '/api/learn/auth/start', { method: 'POST' })).status, 403);
    const response = await fetch(base + '/api/learn/auth/start', { method: 'POST', headers: { Origin: 'http://localhost:5173' } });
    assert.equal(response.status, 201); assert.equal((await response.json()).state, state);
    assert.match(response.headers.get('set-cookie'), /Path=\/api\/learn;/);
    assert.equal(response.headers.get('location'), null);
    assert.equal((await fetch(base + '/api/learn/session')).status, 401);
    assert.equal((await fetch(base + '/api/learn/session?hubId=foreign')).status, 400);
    const unavailable = await fetch(base + '/api/learn/generate-dag');
    assert.equal(unavailable.status, 404); assert.match(unavailable.headers.get('content-type'), /json/);
    assert.equal((await fetch(base + '/health/ready')).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('G2: Learn raw URLs preserve one module prefix and reject redirects/traversal', async () => {
  const { moduleUrl } = await import('../../apps/web/src/auth/moduleUrls.ts');
  assert.equal(moduleUrl('/api/session'), '/api/learn/session');
  assert.equal(moduleUrl('/api/learn/session'), '/api/learn/session');
  assert.equal(moduleUrl('/'), '/api/learn');
  for (const path of ['https://evil.test', '//evil.test', '/learn/learn/api/session', '/../api', '/%2e%2e/api', '/api\\session', '/api?token=secret']) assert.throws(() => moduleUrl(path));
});

test('G2: Learn validates its actual exchange boundary and rejects an Arcade credential', () => {
  const { validateExchange } = require('../../services/learn/src/auth/sessionBoundary.cjs');
  const claims = { iss: 'collegehubs-core', aud: 'collegehubs-arcade', sub: id(1), hubId: id(10), college: 'Fixture College', username: 'alice', scope: ['module:arcade'], iat: Math.floor(Date.now() / 1000), nbf: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 900, jti: require('node:crypto').randomUUID(), membershipVersion: 1, themeVersion: 1 };
  const token = jwt.sign(claims, keyPair.privateKey, { algorithm: 'RS256', keyid: 'fixture-rsa' });
  assert.throws(() => validateExchange({ token }, { issuer: claims.iss, publicKeys: { 'fixture-rsa': keyPair.publicKey } }));
});

test('G2: Learn consumes callback state once; outage requires a fresh handoff and cannot save a session', async () => {
  const { createSessionStore } = require('../../services/learn/src/auth/sessionBoundary.cjs');
  const state = opaque(); let available = true, saved = false, calls = 0;
  const pool = { query: async sql => {
    if (sql.startsWith('DELETE FROM module_handoff WHERE state_hash=')) { const rowCount = available ? 1 : 0; available = false; return { rowCount }; }
    saved = true; return { rowCount: 1 };
  } };
  const store = createSessionStore(pool, { origin: 'http://localhost:5173', core: 'http://localhost:5000', serviceKey: 'fixture' }, async () => { calls++; throw new Error('Core stopped'); });
  const input = { origin: 'http://localhost:5173', cookieState: state, state, grant: opaque(), module: 'learn' };
  await assert.rejects(store.callback({ ...input, origin: 'https://foreign.example' }), { code: 'CALLBACK_STATE_INVALID' });
  await assert.rejects(store.callback({ ...input, state: opaque() }), { code: 'CALLBACK_STATE_INVALID' });
  await assert.rejects(store.callback(input), { code: 'HANDOFF_RESTART_REQUIRED' });
  await assert.rejects(store.callback(input), { code: 'CALLBACK_REPLAYED' });
  assert.equal(calls, 1); assert.equal(saved, false);
});

test('G2: Learn validates Hub theme, stores opaque hashes and exposes no JWT in the session DTO', async () => {
  const { validateExchange, createSessionStore, sessionDto } = require('../../services/learn/src/auth/sessionBoundary.cjs');
  const iat = Math.floor(Date.now() / 1000);
  const claims = { iss: 'collegehubs-core', aud: 'collegehubs-learn', sub: id(1), hubId: id(10), college: 'Fixture College', username: 'alice', scope: ['module:learn'], iat, nbf: iat, exp: iat + 900, jti: require('node:crypto').randomUUID(), membershipVersion: 1, themeVersion: 1 };
  const result = { token: jwt.sign(claims, keyPair.privateKey, { algorithm: 'RS256', keyid: 'fixture-rsa' }), returnPath: '/learn', theme: { hubId: id(10), name: 'Fixture College', themeVersion: 1, tokens: registry.defaultTheme } };
  const cfg = { origin: 'http://localhost:5173', core: 'http://localhost:5000', issuer: claims.iss, publicKeys: { 'fixture-rsa': keyPair.publicKey }, serviceKey: 'fixture' };
  assert.equal(validateExchange(result, cfg).principal.sub, id(1));
  assert.throws(() => validateExchange({ ...result, theme: { ...result.theme, hubId: id(20) } }, cfg));
  assert.throws(() => validateExchange({ ...result, theme: { ...result.theme, tokens: { ...registry.defaultTheme, accent: 'url(https://foreign.example)' } } }, cfg));
  let stored;
  const pool = { query: async (sql, params) => { if (sql.startsWith('INSERT')) stored = params; return { rowCount: 1 }; } };
  const store = createSessionStore(pool, cfg, async () => new Response(JSON.stringify(result)));
  const state = opaque();
  const session = await store.callback({ origin: cfg.origin, cookieState: state, state, grant: opaque(), module: 'learn' });
  assert.equal(stored[0], digest(session.handle)); assert.notEqual(stored[0], session.handle);
  assert.equal(stored.some(value => value === result.token), false);
  const dto = sessionDto({ user_id: stored[1], hub_id: stored[2], principal: JSON.parse(stored[3]), theme: JSON.parse(stored[4]), expires_at: stored[5] }, session.handle);
  assert.deepEqual(Object.keys(dto).sort(), ['college','csrfToken','expiresAt','hubId','membershipVersion','theme','userId','username']);
  assert.equal(digest(dto.csrfToken), stored[6]);
});
process.env.JWT_SECRET = 'g2-isolated-fixture-core-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.ENABLE_MODULES = '';
const { createApp } = require('../../services/core/app');

test('G2: exchange cannot be reached without a module service credential', async () => {
  const server = createApp({ connection: { readyState: 1 } }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/auth/module-grants/exchange', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'arcade', grant: 'forged', state: 'forged' }),
    });
    assert.equal(response.status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

const { generateKeyPairSync } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { moduleConfig } = require('../../services/core/config/modules');
const User = require('../../services/core/models/User');
const Hub = require('../../services/core/models/Hub');
const College = require('../../services/core/models/College');
const ModuleGrant = require('../../services/core/models/ModuleGrant');
const ServiceCredential = require('../../services/core/models/ServiceCredential');
const { generateToken } = require('../../services/core/config/auth');
const { issueGrant, exchangeGrant, authenticateService, opaque, digest } = require('../../services/core/services/moduleTokenService');
const { verifyModuleToken } = require('../../packages/contracts/module-token.cjs');
const sessions = require('../../packages/contracts/module-session.cjs');
const { config: registry } = require('../../services/core/config/collegeRegistry');
const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const id = value => value.toString(16).padStart(24, '0');
let user, hub, grants, credentials, restores, config, serviceKey, otherKey, activeCollege;
function patch(model, name, fn) { const old = model[name]; restores.push(() => { model[name] = old; }); model[name] = fn; }
function query(value) { return { select() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } }; }
function match(row, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (expected && typeof expected === 'object' && '$gt' in expected) return row[key] > expected.$gt;
    return String(row[key]) === String(expected);
  });
}
test.beforeEach(() => {
  restores = []; grants = []; activeCollege = true;
  Object.assign(process.env, { ENABLE_MODULES: 'arcade,interview,learn', APP_ORIGIN: 'http://localhost:5173', NODE_ENV: 'test',
    CORE_MODULE_PRIVATE_KEY: keyPair.privateKey, CORE_MODULE_KEY_ID: 'fixture-rsa',
    CORE_MODULE_PUBLIC_KEYS: JSON.stringify({ 'fixture-rsa': keyPair.publicKey }) });
  config = moduleConfig();
  user = { _id: id(1), username: 'alice', hubId: id(10), membershipStatus: 'active', membershipVersion: 1, college: 'Wrong display label' };
  hub = { _id: id(10), hubId: id(10), collegeId: id(100), status: 'active', name: 'Fixture College', themeVersion: 2, themeTokens: registry.defaultTheme };
  serviceKey = 'arcade01.' + opaque(); otherKey = 'learn001.' + opaque();
  credentials = [
    { keyId: 'arcade01', service: 'arcade', keyHash: digest(serviceKey), status: 'active', scope: 'system', hubId: null },
    { keyId: 'learn001', service: 'learn', keyHash: digest(otherKey), status: 'active', scope: 'system', hubId: null },
  ];
  patch(User, 'findById', value => query(String(value) === user._id ? user : null));
  patch(Hub, 'findOne', filter => query(match(hub, filter) ? hub : null));
  patch(College, 'exists', () => query(activeCollege ? { _id: id(100) } : null));
  patch(ServiceCredential, 'findOne', filter => query(credentials.find(row => match(row, filter)) || null));
  patch(ModuleGrant, 'create', async data => { const row = { ...data, _id: id(1000 + grants.length), consumedAt: null }; grants.push(row); return row; });
  patch(ModuleGrant, 'findOne', filter => query(grants.find(row => match(row, filter)) || null));
  patch(ModuleGrant, 'findOneAndUpdate', (filter, update) => {
    const row = grants.find(item => match(item, filter));
    if (row) Object.assign(row, update.$set);
    return query(row || null);
  });
});
test.afterEach(() => restores.reverse().forEach(restore => restore()));
async function grantFor(module = 'arcade') {
  const state = opaque();
  const issued = await issueGrant(user, { module, state, returnPath: '/' + module }, config);
  return { ...issued, state, module };
}
async function exchange(issued, credential = credentials[0]) {
  return exchangeGrant(credential, { grant: issued.grant, state: issued.state, module: issued.module }, config);
}
const verify = (token, overrides = {}) => verifyModuleToken(token, { module: 'arcade', issuer: config.issuer, publicKeys: config.publicKeys, ...overrides });

test('G2: valid handoff stores only hashes and retains an issuance binding, not token validity', async () => {
  const issued = await grantFor();
  assert.notEqual(grants[0].grantHash, issued.grant); assert.notEqual(grants[0].stateHash, issued.state);
  assert.equal(grants[0].grantHash, digest(issued.grant)); assert.equal(grants[0].stateHash, digest(issued.state));
  assert.ok(new Date(issued.expiresAt).getTime() - Date.now() <= 60000);
  const result = await exchange(issued);
  const claims = verify(result.token);
  assert.equal(claims.sub, user._id); assert.equal(claims.hubId, hub._id);
  assert.equal(claims.college, hub.name); assert.equal(claims.themeVersion, 2);
  assert.equal(claims.exp - claims.iat, 900); assert.equal(result.theme.hubId, hub._id);
  assert.equal(result.returnPath, '/arcade'); assert.equal(grants[0].accessJti, claims.jti);
  assert.equal(grants[0].accessExpiresAt.getTime(), claims.exp * 1000);
  assert.equal(grants[0].retainUntil - grants[0].consumedAt, 30 * 86400000);
  assert.equal(Object.hasOwn(grants[0], 'token'), false);
});
test('G2: wrong audience, issuer, signing key, algorithm, claims and expired access are rejected', async () => {
  const result = await exchange(await grantFor());
  const claims = verify(result.token);
  assert.throws(() => verify(result.token, { module: 'learn' }));
  assert.throws(() => verify(result.token, { issuer: 'foreign' }));
  assert.throws(() => verify(result.token, { now: claims.exp }));
  assert.throws(() => verify(result.token, { publicKeys: {} }));
  assert.throws(() => verify(generateToken(user)));
  const alternate = generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.throws(() => verify(jwt.sign(claims, alternate.privateKey, { algorithm: 'RS256', keyid: config.kid })));
  for (const change of [{ hubId: null }, { hubId: 123456789012345678901234 }, { scope: ['module:learn'] }, { exp: claims.iat + 901 }, { nbf: claims.iat + 1 }, { iat: claims.iat + 30, nbf: claims.iat + 30 }, { membershipVersion: -1 }, { themeVersion: 0 }, { aud: ['collegehubs-arcade', 'other'] }]) {
    assert.throws(() => verify(jwt.sign({ ...claims, ...change }, config.privateKey, { algorithm: 'RS256', keyid: config.kid })));
  }
  assert.throws(() => verify(jwt.sign(claims, config.privateKey, { algorithm: 'RS256', keyid: config.kid, header: { jku: 'https://attacker.example/key' } })));
});
test('G2: replay, concurrent exchange, wrong state, expired grant, and wrong service cannot consume twice', async () => {
  const issued = await grantFor();
  await assert.rejects(exchange({ ...issued, state: opaque() }), { status: 409 });
  await assert.rejects(exchange(issued, credentials[1]), { status: 403 });
  assert.equal(grants[0].consumedAt, null);
  const results = await Promise.allSettled([exchange(issued), exchange(issued)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  await assert.rejects(exchange(issued), { status: 409 });
  const expired = await grantFor(); grants[1].expiresAt = new Date(Date.now() - 1);
  await assert.rejects(exchange(expired), { status: 409 });
});
test('G2: missing/disabled/rotated service credentials cannot exchange', async () => {
  await assert.rejects(authenticateService('Bearer ' + generateToken(user)), { status: 401 });
  await assert.rejects(authenticateService('Bearer arcade01.' + opaque()), { status: 401 });
  credentials[0].status = 'disabled';
  await assert.rejects(authenticateService('Bearer ' + serviceKey), { status: 401 });
  credentials[0].status = 'active'; credentials[0].keyHash = digest('arcade01.' + opaque());
  await assert.rejects(authenticateService('Bearer ' + serviceKey), { status: 401 });
  assert.equal((await authenticateService('Bearer ' + otherKey)).service, 'learn');
});
test('G2: recheck membership, Hub and college at exchange; no self-selected Hub or subject', async () => {
  const issued = await grantFor();
  user.membershipVersion = 2; await assert.rejects(exchange(issued), { status: 403 });
  user.membershipVersion = 1; user.hubId = id(20); await assert.rejects(exchange(issued), { status: 403 });
  user.hubId = id(10); user.membershipStatus = 'disabled'; await assert.rejects(exchange(issued), { status: 403 });
  user.membershipStatus = 'active'; hub.status = 'disabled'; await assert.rejects(exchange(issued), { status: 403 });
  hub.status = 'active'; activeCollege = false; await assert.rejects(exchange(issued), { status: 403 });
  activeCollege = true;
  await assert.rejects(issueGrant(user, { module: 'arcade', state: opaque(), returnPath: '/arcade', hubId: id(20) }, config), { status: 400 });
  assert.equal(grants[0].consumedAt, null);
  assert.equal(verify((await exchange(issued)).token).hubId, id(10));
});
test('G2: return paths reject open redirects, encoded traversal, query credentials and wrong module paths', async () => {
  for (const returnPath of ['https://evil.example/', '//evil.example/', '/arcade/../learn', '/arcade/%2e%2e/learn', '/arcade?token=secret', '/arcade#fragment', '/learn', '/arcade\\evil']) {
    await assert.rejects(issueGrant(user, { module: 'arcade', state: opaque(), returnPath }, config), { status: 400 });
  }
  await assert.rejects(issueGrant(user, { module: '__proto__', state: opaque(), returnPath: '/' }, config), { status: 400 });
  await assert.rejects(issueGrant(user, { module: 'arcade', state: 'short', returnPath: '/arcade' }, config), { status: 400 });
});
test('G2: callback state, Origin, mutation CSRF and module path cookies fail closed', () => {
  const state = sessions.opaque(), csrf = sessions.opaque(), origin = 'https://app.example';
  sessions.requireCallback({ origin, expectedOrigin: origin, state, cookieState: state });
  for (const change of [{ origin: undefined }, { origin: 'https://evil.example' }, { state: opaque() }, { cookieState: undefined }]) {
    assert.throws(() => sessions.requireCallback({ origin, expectedOrigin: origin, state, cookieState: state, ...change }));
  }
  sessions.requireMutation({ origin, expectedOrigin: origin, csrfToken: csrf, csrfHash: sessions.hash(csrf) });
  for (const change of [{ origin: undefined }, { origin: 'https://evil.example' }, { csrfToken: opaque() }, { csrfToken: undefined }]) {
    assert.throws(() => sessions.requireMutation({ origin, expectedOrigin: origin, csrfToken: csrf, csrfHash: sessions.hash(csrf), ...change }));
  }
  const cookie = sessions.cookie('arcade', 'session', opaque(), 900);
  assert.ok(cookie.includes('Path=/api/arcade; HttpOnly; Secure; SameSite=Lax; Max-Age=900'));
  assert.ok(!cookie.includes('Domain=')); assert.throws(() => sessions.cookie('arcade', 'session', opaque(), 901));
});
test('G2: signing configuration is optional when gated, but enabled settings cannot weaken lifetimes or keys', () => {
  assert.deepEqual(moduleConfig({}), { enabled: [] });
  for (const change of [{ MODULE_ACCESS_TTL_SECONDS: '901' }, { MODULE_GRANT_TTL_SECONDS: '61' }, { CORE_GRANT_BINDING_RETENTION_DAYS: '29' }, { CORE_GRANT_BINDING_RETENTION_DAYS: '31' }, { CORE_MODULE_PUBLIC_KEYS: '{}' }, { CORE_MODULE_PRIVATE_KEY: '' }, { APP_ORIGIN: 'https://app.example/path' }, { APP_ORIGIN: 'http://app.example', NODE_ENV: 'production' }]) {
    assert.throws(() => moduleConfig({ ...process.env, ...change }));
  }
});
test('G2: HTTP grant issuance requires exact Origin, gates unreleased modules and limits attempts', async () => {
  const server = createApp({ connection: { readyState: 1 } }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const request = (path, body, auth, origin) => fetch('http://127.0.0.1:' + server.address().port + '/api/auth' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + auth, ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body),
    });
    const body = { module: 'arcade', state: opaque(), returnPath: '/arcade' };
    assert.equal((await request('/module-grants', body, generateToken(user))).status, 403);
    assert.equal((await request('/module-grants/exchange', body, serviceKey, config.origin)).status, 403);
    for (let index = 0; index < 10; index++) assert.equal((await request('/module-grants', body, generateToken(user), config.origin)).status, 201);
    const limited = await request('/module-grants', body, generateToken(user), config.origin);
    assert.equal(limited.status, 429); assert.ok(limited.headers.get('Retry-After'));
    assert.equal(limited.headers.get('Cache-Control'), 'no-store');
    await assert.rejects(issueGrant(user, body, { enabled: [] }), { status: 503 });
  } finally { await new Promise(resolve => server.close(resolve)); }
});


test('G1/G2/G3: real Arcade handoff, owned game transitions and canonical receipt', { skip: !process.env.GUARD_ARCADE_MONGO_URI }, async () => {
  const mongoose = require('mongoose'), {randomUUID}=require('node:crypto');
  const base=process.env.GUARD_APP_ORIGIN, uri=new URL(process.env.GUARD_ARCADE_MONGO_URI);
  assert.ok(['127.0.0.1','localhost'].includes(uri.hostname)); assert.equal(uri.pathname,'/collegehubs_demo_arcade');
  const db=await mongoose.createConnection(process.env.GUARD_ARCADE_MONGO_URI).asPromise();
  function client(){const jar=new Map();return {jar,async request(path,{method='GET',body,token,csrf,origin=base}={}){const response=await fetch(base+path,{method,headers:{...(origin?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},...(body?{body:JSON.stringify(body)}:{})});for(const value of response.headers.getSetCookie()){const [k,v]=value.split(';')[0].split('=');jar.set(k,v);}return {status:response.status,data:await response.json(),headers:response.headers};}};}
  const a=client(),b=client(),same=client();
  const prefix='/api/arcade';
  async function bootstrap(client,core){const start=await client.request(prefix+'/auth/start',{method:'POST'});assert.equal(start.status,201);const state=start.data.state;const issued=await client.request('/api/auth/module-grants',{method:'POST',token:core.token,body:{module:'arcade',state,returnPath:'/arcade'}});assert.equal(issued.status,201);const body={module:'arcade',state,grant:issued.data.grant};assert.equal((await client.request(prefix+'/auth/callback',{method:'POST',body,origin:'https://foreign.invalid'})).status,403);const done=await client.request(prefix+'/auth/callback',{method:'POST',body});assert.equal(done.status,200,JSON.stringify(done.data));assert.match(done.headers.get('set-cookie'),/Path=\/api\/arcade/);assert.match(done.headers.get('set-cookie'),/HttpOnly/);client.jar.set('ch_arcade_state',state);assert.equal((await client.request(prefix+'/auth/callback',{method:'POST',body})).status,409);return (await client.request(prefix+'/session')).data;}
  try{
    const name='arcade-'+randomUUID().slice(0,8);const reg=await a.request('/api/auth/register',{method:'POST',body:{username:name,email:name+'@cvr.ac.in',password:'Disposable-arcade-71!'}});assert.equal(reg.status,201);const core=reg.data;
    const other=(await b.request('/api/auth/login',{method:'POST',body:{email:'preview@sky.example.test',password:'Preview-only-32!'}})).data;
    const peer=(await same.request('/api/auth/login',{method:'POST',body:{email:'peer@cvr.ac.in',password:'Preview-only-32!'}})).data;
    assert.equal((await a.request(prefix+'/sessions')).status,401);
    const session=await bootstrap(a,core),foreign=await bootstrap(b,other),peerSession=await bootstrap(same,peer);
    assert.equal(session.userId,core.user._id);assert.equal(session.hubId,core.user.hubId);assert.equal(session.token,undefined);assert.equal(session.theme.hubId,core.user.hubId);
    const input={gameId:'numberguess',clientSessionId:randomUUID()};
    assert.equal((await a.request(prefix+'/sessions',{method:'POST',body:input,csrf:'wrong'})).status,403);
    const created=await a.request(prefix+'/sessions',{method:'POST',body:input,csrf:session.csrfToken});assert.equal(created.status,201);const game=created.data.game,path=prefix+'/sessions/'+game.id;
    assert.equal((await a.request(prefix+'/sessions',{method:'POST',body:input,csrf:session.csrfToken})).data.game.id,game.id);
    assert.ok(!JSON.stringify(created.data).includes('target'));assert.ok(!JSON.stringify(created.data).includes('accessJti'));
    assert.equal((await b.request(path)).status,404);assert.equal((await same.request(path)).status,404);
    assert.equal((await b.request(path+'/actions',{method:'POST',csrf:foreign.csrfToken,body:{seq:1,guess:50}})).status,404);
    assert.equal((await a.request(path+'?hubId='+other.user.hubId)).status,400);
    assert.equal((await a.request(path+'/complete',{method:'POST',csrf:session.csrfToken,body:{score:100}})).status,400);
    assert.equal((await a.request(path+'/complete',{method:'POST',csrf:session.csrfToken,body:{}})).status,409);
    const post=body=>a.request(path+'/actions',{method:'POST',csrf:session.csrfToken,body});
    assert.equal((await post({seq:1,guess:50,awardedAura:999})).status,400);
    const simultaneous=await Promise.all([post({seq:1,guess:50}),post({seq:1,guess:50})]);assert.deepEqual(simultaneous.map(r=>r.status),[200,200]);assert.deepEqual(simultaneous[0].data.transition,simultaneous[1].data.transition);
    assert.equal((await post({seq:1,guess:51})).status,409);
    let current=simultaneous[0].data.game,low=1,high=100;
    while(current.status==='active'){const last=current.actions.at(-1);if(last.hint==='higher')low=last.guess+1;else high=last.guess-1;const reply=await post({seq:current.actions.length+1,guess:Math.floor((low+high)/2)});assert.equal(reply.status,200,JSON.stringify(reply.data));current=reply.data.game;}
    assert.equal(current.status,'won');assert.ok(!JSON.stringify(current).includes('target'));
    const completed=await a.request(path+'/complete',{method:'POST',csrf:session.csrfToken,body:{}});assert.equal(completed.status,200);
    for(let i=0;i<15;i++){current=(await a.request(path)).data.game;if(current.deliveryStatus==='settled')break;await new Promise(r=>setTimeout(r,200));}
    assert.equal(current.deliveryStatus,'settled',JSON.stringify(current));assert.equal(current.receipt.awardedAura,5);
    assert.equal((await a.request('/api/me/aura',{token:core.token})).data.engagement,5);
    assert.equal((await a.request(path+'/complete',{method:'POST',csrf:session.csrfToken,body:{}})).data.game.receipt.eventId,current.receipt.eventId);
    // Lose Core's already-committed HTTP reply: retry must retain the exact event and receipt.
    const GameModel=require('../../services/arcade/src/models/GameSession')(db);
    const stored=await GameModel.findById(game.id).lean(), originalEvent=JSON.stringify(stored.event);
    await GameModel.updateOne({_id:game.id},{$set:{deliveryStatus:'pending',receipt:null,nextAttemptAt:new Date(0)}});
    const deliveryConfig={core:'http://127.0.0.1:5183',serviceKey:process.env.GUARD_ARCADE_SERVICE_KEY};
    let forwarded=0;
    const lostReply=require('../../services/arcade/src/services/coreEvents').createCoreEvents(GameModel,deliveryConfig,async(url,options)=>{const reply=await fetch(url,options);assert.equal(reply.status,200);forwarded++;await reply.text();throw Error('simulated lost reply');});
    await lostReply.deliver(game.id);await lostReply.deliver(game.id);
    const pending=await GameModel.findById(game.id).lean();assert.equal(pending.deliveryStatus,'pending');assert.equal(forwarded,1);assert.ok(+pending.nextAttemptAt>Date.now());assert.equal(JSON.stringify(pending.event),originalEvent);
    await GameModel.updateOne({_id:game.id},{$set:{nextAttemptAt:new Date(0)}});
    await require('../../services/arcade/src/services/coreEvents').createCoreEvents(GameModel,deliveryConfig).reconcile();
    const recovered=await GameModel.findById(game.id).lean();assert.equal(recovered.deliveryStatus,'settled');assert.deepEqual(recovered.receipt,stored.receipt);
    // A different successful NumberGuess on the same India day earns zero.
    let again=(await a.request(prefix+'/sessions',{method:'POST',csrf:session.csrfToken,body:{...input,clientSessionId:randomUUID()}})).data.game;
    let lo=1,hi=100;const againPath=prefix+'/sessions/'+again.id;
    while(again.status==='active'){const reply=await a.request(againPath+'/actions',{method:'POST',csrf:session.csrfToken,body:{seq:again.actions.length+1,guess:Math.floor((lo+hi)/2)}});assert.equal(reply.status,200);again=reply.data.game;const step=again.actions.at(-1);if(step.hint==='higher')lo=step.guess+1;else hi=step.guess-1;}
    for(let i=0;i<15;i++){again=(await a.request(againPath)).data.game;if(again.deliveryStatus==='settled')break;await new Promise(r=>setTimeout(r,200));}
    assert.equal(again.status,'won');assert.equal(again.receipt.awardedAura,0);assert.equal((await a.request('/api/me/aura',{token:core.token})).data.engagement,5);
    const rejected={...stored.event,eventId:'arcade:disabled:'+randomUUID(),metadata:{...stored.event.metadata,sourceId:randomUUID(),gameId:'mathamplitude'}};
    assert.equal((await fetch(deliveryConfig.core+'/api/aura/events',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+deliveryConfig.serviceKey},body:JSON.stringify(rejected)})).status,503);
    const newGame=(await a.request(prefix+'/sessions',{method:'POST',csrf:session.csrfToken,body:{...input,clientSessionId:randomUUID()}})).data.game;
    await db.collection('gamesessions').updateOne({_id:new mongoose.Types.ObjectId(newGame.id)},{$set:{expiresAt:new Date(0)}});
    assert.equal((await a.request(prefix+'/sessions/'+newGame.id)).data.game.status,'expired');
    assert.equal((await a.request(prefix+'/sessions/'+newGame.id+'/actions',{method:'POST',csrf:session.csrfToken,body:{seq:1,guess:50}})).status,409);
    const catalogue=(await a.request(prefix+'/games')).data.items;
    assert.deepEqual(catalogue.filter(g=>g.status==='ranked'&&g.enabled).map(g=>g.id).sort(),['mathamplitude','numberguess','sorting']);
    assert.equal((await a.request(prefix+'/sessions',{method:'POST',csrf:session.csrfToken,body:{gameId:'snake',clientSessionId:randomUUID()}})).status,400);
    const createGame=async gameId=>(await a.request(prefix+'/sessions',{method:'POST',csrf:session.csrfToken,body:{gameId,clientSessionId:randomUUID()}})).data.game;
    const submitGame=async(g,body)=>a.request(prefix+'/sessions/'+g.id+'/actions',{method:'POST',csrf:session.csrfToken,body});
    const settle=async g=>{for(let i=0;i<15;i++){g=(await a.request(prefix+'/sessions/'+g.id)).data.game;if(g.deliveryStatus==='settled')return g;await new Promise(r=>setTimeout(r,200));}assert.fail('Receipt did not settle');};
    let math=await createGame('mathamplitude');const mathPath=prefix+'/sessions/'+math.id;
    assert.equal((await b.request(mathPath)).status,404);
    assert.ok(!JSON.stringify(math).includes('"answer"'));assert.equal(math.math.currentQuestion.answer,undefined);assert.equal(math.challenge,undefined);
    assert.equal((await submitGame(math,{seq:1,questionId:'foreign-question',answer:0})).status,409);
    assert.equal((await a.request(mathPath+'/complete',{method:'POST',csrf:session.csrfToken,body:{score:100}})).status,400);
    const answerOf=q=>q.operation==='+'?q.num1+q.num2:q.operation==='-'?q.num1-q.num2:q.operation==='*'?q.num1*q.num2:q.num1/q.num2;
    const wrongBody={seq:1,questionId:math.math.currentQuestion.id,answer:answerOf(math.math.currentQuestion)+1};
    math=(await submitGame(math,wrongBody)).data.game;assert.equal(math.math.correctCount,0);assert.equal(math.deliveryStatus,'none');
    assert.equal((await submitGame(math,{...wrongBody,answer:wrongBody.answer+1})).status,409);
    while(math.math.correctCount<5){const q=math.math.currentQuestion;const body={seq:math.actions.length+1,questionId:q.id,answer:answerOf(q)};const reply=await submitGame(math,body);assert.equal(reply.status,200);math=reply.data.game;assert.deepEqual((await submitGame(math,body)).data.transition,reply.data.transition);}
    assert.equal((await a.request(mathPath+'/complete',{method:'POST',csrf:session.csrfToken,body:{}})).status,409);
    await new Promise(r=>setTimeout(r,Math.max(0,31000-(Date.now()-Date.parse(math.createdAt)))));
    assert.equal((await a.request(mathPath+'/complete',{method:'POST',csrf:session.csrfToken,body:{}})).data.game.status,'won');
    math=await settle(math);assert.equal(math.receipt.awardedAura,5);
    let lateMath=await createGame('mathamplitude');
    await db.collection('gamesessions').updateOne({_id:new mongoose.Types.ObjectId(lateMath.id)},{$set:{createdAt:new Date(Date.now()-61000),expiresAt:new Date(Date.now()-1000)}});
    assert.equal((await submitGame(lateMath,{seq:1,questionId:lateMath.math.currentQuestion.id,answer:answerOf(lateMath.math.currentQuestion)})).status,409);
    lateMath=(await a.request(prefix+'/sessions/'+lateMath.id+'/complete',{method:'POST',csrf:session.csrfToken,body:{}})).data.game;assert.equal(lateMath.status,'lost');assert.equal(lateMath.deliveryStatus,'none');
    let sorting=await createGame('sorting');const sortPath=prefix+'/sessions/'+sorting.id;
    assert.equal((await same.request(sortPath)).status,404);
    assert.equal((await submitGame(sorting,{seq:1,type:'swap',left:0,right:1})).status,409);
    assert.equal((await submitGame(sorting,{seq:1,type:'compare',left:1,right:2})).status,409);
    assert.equal((await submitGame(sorting,{seq:1,type:'complexity',choice:'quadratic'})).status,409);
    assert.equal((await submitGame(sorting,{seq:1,type:'compare',left:0,right:1,array:[1,2,3]})).status,400);
    const solveSort=async g=>{while(!g.sorting.traceComplete){assert.ok(g.actions.length<31);const s=g.sorting;const reply=await submitGame(g,{seq:g.actions.length+1,type:s.needsSwap?'swap':'compare',left:s.index,right:s.index+1});assert.equal(reply.status,200);g=reply.data.game;}return g;};
    sorting=await solveSort(sorting);assert.equal(sorting.sorting.comparisons,15);assert.deepEqual([...sorting.sorting.array].sort((a,b)=>a-b),sorting.sorting.array);
    assert.equal((await submitGame(sorting,{seq:sorting.actions.length+1,type:'complexity',choice:'linear'})).status,400);
    const complexity={seq:sorting.actions.length+1,type:'complexity',choice:'quadratic'};
    const sortReplies=await Promise.all([submitGame(sorting,complexity),submitGame(sorting,complexity)]);assert.deepEqual(sortReplies.map(r=>r.status),[200,200]);assert.deepEqual(sortReplies[0].data.transition,sortReplies[1].data.transition);
    sorting=await settle(sorting);assert.equal(sorting.receipt.awardedAura,5);
    let secondSort=await solveSort(await createGame('sorting'));
    secondSort=(await submitGame(secondSort,{seq:secondSort.actions.length+1,type:'complexity',choice:'quadratic'})).data.game;
    secondSort=await settle(secondSort);assert.equal(secondSort.receipt.awardedAura,0);
    assert.equal((await a.request('/api/me/aura',{token:core.token})).data.engagement,15);
    assert.equal((await a.request(prefix+'/integration/reconcile',{method:'POST',body:{},csrf:session.csrfToken})).status,403);
    assert.equal((await a.request(prefix+'/logout',{method:'POST',csrf:session.csrfToken})).status,200);assert.equal((await a.request(prefix+'/session')).status,401);
    await db.collection('modulesessions').updateMany({user_id:other.user._id},{$set:{expires_at:new Date(0)}});assert.equal((await b.request(prefix+'/session')).status,401);
  }finally{await db.close();}
});
