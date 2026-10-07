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

test('G2: only Interview PDF upload has a bounded streamed large-body allowance', async()=>{
  const {proxyApi}=await import('../../apps/web/functions/api/[[path]].ts');
  const env={INTERVIEW_API_ORIGIN:'https://interview.example',CORE_API_ORIGIN:'https://core.example'};
  const make=(path,bytes)=>new Request('https://app.example'+path,{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=fixture',Cookie:'ch_interview_session=owned; ch_arcade_session=foreign; core=private',Authorization:'Bearer core-private'},body:bytes});
  const fake=async(_url,options)=>{assert.equal(options.headers.get('cookie'),'ch_interview_session=owned');assert.equal(options.headers.get('authorization'),null);assert.ok(options.body instanceof ReadableStream);assert.equal((await new Response(options.body).arrayBuffer()).byteLength,70000);return new Response('{}',{headers:{'Content-Type':'application/json'}});};
  assert.equal((await proxyApi(make('/api/interview/resumes/upload',new Uint8Array(70000)),env,fake)).status,200);
  assert.equal((await proxyApi(make('/api/interview/resumes',new Uint8Array(70000)),env,fake)).status,413);
  const consume=async(_url,options)=>{await new Response(options.body).arrayBuffer();return new Response('{}',{headers:{'Content-Type':'application/json'}});};
  assert.equal((await proxyApi(make('/api/interview/resumes/upload',new Uint8Array(6*1024*1024)),env,consume)).status,413);
});

test('G2: Learn HTTP adapter is JSON-only, scoped and fail-closed', async () => {
  const { createApp: createLearnApp } = await import('../../services/learn/src/app.ts');
  const state = 's'.repeat(43);
  const app = createLearnApp({ config: { origin: 'http://localhost:5173', secure: false },
    pool: { query: async () => ({ rows: [{ version: 1 }] }) },
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

test('G1/G2/G3: Interview persists owned five-question practice, leases, retries and one canonical receipt', {skip:!process.env.GUARD_INTERVIEW_MONGO_URI}, async()=>{
  const mongoose=require('mongoose'),{randomUUID}=require('node:crypto'),{pdfFixture}=require('../../scripts/pdf-fixture.cjs');
  const base=process.env.GUARD_APP_ORIGIN,p='/api/interview',uri=new URL(process.env.GUARD_INTERVIEW_MONGO_URI);
  assert.ok(['localhost','127.0.0.1'].includes(uri.hostname));assert.equal(uri.pathname,'/collegehubs_demo_interview');
  const db=await mongoose.createConnection(uri.toString()).asPromise();
  function client(){const jar=new Map();return {async call(path,{method='GET',body,csrf,token,origin=base}={}){const form=body instanceof FormData,response=await fetch(base+path,{method,headers:{...(origin?{Origin:origin}:{}),Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(body&&!form?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:form?body:JSON.stringify(body)}:{})});for(const value of response.headers.getSetCookie()){const [k,v]=value.split(';')[0].split('=');jar.set(k,v);}return {status:response.status,data:await response.json(),headers:response.headers};}};}
  const owner=client(),peer=client();
  async function bootstrap(c,core){const {state}=(await c.call(p+'/auth/start',{method:'POST'})).data;const {grant}=(await c.call('/api/auth/module-grants',{method:'POST',token:core.token,body:{module:'interview',state,returnPath:'/interview'}})).data;assert.equal((await c.call(p+'/auth/callback',{method:'POST',body:{module:'interview',state,grant}})).status,200);return (await c.call(p+'/session')).data;}
  const oid=id=>new mongoose.Types.ObjectId(id);
  try{
    const username='practice-'+randomUUID().slice(0,8),registered=await owner.call('/api/auth/register',{method:'POST',body:{username,email:username+'@cvr.ac.in',password:'Disposable-practice-82!'}});assert.equal(registered.status,201);const core=registered.data;
    let auth=await bootstrap(owner,core); const peerCore=(await peer.call('/api/auth/login',{method:'POST',body:{email:'peer@cvr.ac.in',password:'Preview-only-32!'}})).data,peerAuth=await bootstrap(peer,peerCore);
    const call=(path,method='GET',body)=>owner.call(p+path,{method,body,csrf:auth.csrfToken});
    assert.equal((await call('/capabilities')).data.provider,'Synthetic test provider','Guards must never use live LLM calls');
    // Disposable provider counters only: deterministic repeatability, never a runtime bypass.
    await db.collection('aicontrols').deleteMany({});
    const form=new FormData();form.append('file',new Blob([pdfFixture('SYNTHETIC RESUME fixture candidate JavaScript tests')],{type:'application/pdf'}),'synthetic.pdf');
    const uploaded=await call('/resumes/upload','POST',form);assert.equal(uploaded.status,201);const resumeId=uploaded.data.resume.id;
    const draftBody={resumeId,jobTitle:'Synthetic intern',jobDescription:'JavaScript tests and teamwork',questionTypes:['technical','behavioral'],clientRequestId:randomUUID()};
    const draft=await call('/interviews','POST',draftBody);assert.equal(draft.status,201,JSON.stringify(draft.data));const id=draft.data.interview.id;
    assert.equal((await call('/interviews','POST',draftBody)).data.interview.id,id);
    assert.equal((await call('/interviews','POST',{...draftBody,jobTitle:'changed'})).status,409);
    assert.equal((await peer.call(p+'/interviews/'+id+'/generate',{method:'POST',csrf:peerAuth.csrfToken,body:{}})).status,404);
    const generated=await call('/interviews/'+id+'/generate','POST',{});assert.equal(generated.status,200,JSON.stringify(generated.data));const questions=generated.data.interview.questions;
    assert.equal(questions.length,5);assert.deepEqual(questions.map(q=>q.category),['technical','behavioral','technical','behavioral','technical']);assert.ok(questions.every(q=>!q.expectedKeywords));
    assert.deepEqual((await call('/interviews/'+id+'/generate','POST',{})).data.interview.questions,questions);
    const started=await call('/sessions','POST',{interviewId:id});assert.equal(started.status,201,JSON.stringify(started.data));const sid=started.data.session.id,path='/sessions/'+sid;
    assert.equal((await call('/sessions','POST',{interviewId:id})).data.session.id,sid);
    assert.equal((await call(path+'/complete','POST',{})).status,409);
    assert.equal((await peer.call(p+path)).status,404);
    assert.equal((await peer.call(p+path+'/answers/'+questions[0].id,{method:'PUT',csrf:peerAuth.csrfToken,body:{revision:1,answer:'foreign',skipped:false}})).status,404);
    for(let i=0;i<5;i++){const body={revision:1,answer:i<3?'A concrete example and tradeoff.':'',skipped:i>=3};const saved=await call(path+'/answers/'+questions[i].id,'PUT',body);assert.equal(saved.status,200,JSON.stringify(saved.data));if(i===0){assert.equal((await call(path+'/answers/'+questions[i].id,'PUT',body)).status,200);assert.equal((await call(path+'/answers/'+questions[i].id,'PUT',{...body,answer:'changed'})).status,409);}}
    assert.equal((await call(path)).data.session.answers.filter(a=>a.revision===1).length,5);
    assert.equal((await call(path+'/answers/'+randomUUID(),'PUT',{revision:1,answer:'unknown',skipped:false})).status,404);
    const originalJti=(await db.collection('modulesessions').findOne({user_id:core.user._id})).principal.jti;
    await db.collection('modulesessions').updateMany({user_id:core.user._id},{$set:{expires_at:new Date(0)}});
    auth=await bootstrap(owner,core);
    // Explicit fixture clock to check qualification without delaying every guard run.
    await db.collection('sessions').updateOne({_id:oid(sid)},{$set:{createdAt:new Date(Date.now()-61000)}});
    const completed=await Promise.all([call(path+'/complete','POST',{}),call(path+'/complete','POST',{})]);assert.ok(completed.every(r=>[200,202].includes(r.status)),JSON.stringify(completed));
    let result=(await call(path)).data.session;assert.equal(result.status,'completed');assert.equal(result.report.score,48);assert.equal(result.report.answeredCount,3);assert.deepEqual(result.report.answers.map(a=>a.score),[8,8,8,0,0]);const report=result.report;
    assert.deepEqual((await call(path+'/complete','POST',{})).data.session.report,report);
    assert.equal((await call(path+'/complete','POST',{score:100})).status,400);assert.equal((await call(path+'/answers/'+questions[0].id,'PUT',{revision:2,answer:'changed',skipped:false})).status,409);
    for(let i=0;i<30&&result.deliveryStatus!=='settled';i++){await new Promise(resolve=>setTimeout(resolve,100));result=(await call(path)).data.session;}
    assert.equal(result.deliveryStatus,'settled',JSON.stringify(result));assert.equal(result.receipt.awardedAura,24);
    const stored=await db.collection('sessions').findOne({_id:oid(sid)});assert.equal(stored.evaluationAttempts,1);assert.equal(stored.event.eventId,`interview:${sid}:completed:v1`);assert.equal(stored.event.metadata.accessJti,(await db.collection('modulesessions').findOne({user_id:core.user._id},{sort:{_id:-1}})).principal.jti);assert.notEqual(stored.event.metadata.accessJti,originalJti);assert.equal(stored.event.metadata.questionCount,5);
    assert.equal(JSON.stringify(result).includes('SYNTHETIC RESUME'),false);assert.equal(JSON.stringify(result).includes('expectedKeywords'),false);assert.equal(result.event,undefined);
    // Simulate an acknowledgement lost after Core committed. Retry the unchanged fact.
    const Session=require('../../services/interview/src/models/Session.model')(db),{createCoreEvents}=require('../../services/interview/src/services/coreEvents');
    const config={core:'http://127.0.0.1:5183',serviceKey:process.env.GUARD_INTERVIEW_SERVICE_KEY};
    await Session.updateOne({_id:sid},{$set:{deliveryStatus:'pending',receipt:null,nextAttemptAt:new Date(0),deliveryLeaseUntil:new Date(0)}});
    await createCoreEvents(Session,config,async(...args)=>{const r=await fetch(...args);assert.equal(r.status,200);await r.arrayBuffer();throw new Error('Lost Core acknowledgement');}).deliver(sid);
    assert.equal((await Session.findById(sid)).deliveryStatus,'pending');await Session.updateOne({_id:sid},{$set:{nextAttemptAt:new Date(0)}});await createCoreEvents(Session,config).deliver(sid);
    assert.equal((await Session.findById(sid)).receipt.awardedAura,24);assert.deepEqual((await Session.findById(sid)).event,stored.event);
    assert.equal((await owner.call(p+'/integration/reconcile',{method:'POST',token:process.env.GUARD_INTERVIEW_RECONCILE_KEY,body:{}})).status,403);
    assert.equal((await fetch('http://127.0.0.1:5186'+p+'/integration/reconcile',{method:'POST',headers:{Authorization:'Bearer '+process.env.GUARD_INTERVIEW_RECONCILE_KEY,'Content-Type':'application/json'},body:'{}'})).status,200);
    // A second generation fails explicitly, recovers its lease, then evaluates with a retry.
    const d2=(await call('/interviews','POST',{...draftBody,clientRequestId:randomUUID(),jobDescription:'[fixture:malformed]'})).data.interview.id;
    const bad=await call('/interviews/'+d2+'/generate','POST',{});assert.equal(bad.status,503);assert.equal((await call('/interviews/'+d2)).data.interview.status,'generation_failed');
    await db.collection('interviews').updateOne({_id:oid(d2)},{$set:{jobDescription:'Synthetic role',status:'generating',generationLease:'interrupted',generationLeaseUntil:new Date(0),retryAt:new Date(0)}});
    assert.equal((await call('/interviews/'+d2)).data.interview.lastError,'GENERATION_INTERRUPTED');assert.equal((await call('/interviews/'+d2+'/generate','POST',{})).status,200);
    const second=(await call('/sessions','POST',{interviewId:d2})).data.session,secondPath='/sessions/'+second.id;
    for(const q of second.questions)assert.equal((await call(secondPath+'/answers/'+q.id,'PUT',{revision:1,answer:'[fixture:429]',skipped:false})).status,200);
    const limited=await call(secondPath+'/complete','POST',{});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'1');
    const failed=(await call(secondPath)).data.session;assert.equal(failed.status,'evaluation_failed');assert.equal(failed.report,null);assert.equal(failed.deliveryStatus,'none');assert.equal((await db.collection('sessions').findOne({_id:oid(second.id)})).event,null);
    for(const q of second.questions)await call(secondPath+'/answers/'+q.id,'PUT',{revision:2,answer:'Corrected synthetic example and tradeoff',skipped:false});
    await db.collection('sessions').updateOne({_id:oid(second.id)},{$set:{status:'evaluating',evaluationLease:'killed',evaluationLeaseUntil:new Date(0),retryAt:new Date(0),createdAt:new Date(Date.now()-61000)}});
    await db.collection('aicontrols').updateOne({_id:'provider'},{$set:{cooldownUntil:new Date(0)}});
    assert.equal((await call(secondPath)).data.session.lastError,'EVALUATION_INTERRUPTED');
    assert.equal((await call(secondPath+'/complete','POST',{})).data.session.report.score,80);
    let r2;for(let i=0;i<30;i++){r2=(await call(secondPath)).data.session;if(r2.deliveryStatus==='settled')break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(r2.receipt.awardedAura,28);
    // Third attempted generation is blocked after three prior provider attempts (including failure).
    const d3=(await call('/interviews','POST',{...draftBody,clientRequestId:randomUUID()})).data.interview.id;assert.equal((await call('/interviews/'+d3+'/generate','POST',{})).data.error.code,'AI_QUOTA');
    assert.equal((await call('/resumes/'+resumeId,'DELETE')).status,200);assert.equal((await call('/interviews/'+id)).data.interview.resumeUnavailable,true);assert.deepEqual((await call(path)).data.session.report,report);
    assert.equal((await call('/interviews/'+d3+'/generate','POST',{})).data.error.code,'RESUME_UNAVAILABLE');
    assert.equal((await owner.call('/api/me/aura',{token:core.token})).data.total,52);
  }finally{await db.close();}
});

test('G1/G2: independent Interview handoff, bounded text-only PDF and scoped resume references', {skip:!process.env.GUARD_INTERVIEW_MONGO_URI}, async()=>{
  const {randomUUID}=require('node:crypto'),mongoose=require('mongoose'),{pdfFixture}=require('../../scripts/pdf-fixture.cjs');
  const base=process.env.GUARD_APP_ORIGIN,uri=new URL(process.env.GUARD_INTERVIEW_MONGO_URI);
  assert.ok(['localhost','127.0.0.1'].includes(uri.hostname));assert.equal(uri.pathname,'/collegehubs_demo_interview');
  const db=await mongoose.createConnection(uri.toString()).asPromise();
  function client(){const jar=new Map();return{jar,async call(path,{method='GET',body,token,csrf,origin=base}={}){const form=body instanceof FormData;const response=await fetch(base+path,{method,headers:{...(origin?{Origin:origin}:{}),...(body&&!form?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},...(body?{body:form?body:JSON.stringify(body)}:{})});for(const value of response.headers.getSetCookie()){const [k,v]=value.split(';')[0].split('=');jar.set(k,v);}return{status:response.status,data:await response.json(),headers:response.headers};}};}
  const owner=client(),peer=client(),foreign=client(),p='/api/interview';
  async function bootstrap(c,core){const started=await c.call(p+'/auth/start',{method:'POST'});assert.equal(started.status,201);const state=started.data.state,grant=(await c.call('/api/auth/module-grants',{method:'POST',token:core.token,body:{module:'interview',state,returnPath:'/interview'}})).data;const body={module:'interview',state,grant:grant.grant};assert.equal((await c.call(p+'/auth/callback',{method:'POST',body,origin:'https://foreign.invalid'})).status,403);const done=await c.call(p+'/auth/callback',{method:'POST',body});assert.equal(done.status,200,JSON.stringify(done.data));assert.match(done.headers.get('set-cookie'),/Path=\/api\/interview/);assert.match(done.headers.get('set-cookie'),/HttpOnly/);c.jar.set('ch_interview_state',state);assert.equal((await c.call(p+'/auth/callback',{method:'POST',body})).status,409);return(await c.call(p+'/session')).data;}
  function form(bytes=pdfFixture(),type='application/pdf',name='synthetic.pdf'){const data=new FormData();data.append('file',new Blob([bytes],{type}),name);return data;}
  try{
    const username='resume-'+randomUUID().slice(0,8),registered=await owner.call('/api/auth/register',{method:'POST',body:{username,email:username+'@cvr.ac.in',password:'Disposable-resume-81!'}});assert.equal(registered.status,201);const core=registered.data;
    const peerCore=(await peer.call('/api/auth/login',{method:'POST',body:{email:'peer@cvr.ac.in',password:'Preview-only-32!'}})).data;
    const foreignCore=(await foreign.call('/api/auth/login',{method:'POST',body:{email:'preview@sky.example.test',password:'Preview-only-32!'}})).data;
    assert.equal((await owner.call(p+'/resumes',{token:core.token})).status,401);
    const session=await bootstrap(owner,core),peerSession=await bootstrap(peer,peerCore),foreignSession=await bootstrap(foreign,foreignCore);
    assert.equal(session.userId,core.user._id);assert.equal(session.hubId,core.user.hubId);assert.equal(session.theme.hubId,core.user.hubId);assert.equal(session.token,undefined);
    const upload=body=>owner.call(p+'/resumes/upload',{method:'POST',body,csrf:session.csrfToken});
    assert.equal((await owner.call(p+'/resumes/upload',{method:'POST',body:form(),csrf:'wrong'})).status,403);
    assert.equal((await upload(form(Buffer.from('not PDF')))).status,400);
    assert.equal((await upload(form(pdfFixture(),'application/msword','resume.doc'))).status,400);
    assert.equal((await upload(form(pdfFixture('encrypted',{encrypted:true})))).data.error.code,'PDF_ENCRYPTED');
    assert.equal((await upload(form(pdfFixture('')))).data.error.code,'PDF_EMPTY');
    assert.equal((await upload(form(Buffer.from('%PDF-1.4\nbroken\n%%EOF')))).status,400);
    assert.equal((await upload(form(pdfFixture('oversized',{padding:6*1024*1024})))).status,413);
    const selectors=form();selectors.append('hubId',foreignCore.user.hubId);assert.equal((await upload(selectors)).status,400);
    assert.equal((await owner.call(p+'/resumes')).data.items.length,0);
    const uploaded=await upload(form(pdfFixture(undefined,{padding:70000})));assert.equal(uploaded.status,201,JSON.stringify(uploaded.data));const resume=uploaded.data.resume;
    assert.equal(resume.storageDriver,'none');assert.equal(resume.fileUrl,null);assert.equal(resume.extractedText,undefined);assert.equal(resume.publicId,undefined);assert.equal(resume.buffer,undefined);
    const path=p+'/resumes/'+resume.id,read=await owner.call(path);assert.match(read.data.resume.extractedText,/SYNTHETIC RESUME/);assert.equal(read.data.resume.storageDriver,'none');
    assert.equal((await upload(form(pdfFixture(undefined,{padding:70000})))).data.resume.id,resume.id);
    for(const [c,s]of [[peer,peerSession],[foreign,foreignSession]]){assert.equal((await c.call(path)).status,404);assert.equal((await c.call(path,{method:'DELETE',csrf:s.csrfToken})).status,404);assert.equal((await c.call(p+'/resumes')).data.items.length,0);}
    assert.equal((await owner.call(p+'/resumes?hubId='+foreignCore.user.hubId)).status,400);
    const draftBody={resumeId:resume.id,jobTitle:'Synthetic internship',jobDescription:'Fixture-only JavaScript role',questionTypes:['technical']};
    assert.equal((await foreign.call(p+'/interviews',{method:'POST',csrf:foreignSession.csrfToken,body:draftBody})).status,404);
    assert.equal((await peer.call(p+'/interviews',{method:'POST',csrf:peerSession.csrfToken,body:draftBody})).status,404);
    const draft=await owner.call(p+'/interviews',{method:'POST',csrf:session.csrfToken,body:draftBody});assert.equal(draft.status,201);const draftPath=p+'/interviews/'+draft.data.interview.id;
    assert.equal((await foreign.call(draftPath)).status,404);assert.equal((await peer.call(draftPath,{method:'DELETE',csrf:peerSession.csrfToken})).status,404);
    assert.equal((await foreign.call(draftPath+'/generate',{method:'POST',csrf:foreignSession.csrfToken,body:{}})).status,404);
    for(const path of ['/auth/login','/admin','/jobs','/users','/resumes/chunk-preview', '/resumes/'+resume.id+'/parse'])assert.equal((await owner.call(p+path,{method:'POST',csrf:session.csrfToken,body:{}})).status,404);
    const stored=await db.collection('resumes').findOne({_id:new mongoose.Types.ObjectId(resume.id)});assert.equal(stored.userId,core.user._id);assert.equal(stored.hubId,core.user.hubId);assert.equal(stored.fileUrl,null);assert.equal(stored.publicId,undefined);assert.ok(!Object.values(stored).some(Buffer.isBuffer));
    const Session=require('../../services/interview/src/models/Session.model')(db);
    assert.throws(()=>new Session({userId:core.user._id,hubId:core.user.hubId,interviewId:draft.data.interview.id,extractedText:'Must not be copied'}));
    const report=await Session.create({userId:core.user._id,hubId:core.user.hubId,interviewId:draft.data.interview.id,status:'completed',report:{summary:'Synthetic retained report',score:60}});
    assert.equal((await owner.call(path,{method:'DELETE',csrf:session.csrfToken})).status,200);assert.equal((await owner.call(path)).status,404);assert.equal(await db.collection('resumes').countDocuments({_id:stored._id}),0);
    const retained=(await owner.call(draftPath)).data.interview;assert.equal(retained.resumeId,null);assert.equal(retained.resumeUnavailable,true);assert.equal(retained.extractedText,undefined);
    assert.equal((await owner.call(p+'/interviews',{method:'POST',csrf:session.csrfToken,body:draftBody})).status,404);
    assert.equal((await Session.findById(report.id).lean()).report.summary,'Synthetic retained report');
    const raced=(await upload(form(pdfFixture('SYNTHETIC race-only resume')))).data.resume;
    const race=await Promise.all([owner.call(p+'/interviews',{method:'POST',csrf:session.csrfToken,body:{...draftBody,resumeId:raced.id}}),owner.call(p+'/resumes/'+raced.id,{method:'DELETE',csrf:session.csrfToken})]);
    assert.equal(race[1].status,200);assert.ok([201,404].includes(race[0].status));
    if(race[0].status===201){const fenced=(await owner.call(p+'/interviews/'+race[0].data.interview.id)).data.interview;assert.equal(fenced.resumeId,null);assert.equal(fenced.resumeUnavailable,true);}
    assert.equal((await owner.call(p+'/resumes/'+raced.id)).status,404);
    assert.equal((await owner.call('/api/me/aura',{token:core.token})).data.total,0);
    assert.equal((await owner.call(p+'/logout',{method:'POST',csrf:session.csrfToken})).status,200);assert.equal((await owner.call(p+'/session')).status,401);
    await db.collection('modulesessions').updateMany({user_id:foreignCore.user._id},{$set:{expires_at:new Date(0)}});assert.equal((await foreign.call(p+'/session')).status,401);
    // Closing a separate Interview connection changes only its readiness, never Core's.
    const app=require('../../services/interview/src/app').createApp({connection:db,models:{},config:{origin:base}});
    const probe=app.listen(0,'127.0.0.1');await new Promise(resolve=>probe.once('listening',resolve));
    const probeBase='http://127.0.0.1:'+probe.address().port;
    try{assert.equal((await fetch(probeBase+'/health/ready')).status,200);await db.close();assert.equal((await fetch(probeBase+'/health/ready')).status,503);assert.equal((await fetch(probeBase+'/health/live')).status,200);assert.equal((await fetch(base+'/api/health')).status,200);}finally{await new Promise(resolve=>probe.close(resolve));}
  }finally{await db.close();}
});

test('G2: P9.1 retained learning routes require a module session before SQL or resource work', async () => {
  const { createApp } = await import('../../services/learn/src/app.ts');
  let sql = 0;
  const app = createApp({ config: { origin: 'http://localhost:5173', secure: false }, pool: { query: async () => { sql++; throw Error('must not query'); } }, store: { get: async () => { throw Object.assign(Error('session'), { status: 401, code: 'LEARN_SESSION_REQUIRED' }); } } });
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const [method, path] of [['GET','/dashboard/graph'],['GET','/dashboard/domains'],['GET','/dashboard/stats'],['GET','/dashboard/milestones'],['GET','/profile/preferences'],['GET','/nodes/00000000-0000-4000-8000-000000000001'],['POST','/onboarding'],['POST','/onboarding/profile'],['POST','/learner/intake'],['POST','/learner/init-graph'],['POST','/recommendation'],['POST','/tutor/fast'],['PUT','/profile/preferences'],['DELETE','/profile/path']]) {
      const res = await fetch(base+'/api/learn'+path,{method,headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},...(method==='GET'?{}:{body:'{}'})});
      assert.equal(res.status,401,method+' '+path);
    }
    assert.equal(sql,0);
  } finally { await new Promise(r => server.close(r)); }
});

test('G2: P9.1 fresh bootstrap refuses unconfirmed, production and populated targets without changing data', {skip: !process.env.GUARD_LEARN_DATABASE_URL}, async()=>{
  const {Pool}=require('pg'), {spawnSync}=require('node:child_process');
  const url=new URL(process.env.GUARD_LEARN_DATABASE_URL), name=url.pathname.slice(1);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname)); assert.match(name,/^collegehubs_demo_learn_[a-z0-9_]+$/);
  const pool=new Pool({connectionString:url.toString()});
  const snapshot=async()=>JSON.stringify((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows);
  try {
    const before=await snapshot(); assert.match(before,/learner_node_state/);
    const env={...process.env,DATABASE_URL:url.toString(),NODE_ENV:'test',DEMO_RESET_ENABLED:'true',DEMO_DB_NAME_ALLOWLIST:name};
    for(const [args,overrides] of [[[],{}],[['--confirm='+name,'--disposable-data-only'],{NODE_ENV:'production'}],[['--confirm='+name,'--disposable-data-only'],{DEMO_DB_NAME_ALLOWLIST:''}],[['--confirm='+name,'--disposable-data-only'],{}]]) {
      const r=spawnSync(process.execPath,['services/learn/scripts/setup_demo.ts',...args],{env:{...env,...overrides},encoding:'utf8'});
      assert.equal(r.status,1); assert.match(r.stderr,/bootstrap refused or failed/); assert.equal(await snapshot(),before);
    }
    assert.equal((await pool.query('SELECT version FROM learn_schema')).rows[0].version,1);
    const names=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(r=>r.tablename);
    assert.ok(!names.some(n=>/aura|streak|vector|clerk|quiz/i.test(n)));
  } finally {await pool.end();}
});

test('G2: P9.1 Learn readiness rejects a missing schema marker and redacts SQL failures', async()=>{
  const {createApp}=await import('../../services/learn/src/app.ts');
  let fail=false;
  const app=createApp({config:{origin:'http://localhost:5173',secure:false},pool:{query:async()=>{if(fail)throw Error('private SQL connection details');return {rows:[]};}},store:{}});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  try{for(const error of [false,true]){fail=error;const r=await fetch('http://127.0.0.1:'+server.address().port+'/health/ready');assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private SQL/);}}finally{await new Promise(r=>server.close(r));}
});
