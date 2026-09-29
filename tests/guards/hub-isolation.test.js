const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'isolated-guard-fixture-secret-not-for-deployment';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = 'guard-google-client';
const { createApp } = require('../../server/app');
const User = require('../../server/models/User');
const Hub = require('../../server/models/Hub');
const College = require('../../server/models/College');
const Post = require('../../server/models/Post');
const { generateToken, verifyToken } = require('../../server/config/auth');
const { getUserHubs, requireHubAccess, scopedFilter } = require('../../server/services/hubAccess');
const { normalizeDomain } = require('../../server/config/collegeRegistry');

const id = value => value.toString(16).padStart(24, '0');
let users, hubs, colleges, posts, restores;
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => String(row[key]) === String(value));
}
function query(value) {
  return { select() { return this; }, sort() { return this; }, limit() { return this; },
    populate() { return this; }, exec: async () => value,
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
}
function patch(model, name, fn) { const original = model[name]; restores.push(() => { model[name] = original; }); model[name] = fn; }
test.beforeEach(() => {
  restores = [];
  users = [
    { _id: id(1), username: 'alice', email: 'alice@a.example.test', hubId: id(10), membershipStatus: 'active', membershipVersion: 1, college: 'A' },
    { _id: id(2), username: 'bob', email: 'bob@b.example.test', hubId: id(20), membershipStatus: 'active', membershipVersion: 1, college: 'B' },
    { _id: id(3), username: 'unknown', email: 'unknown@example.test', hubId: null, membershipStatus: 'unassigned', membershipVersion: 0 },
    { _id: id(4), username: 'legacy', email: 'legacy@example.test', college: 'A' },
    { _id: id(5), username: 'peer', email: 'peer@a.example.test', hubId: id(10), membershipStatus: 'active', membershipVersion: 1 },
  ];
  hubs = [{ _id: id(10), hubId: id(10), collegeId: id(100), status: 'active' }, { _id: id(20), hubId: id(20), collegeId: id(200), status: 'active' }];
  colleges = [{ _id: id(100), status: 'active' }, { _id: id(200), status: 'active' }];
  posts = [{ _id: id(30), hubId: id(10), likes: [] }, { _id: id(40), hubId: id(20), likes: [] }, { _id: id(50), likes: [] }];
  for (const post of posts) { post.save = async () => post; post.populate = async () => post; }
  patch(User, 'findById', value => query(users.find(user => user._id === String(value)) || null));
  patch(User, 'findOne', filter => query(users.find(user => matches(user, filter)) || null));
  patch(User, 'find', filter => query(users.filter(user => matches(user, filter))));
  patch(User, 'findByIdAndUpdate', (value, update) => { const user = users.find(item => item._id === String(value)); Object.assign(user, update.$set); return query(user); });
  patch(Hub, 'findOne', filter => query(hubs.find(hub => matches(hub, filter)) || null));
  patch(College, 'exists', filter => query(colleges.find(college => matches(college, filter)) || null));
  patch(Post, 'find', filter => query(posts.filter(post => matches(post, filter))));
  patch(Post, 'findOne', filter => query(posts.find(post => matches(post, filter)) || null));
});
test.afterEach(() => restores.reverse().forEach(restore => restore()));
async function withApi(work) {
  const server = createApp({ connection: { readyState: 1 } }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const request = async (path, user, method = 'GET', body, token) => {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api' + path, {
      method, headers: { ...(user ? { Authorization: 'Bearer ' + (token || generateToken(user)) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  };
  try { await work(request); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('G1: anonymous callers cannot read tenant leaderboard', () => withApi(async request => {
  assert.equal((await request('/users/leaderboard')).status, 401);
  assert.equal((await request('/posts')).status, 401);
}));
test('G1: other-Hub and missing-Hub posts never appear, including a forged query Hub', () => withApi(async request => {
  const response = await request('/posts?hubId=' + id(20), users[0]);
  assert.equal(response.status, 200);
  assert.deepEqual(response.data.map(post => post._id), [id(30)]);
}));
test('G1: profiles and rankings hide foreign and missing-Hub users', () => withApi(async request => {
  assert.equal((await request('/users/bob', users[0])).status, 404);
  assert.equal((await request('/users/legacy', users[0])).status, 404);
  const response = await request('/users/leaderboard', users[0]);
  assert.deepEqual(response.data.map(user => user.username), ['alice', 'peer']);
  assert.ok(response.data.every(user => !Object.hasOwn(user, 'email')));
}));
test('G1: foreign and missing-Hub likes are denied; own-Hub like works', () => withApi(async request => {
  for (const postId of [id(40), id(50)]) assert.equal((await request('/posts/' + postId + '/like', users[0], 'PUT', {})).status, 404);
  assert.equal((await request('/posts/' + id(30) + '/like', users[0], 'PUT', {})).status, 200);
  assert.deepEqual(posts[1].likes, []);
}));
test('G1: unknown and legacy identities are onboarding-only', () => withApi(async request => {
  for (const user of [users[2], users[3]]) {
    assert.equal((await request('/posts', user)).status, 403);
    assert.equal((await request('/users/leaderboard', user)).status, 403);
    assert.equal((await request('/me', user)).status, 200);
    assert.deepEqual(await getUserHubs(user), []);
  }
}));
test('G1: /me is current self and identity/membership/reward changes are forbidden', () => withApi(async request => {
  const self = await request('/me?userId=' + id(2), users[0]);
  assert.equal(self.data._id, id(1));
  assert.deepEqual(self.data.hubs, [{ hubId: id(10), membershipVersion: 1 }]);
  for (const body of [{ hubId: id(20) }, { membershipVerified: true }, { membershipStatus: 'active' }, { email: 'bob@b.example.test' }, { college: 'B' }, { auraPoints: 100 }]) {
    assert.equal((await request('/me', users[0], 'PATCH', body)).status, 400);
  }
  assert.equal((await request('/me/assignment/retry', users[2], 'POST', { hubId: id(20) })).status, 400);
}));
test('G1: same-Hub private ownership is still enforced', () => withApi(async request => {
  assert.equal((await request('/users/peer', users[0], 'PUT', { bio: 'foreign write' })).status, 403);
  assert.equal((await request('/users/alice', users[0], 'PUT', { bio: 'own write' })).status, 200);
  assert.equal(users[0].bio, 'own write');
}));
test('G1: authorization ignores display labels, rejects explicit foreign Hub and empty scope', async () => {
  users[0].college = 'B'; users[0].themeTokens = { accent: '#123456' };
  assert.equal((await requireHubAccess(users[0])).hubId, id(10));
  await assert.rejects(requireHubAccess(users[0], id(20)), { status: 403, code: 'HUB_FORBIDDEN' });
  assert.throws(() => scopedFilter({}, {}), { code: 'HUB_REQUIRED' });
  assert.equal(scopedFilter({ hubId: id(10) }, { hubId: id(20) }).hubId, id(10));
});
test('G1: disabled user, Hub or registry immediately removes access', async () => {
  users[0].membershipStatus = 'disabled'; await assert.rejects(requireHubAccess(users[0]), { code: 'HUB_REQUIRED' });
  users[0].membershipStatus = 'active'; hubs[0].status = 'disabled'; await assert.rejects(requireHubAccess(users[0]), { code: 'HUB_REQUIRED' });
  hubs[0].status = 'active'; colleges[0].status = 'disabled'; await assert.rejects(requireHubAccess(users[0]), { code: 'HUB_REQUIRED' });
});
test('G1: stale membership tokens are denied and onboarding tokens contain no Hub', () => withApi(async request => {
  const token = generateToken(users[0]); users[0].membershipVersion += 1;
  assert.equal((await request('/me', users[0], 'GET', undefined, token)).status, 401);
  const claims = verifyToken(generateToken(users[2]));
  assert.equal(claims.hubId, null); assert.deepEqual(claims.scope, ['core:onboarding']);
}));
test('G1: domains normalize exactly; subdomains and suffix lookalikes remain distinct', () => {
  assert.equal(normalizeDomain(' A.Example.Test '), 'a.example.test');
  assert.notEqual(normalizeDomain('sub.a.example.test'), normalizeDomain('a.example.test'));
  assert.notEqual(normalizeDomain('a.example.test.evil.test'), normalizeDomain('a.example.test'));
  assert.equal(normalizeDomain('b\u00fccher.example'), 'xn--bcher-kva.example');
  assert.throws(() => normalizeDomain('a.example.test:443'));
  assert.throws(() => normalizeDomain('a%2eexample.test'));
  assert.throws(() => normalizeDomain('a.example.test/anything'));
});

test('G1: active registry requires confirmed domains and rejects duplicates/unsafe themes', async () => {
  const base = { name: 'Fixture', slug: 'fixture', timezone: 'Asia/Kolkata', status: 'active' };
  await assert.rejects(new College({ ...base, domains: [{ normalizedDomain: 'a.example.test' }] }).validate());
  const domain = { normalizedDomain: 'a.example.test', verifiedAt: new Date(), evidenceRef: 'guard fixture' };
  await assert.rejects(new College({ ...base, domains: [domain, { ...domain, normalizedDomain: 'A.EXAMPLE.TEST' }] }).validate());
  await assert.rejects(new College({ ...base, domains: [domain], themeTokens: { accent: 'url(javascript:bad)' } }).validate());
});
test('G1: OAuth-only identities validate without a password; password identities require one', async () => {
  await new User({ username: 'googlefixture', email: 'g@a.example.test', googleSubject: 'guard-google-sub' }).validate();
  await assert.rejects(new User({ username: 'passwordfixture', email: 'p@a.example.test' }).validate());
});
test('G1: untrusted Google identity claims cannot enter membership assignment', async () => {
  const { OAuth2Client } = require('../../server/node_modules/google-auth-library');
  const original = OAuth2Client.prototype.verifyIdToken;
  const valid = { iss: 'https://accounts.google.com', aud: 'guard-google-client', sub: 'guard-sub', email: 'g@a.example.test', email_verified: true, exp: Math.floor(Date.now() / 1000) + 60 };
  try {
    await withApi(async request => {
      for (const change of [{ iss: 'https://evil.test' }, { aud: 'foreign' }, { exp: 1 }, { email_verified: false }, { sub: '' }]) {
        OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => ({ ...valid, ...change }) });
        assert.equal((await request('/google/auth', undefined, 'POST', { credential: 'isolated-fixture' })).status, 401);
      }
    });
  } finally { OAuth2Client.prototype.verifyIdToken = original; }
});

test('G1: post creation ignores a browser-supplied foreign Hub', () => withApi(async request => {
  let saved;
  patch(Post, 'create', async data => { saved = data; return { ...data, populate: async () => {} }; });
  const response = await request('/posts', users[0], 'POST', { content: 'Own Hub content', hubId: id(20) });
  assert.equal(response.status, 201);
  assert.equal(saved.hubId, id(10));
  assert.equal(saved.author, id(1));
}));
