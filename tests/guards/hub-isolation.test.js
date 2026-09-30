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
const Channel = require('../../server/models/Channel');
const { generateToken, verifyToken } = require('../../server/config/auth');
const { getUserHubs, requireHubAccess, scopedFilter } = require('../../server/services/hubAccess');
const { normalizeDomain } = require('../../server/config/collegeRegistry');

const id = value => value.toString(16).padStart(24, '0');

test('G1: Learn session ownership denies foreign, missing-Hub and expired rows', () => {
  const { authorizeSession } = require('../../MargaAI-master/src/lib/sessionBoundary.cjs');
  const row = { user_id: id(1), hub_id: id(10), expires_at: new Date((Math.floor(Date.now() / 1000) + 60) * 1000), principal: { sub: id(1), hubId: id(10), exp: Math.floor(Date.now() / 1000) + 60 } };
  assert.ok(authorizeSession(row, { userId: id(1), hubId: id(10) }));
  for (const owner of [{ userId: id(2), hubId: id(10) }, { userId: id(1), hubId: id(20) }]) assert.throws(() => authorizeSession(row, owner));
  assert.throws(() => authorizeSession({ ...row, hub_id: null }));
  assert.throws(() => authorizeSession({ ...row, expires_at: new Date(0) }));
});

test('G1: a signed Core user cannot submit module events for either Hub', async () => {
  await withApi(async request => {
    const response = await request('/aura/events', users[0], 'POST', { userId: id(2), hubId: id(20), awardedAura: 100 });
    assert.equal(response.status, 401);
  });
});
let users, hubs, colleges, posts, restores;
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(row, part));
    const actual = row[key] instanceof Date ? row[key].getTime() : row[key];
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.entries(value).every(([op, expected]) => {
        expected = expected instanceof Date ? expected.getTime() : expected;
        return op === '$lt' ? actual < expected : op === '$gt' ? actual > expected : false;
      });
    }
    return String(actual) === String(value instanceof Date ? value.getTime() : value);
  });
}
function query(value) {
  return { select() { return this; }, sort(order) {
    if (Array.isArray(value)) value.sort((a, b) => {
      for (const [key, direction] of Object.entries(order)) {
        if (a[key] < b[key]) return -direction;
        if (a[key] > b[key]) return direction;
      }
      return 0;
    });
    return this;
  }, limit(count) { if (Array.isArray(value)) value = value.slice(0, count); return this; },
    populate(options) {
      if (options.path === 'author') {
        const populate = row => row && row.author ? { ...row, author: users.filter(user => matches(user, options.match)).find(user => user._id === String(row.author)) || null } : row;
        value = Array.isArray(value) ? value.map(populate) : populate(value);
      }
      return this;
    }, exec: async () => value,
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
  users.forEach(user => { user.auraPoints = 0; });
  colleges = [{ _id: id(100), status: 'active' }, { _id: id(200), status: 'active' }];
  posts = [{ _id: id(30), hubId: id(10), likes: [] }, { _id: id(40), hubId: id(20), likes: [] }, { _id: id(50), likes: [] }];
  for (const post of posts) { post.save = async () => post; post.populate = async () => post; }
  posts.forEach(post => { post.createdAt = new Date('2026-09-29T00:00:00Z'); });
  patch(User, 'findById', value => query(users.find(user => user._id === String(value)) || null));
  patch(User, 'findOne', filter => query(users.find(user => matches(user, filter)) || null));
  patch(User, 'find', filter => query(users.filter(user => matches(user, filter))));
  patch(User, 'countDocuments', filter => Promise.resolve(users.filter(user => matches(user, filter)).length));
  patch(Channel, 'find', filter => query([
    { _id: id(60), hubId: id(10), slug: 'dsa', title: 'DSA', kind: 'subject', archivedAt: null, nextMessageSeq: 9 },
    { _id: id(70), hubId: id(20), slug: 'dsa', title: 'Foreign', kind: 'subject', archivedAt: null },
  ].filter(row => matches(row, filter))));
  patch(User, 'findByIdAndUpdate', (value, update) => { const user = users.find(item => item._id === String(value)); Object.assign(user, update.$set); return query(user); });
  patch(Hub, 'findOne', filter => query(hubs.find(hub => matches(hub, filter)) || null));
  patch(College, 'exists', filter => query(colleges.find(college => matches(college, filter)) || null));
  patch(Post, 'find', filter => query(posts.filter(post => matches(post, filter))));
  patch(Post, 'findOne', filter => query(posts.find(post => matches(post, filter)) || null));
  patch(Post, 'findOneAndUpdate', (filter, update) => {
    const post = posts.find(row => matches(row, filter));
    if (post) {
      if (update.$addToSet && !post.likes.includes(update.$addToSet.likes)) post.likes.push(update.$addToSet.likes);
      if (update.$pull) post.likes = post.likes.filter(value => value !== update.$pull.likes);
    }
    return query(post || null);
  });
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
test('G1: module handoff requires current active Hub membership', () => withApi(async request => {
  for (const user of [users[2], users[3]]) {
    assert.equal((await request('/auth/module-grants', user, 'POST', { module: 'arcade', state: 'fixture', returnPath: '/arcade' })).status, 403);
  }
}));
test('G1: invalid pagination must fail closed without returning tenant rows', () => withApi(async request => {
  assert.equal((await request('/posts?cursor=forged', users[0])).status, 400);
  assert.equal((await request('/posts?limit=51', users[0])).status, 400);
  assert.equal((await request('/users/leaderboard?cursor=forged', users[0])).status, 400);
}));
test('G1: scoped pages remain stable across ties and reject other-Hub/resource cursors', () => withApi(async request => {
  const date = new Date('2026-09-29T00:00:00Z');
  posts.unshift({ _id: id(29), hubId: id(20), createdAt: new Date('2026-09-30'), likes: [] });
  posts.push({ _id: id(31), hubId: id(10), createdAt: date, likes: [] });
  const first = await request('/posts?limit=1', users[0]);
  assert.deepEqual(first.data.items.map(row => row._id), [id(30)]);
  assert.ok(first.data.nextCursor);
  const next = await request('/posts?limit=1&cursor=' + first.data.nextCursor, users[0]);
  assert.deepEqual(next.data.items.map(row => row._id), [id(31)]);
  assert.equal(next.data.nextCursor, null);
  assert.equal((await request('/posts?cursor=' + first.data.nextCursor, users[1])).status, 400);
  assert.equal((await request('/users/leaderboard?cursor=' + first.data.nextCursor, users[0])).status, 400);
  const rank = await request('/users/leaderboard?limit=1', users[4]);
  assert.equal(rank.data.ownRank.rank, 2);
  assert.equal(rank.data.items[0].username, 'alice');
  const rankNext = await request('/users/leaderboard?cursor=' + rank.data.nextCursor, users[4]);
  assert.deepEqual(rankNext.data.items.map(row => [row.username, row.rank]), [['peer', 2]]);
  assert.equal((await request('/users/leaderboard?cursor=' + rank.data.nextCursor, users[1])).status, 400);
}));
test('G1: own rank counts only this Hub even outside the first fifty', () => withApi(async request => {
  for (let index = 0; index < 55; index++) users.push({ _id: id(500 + index), username: 'rank' + index, hubId: id(10), membershipStatus: 'active', auraPoints: 10 });
  users[1].auraPoints = 999;
  const response = await request('/users/leaderboard?limit=50', users[0]);
  assert.equal(response.data.items.length, 50);
  assert.equal(response.data.ownRank.rank, 56);
  assert.ok(response.data.items.every(row => row.username !== 'bob'));
}));
test('G1: themes/channels are scoped, allowlisted DTOs; labels never change membership', () => withApi(async request => {
  const { config } = require('../../server/config/collegeRegistry');
  hubs[0].themeTokens = { ...config.defaultTheme }; hubs[0].themeVersion = 2;
  hubs[0].name = '<script>literal name</script>'; hubs[0].logoUrl = 'https://unapproved.example/logo.svg';
  users[0].college = 'B iiit iit'; hubs[0].verifiedEmailDomains = ['private.example.test'];
  assert.equal((await request('/hubs/' + id(20) + '/theme', users[0])).status, 403);
  assert.equal((await request('/hubs/' + id(20) + '/channels', users[0])).status, 403);
  assert.equal((await request('/me/hub', users[2])).status, 403);
  const theme = await request('/me/hub', users[0]);
  assert.equal(theme.data.hubId, id(10)); assert.equal(theme.data.themeVersion, 2);
  assert.equal(theme.data.logoUrl, null);
  assert.equal(Object.hasOwn(theme.data, 'verifiedEmailDomains'), false);
  assert.deepEqual(theme.data.tokens, config.defaultTheme);
  hubs[0].themeTokens = { ...config.defaultTheme, accent: 'url(javascript:bad)', extra: 'injection' };
  assert.deepEqual((await request('/hubs/' + id(10) + '/theme', users[0])).data.tokens, config.defaultTheme);
  const channels = await request('/hubs/' + id(10) + '/channels', users[0]);
  assert.deepEqual(channels.data.items.map(row => row._id), [id(60)]);
  assert.equal(Object.hasOwn(channels.data.items[0], 'nextMessageSeq'), false);
}));
test('G1: retries are idempotent and foreign unlikes cannot mutate a post', () => withApi(async request => {
  const url = '/posts/' + id(30) + '/like';
  await request(url, users[0], 'PUT'); await request(url, users[0], 'PUT');
  assert.deepEqual(posts[0].likes, [id(1)]);
  assert.equal((await request(url, users[1], 'DELETE')).status, 404);
  assert.deepEqual(posts[0].likes, [id(1)]);
  await request(url, users[0], 'DELETE'); await request(url, users[0], 'DELETE');
  assert.deepEqual(posts[0].likes, []);
}));
test('G1: author population cannot expose a foreign or unassigned profile', () => withApi(async request => {
  posts[0].author = users[1]._id;
  assert.equal((await request('/posts', users[0])).data.items[0].author, null);
  posts[0].author = users[3]._id;
  assert.equal((await request('/posts', users[0])).data.items[0].author, null);
  assert.equal((await request('/posts/' + id(30) + '/like', users[0], 'PUT')).data.author, null);
}));
test('G1: other-Hub and missing-Hub posts never appear, including a forged query Hub', () => withApi(async request => {
  const response = await request('/posts?hubId=' + id(20), users[0]);
  assert.equal(response.status, 200);
  assert.deepEqual(response.data.items.map(post => post._id), [id(30)]);
}));
test('G1: profiles and rankings hide foreign and missing-Hub users', () => withApi(async request => {
  assert.equal((await request('/users/bob', users[0])).status, 404);
  assert.equal((await request('/users/legacy', users[0])).status, 404);
  const response = await request('/users/leaderboard', users[0]);
  assert.deepEqual(response.data.items.map(user => user.username), ['alice', 'peer']);
  assert.ok(response.data.items.every(user => !Object.hasOwn(user, 'email')));
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
