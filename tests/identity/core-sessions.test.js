const test = require('node:test'), assert = require('node:assert/strict');
const mongoose = require('mongoose'), { MongoMemoryReplSet } = require('mongodb-memory-server');
Object.assign(process.env, { JWT_SECRET: 'disposable-tp21-only', NODE_ENV: 'test', ALLOWED_ORIGINS: 'https://app.example', ENABLE_MODULES: '', CORE_SESSION_ENABLED: 'true' });
test('G2: real Core through gateway, rotating revocable sessions', { timeout: 120000 }, async t => {
  const repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); let server;
  try {
    await mongoose.connect(repl.getUri());
    const User = require('../../services/core/models/User'), Session = require('../../services/core/models/AuthSession');
    await Promise.all([User.init(), Session.init()]);
    server = require('../../services/core/app').createApp().listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const { proxyApi } = await import('../../apps/web/functions/api/[[path]].ts');
    const env = { CORE_API_ORIGIN: 'http://127.0.0.1:' + server.address().port };
    async function call(route, { method = 'POST', cookie, csrf, token, origin = 'https://app.example', body = {} } = {}) {
      const request = new Request('https://app.example/api' + route, { method, headers: { ...(origin ? { origin } : {}), ...(cookie ? { cookie } : {}), ...(csrf ? { 'x-core-csrf': csrf } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
      const r = await proxyApi(request, env, fetch, true);
      return { status: r.status, data: r.status === 204 ? null : await r.json(), cookies: r.headers.getSetCookie(), csrf: r.headers.get('x-core-csrf') };
    }
    const password = 'Disposable-password-21!'; let serial = 0;
    async function account() {
      const username = 'sessions_' + ++serial;
      const a = await call('/auth/register', { body: { username, email: username + '@unknown.example', password } });
      assert.equal(a.status, 201, JSON.stringify(a.data));
      return { ...a.data, cookie: a.cookies[0].split(';')[0], csrf: a.csrf, cookies: a.cookies };
    }
    await t.test('secure cookie and short claims; exact origin and CSRF required', async () => {
      const a = await account(), claims = require('../../services/core/config/auth').verifyToken(a.token);
      assert.equal(claims.exp - claims.iat, 900); assert.ok(claims.sid);
      for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/api']) assert.ok(a.cookies[0].includes(flag));
      assert.equal((await call('/auth/refresh', { cookie: a.cookie, csrf: a.csrf, origin: null })).status, 403);
      assert.equal((await call('/auth/refresh', { cookie: a.cookie, csrf: a.csrf, origin: 'https://evil.example' })).status, 403);
      assert.equal((await call('/auth/refresh', { cookie: a.cookie })).status, 403);
      assert.equal((await call('/auth/csrf', { method: 'GET', cookie: a.cookie })).data.csrfToken, a.csrf);
      assert.equal((await call('/auth/csrf', { method: 'GET', cookie: a.cookie, origin: null })).status, 403);
      const legacy = require('jsonwebtoken').sign({ id: claims.id, sub: claims.sub, username: claims.username, hubId: null, scope: ['core:onboarding'], membershipVersion: 0, jti: 'legacy' }, process.env.JWT_SECRET, { issuer: 'collegehubs-core', audience: 'collegehubs-core-api', expiresIn: 86400 });
      assert.equal((await call('/me', { method: 'GET', token: legacy })).status, 401);
      assert.equal((await call('/auth/login', { origin: null, body: { email: a.user.email, password } })).status, 403);
    });
    await t.test('one concurrent winner, grace never issues tokens, delayed replay revokes', async () => {
      const a = await account();
      const results = await Promise.all(Array.from({ length: 4 }, () => call('/auth/refresh', a)));
      assert.equal(results.filter(r => r.status === 200).length, 1);
      assert.equal(results.filter(r => r.status === 409 && !r.data.token && !r.cookies.length).length, 3);
      const winner = results.find(r => r.status === 200);
      assert.equal((await call('/me', { method: 'GET', token: winner.data.token })).status, 200);
      const sid = require('../../services/core/config/auth').verifyToken(a.token).sid;
      await Session.updateOne({ _id: sid }, { $set: { rotatedAt: new Date(Date.now() - 6000) } });
      assert.equal((await call('/auth/refresh', a)).data.code, 'CORE_REFRESH_REPLAY');
      assert.equal((await call('/me', { method: 'GET', token: winner.data.token })).status, 401);
      assert.equal((await call('/auth/refresh', { cookie: winner.cookies[0].split(';')[0], csrf: a.csrf })).status, 401);
    });
    await t.test('logout, logout-all, expiry and forged refresh do not weaken revocation', async () => {
      const a = await account();
      const second = await call('/auth/login', { body: { email: a.user.email, password } });
      assert.equal((await call('/auth/refresh', { cookie: a.cookie.slice(0, -1) + '!', csrf: a.csrf })).status, 401);
      assert.equal((await call('/me', { method: 'GET', token: a.token })).status, 200);
      assert.equal((await call('/auth/logout', a)).status, 204);
      assert.equal((await call('/me', { method: 'GET', token: a.token })).status, 401);
      assert.equal((await call('/me', { method: 'GET', token: second.data.token })).status, 200);
      const third = await call('/auth/login', { body: { email: a.user.email, password } });
      assert.equal((await call('/auth/logout-all', { cookie: second.cookies[0].split(';')[0], csrf: second.csrf })).status, 204);
      assert.equal((await call('/me', { method: 'GET', token: third.data.token })).status, 401);
      for (const field of ['expiresAt', 'idleExpiresAt']) {
        const b = await account();
        await Session.updateOne({ userId: b.user._id }, { $set: { [field]: new Date(0) } });
        assert.equal((await call('/auth/refresh', b)).status, 401);
        assert.equal((await call('/me', { method: 'GET', token: b.token })).status, 401);
      }
    });
    await t.test('membership changes invalidate old access; refresh takes current membership', async () => {
      const a = await account();
      await User.updateOne({ _id: a.user._id }, { $inc: { membershipVersion: 1 } });
      assert.equal((await call('/me', { method: 'GET', token: a.token })).status, 401);
      const r = await call('/auth/refresh', a); assert.equal(r.status, 200);
      assert.equal(require('../../services/core/config/auth').verifyToken(r.data.token).membershipVersion, 1);
      await User.updateOne({ _id: a.user._id }, { $set: { membershipStatus: 'disabled' } });
      assert.equal((await call('/me', { method: 'GET', token: r.data.token })).status, 401);
    });
    await t.test('expired access is rejected while a valid refresh restores authority', async () => {
      const a = await account();
      const payload = require('../../services/core/config/auth').verifyToken(a.token);
      delete payload.exp; delete payload.iat;
      const short = require('jsonwebtoken').sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: 1 });
      assert.equal((await call('/me', { method: 'GET', token: short })).status, 200);
      await new Promise(resolve => setTimeout(resolve, 1100));
      assert.equal((await call('/me', { method: 'GET', token: short })).status, 401);
      const renewed = await call('/auth/refresh', a); assert.equal(renewed.status, 200);
      assert.equal((await call('/me', { method: 'GET', token: renewed.data.token })).status, 200);
      await call('/auth/logout', { cookie: renewed.cookies[0].split(';')[0], csrf: a.csrf });
      await assert.rejects(require('../../services/core/services/messageService').authenticateSocket(renewed.data.token), error => error.status === 401);
    });
    await t.test('gateway isolates request cookies, CSRF, bearers and response cookies', async () => {
      for (const module of [null, 'learn', 'arcade', 'interview']) {
        const cookieName = module ? 'ch_' + module + '_session' : 'ch_core_refresh';
        const request = new Request('https://app.example/api/' + (module || 'auth') + '/session', { headers: { cookie: 'ch_core_refresh=core; ch_learn_session=learn; ch_arcade_session=arcade; ch_interview_session=interview; unrelated=no', authorization: 'Bearer core', 'x-core-csrf': 'core', 'x-csrf-token': 'module' } });
        const r = await proxyApi(request, { CORE_API_ORIGIN: 'https://core.example', LEARN_API_ORIGIN: 'https://learn.example', ARCADE_API_ORIGIN: 'https://arcade.example', INTERVIEW_API_ORIGIN: 'https://interview.example' }, async (_url, options) => {
          assert.equal(options.headers.get('cookie'), cookieName + '=' + (module || 'core'));
          assert.equal(options.headers.get('authorization'), module ? null : 'Bearer core');
          assert.equal(options.headers.get('x-core-csrf'), module ? null : 'core');
          const headers = new Headers({ 'content-type': 'application/json', 'x-core-csrf': 'secret' });
          for (const name of ['ch_core_refresh', 'ch_learn_session', 'ch_arcade_session', 'ch_interview_session', 'unrelated']) headers.append('Set-Cookie', name + '=value; HttpOnly');
          return new Response('{}', { headers });
        });
        assert.equal(r.headers.getSetCookie().length, 1); assert.ok(r.headers.getSetCookie()[0].startsWith(cookieName + '='));
        assert.equal(r.headers.get('x-core-csrf'), module ? null : 'secret');
      }
    });
    await t.test('login flood returns bounded, uniform cooldown and persists across limiter instances', async () => {
      for (let n = 0; n < 20; n++) assert.equal((await call('/auth/login', { body: { email: 'unknown-budget@example.test', password } })).status, 401);
      const rejected = await call('/auth/login', { body: { email: 'unknown-budget@example.test', password } });
      assert.equal(rejected.status, 429); assert.equal(rejected.data.code, 'AUTH_RATE_LIMIT');
      const accountRow = await account();
      const period = 900000, start = Math.floor(Date.now() / period) * period;
      const id = require('crypto').createHmac('sha256', process.env.JWT_SECRET).update('login-budget:' + accountRow.user.email + ':' + start).digest('hex');
      await require('../../services/core/models/AuthThrottle').create({ _id: id, count: 20, expiresAt: new Date(start + period) });
      const known = await call('/auth/login', { body: { email: accountRow.user.email, password } });
      assert.deepEqual(known.data, rejected.data); assert.equal(known.status, 429);
      const middleware = require('../../services/core/middleware/authRateLimit').authRateLimit({ maxBuckets: 1 });
      let status, retry;
      const res = { set(_key, value) { retry = value; }, status(value) { status = value; return this; }, json() {} };
      await middleware({ method: 'POST', path: '/auth/register', ip: 'first' }, res, () => {});
      await middleware({ method: 'POST', path: '/auth/register', ip: 'second' }, res, () => assert.fail('Unbounded bucket admitted'));
      assert.equal(status, 429); assert.ok(Number(retry) > 0);
    });
  } finally { if (server) await new Promise(r => server.close(r)); await mongoose.disconnect(); await repl.stop(); }
});
