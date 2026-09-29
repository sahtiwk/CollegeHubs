const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'g2-isolated-fixture-core-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.ENABLE_MODULES = '';
const { createApp } = require('../../server/app');

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
const jwt = require('../../server/node_modules/jsonwebtoken');
const { moduleConfig } = require('../../server/config/modules');
const User = require('../../server/models/User');
const Hub = require('../../server/models/Hub');
const College = require('../../server/models/College');
const ModuleGrant = require('../../server/models/ModuleGrant');
const ServiceCredential = require('../../server/models/ServiceCredential');
const { generateToken } = require('../../server/config/auth');
const { issueGrant, exchangeGrant, authenticateService, opaque, digest } = require('../../server/services/moduleTokenService');
const { verifyModuleToken } = require('../../packages/contracts/module-token.cjs');
const sessions = require('../../packages/contracts/module-session.cjs');
const { config: registry } = require('../../server/config/collegeRegistry');
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
  assert.ok(cookie.includes('Path=/arcade; HttpOnly; Secure; SameSite=Lax; Max-Age=900'));
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
