const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'g3-disposable-fixture-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.ENABLE_MODULES = '';
require('../../server/node_modules/mongoose').set('autoCreate', false).set('autoIndex', false);
const { createApp } = require('../../server/app');
const { validateEvent, canonicalJson } = require('../../server/services/auraEventService');

test('G3: payload hashing is independent of property order and unsupported/unsafe payloads fail', () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
  for (const value of [null, {}, [], { awardedAura: 99 }]) assert.throws(() => validateEvent(value), { code: 'INVALID_EVENT' });
});

test('G3: event ingestion requires a service credential, never a browser score', async () => {
  const server = createApp({ connection: { readyState: 1 } }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/aura/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ awardedAura: 999 }),
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'SERVICE_AUTH_REQUIRED');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

// Run with GUARD_MONGO_URI pointing ONLY to a disposable replica-set database.
// No .env loading, provider calls, dependency downloads or existing database reset.
test('G3: transactional receipt, caps, principal and recovery boundaries', { skip: !process.env.GUARD_MONGO_URI }, async t => {
  const mongoose = require('../../server/node_modules/mongoose');
  const { randomUUID } = require('node:crypto');
  const { digest, opaque } = require('../../server/services/moduleTokenService');
  const { createAuraEventService } = require('../../server/services/auraEventService');
  const rules = { version: 'fixture-v1', timezone: 'Asia/Kolkata', timezonePolicyVersion: 1,
    types: {
      'arcade.game_completed': { weight: 5, countCap: 3, sourceCap: 30 },
      'interview.completed': { weight: 20, countCap: 2, sourceCap: 60 },
      'learn.quiz_completed': { weight: 5, countCap: 5, sourceCap: 100 },
      'learn.node_mastered': { weight: 15, countCap: 100, sourceCap: 100 },
    } };
  const names = ['College', 'Hub', 'User', 'ModuleGrant', 'ServiceCredential', 'AuraEvent', 'AuraBalance', 'AuraDayCounter', 'DailyActivity'];
  const models = Object.fromEntries(names.map(name => [name, require('../../server/models/' + name)]));
  const dbName = 'collegehubs_demo_g3_' + randomUUID().replaceAll('-', '');
  const uri = new URL(process.env.GUARD_MONGO_URI);
  assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname), 'Guard DB must be local and disposable');
  await mongoose.connect(process.env.GUARD_MONGO_URI, { dbName, serverSelectionTimeoutMS: 3000 });
  let server;
  try {
    await Promise.all(Object.values(models).map(async model => { await model.createCollection(); await model.createIndexes(); }));
    const theme = require('../../server/config/collegeRegistry').config.defaultTheme;
    const college = await models.College.create({ name: 'G3 Fixture', slug: dbName.replaceAll('_', '-'), status: 'active', timezone: 'Asia/Kolkata',
      domains: [{ normalizedDomain: 'g3.example.test', verifiedAt: new Date(), evidenceRef: 'synthetic fixture' }] });
    const hub = await models.Hub.create({ name: college.name, slug: college.slug, collegeId: college.id, themeTokens: theme, themeVersion: 1, timezone: college.timezone });
    const user = await models.User.create({ username: 'g3-user', email: 'g3@g3.example.test', password: opaque(), hubId: hub.id, membershipStatus: 'active', membershipVersion: 1 });
    const keys = {}, credentials = {}, bindings = {};
    const occurredAt = new Date().toISOString();
    for (const source of ['arcade', 'interview', 'learn']) {
      keys[source] = source.padEnd(8, '0') + '.' + opaque();
      credentials[source] = await models.ServiceCredential.create({ service: source, keyId: source.padEnd(8, '0'), keyHash: digest(keys[source]), eventTypes: Object.keys(rules.types).filter(type => type.startsWith(source + '.')) });
      bindings[source] = await models.ModuleGrant.create({ userId: user.id, hubId: hub.id, module: source, grantHash: digest(opaque()), stateHash: digest(opaque()), returnPath: '/' + source, membershipVersion: 1, themeVersion: 1,
        expiresAt: new Date(Date.now() + 60000), consumedAt: new Date(Date.now() - 60000), accessJti: randomUUID(), accessExpiresAt: new Date(Date.now() + 900000), retainUntil: new Date(Date.now() + 30 * 86400000) });
    }
    const event = (source = 'arcade', facts = {}) => {
      const sourceId = randomUUID();
      return { schemaVersion: 1, eventId: source + ':' + sourceId + ':completed:v1', userId: user.id, hubId: hub.id, source,
        type: source === 'arcade' ? 'arcade.game_completed' : source === 'interview' ? 'interview.completed' : 'learn.quiz_completed', value: 1, occurredAt,
        metadata: { sourceId, accessJti: bindings[source].accessJti, domainVersion: 'v1', ...(source === 'arcade' ? { gameId: 'numberguess', rulesVersion: 'v1', outcome: 'success', serverDurationSeconds: 90 }
          : source === 'interview' ? { rawScore: 100, answeredCount: 5, questionCount: 5, serverDurationSeconds: 90, rubricVersion: 'v1' }
          : { nodeId: 'node1', mode: 'checkpoint', attemptId: sourceId, passed: true, correctCount: 4, itemCount: 5, curriculumVersion: 'v1' }), ...facts } };
    };
    const service = createAuraEventService({ rules });
    server = createApp({ auraRules: rules }).listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    const post = async (body, source = body.source, headers = {}) => {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/aura/events', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + keys[source], ...headers }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    };
    await t.test('concurrent identical delivery commits once; changed payload conflicts; semantic aliases cannot farm', async () => {
      const fact = event();
      const results = await Promise.all(Array.from({ length: 5 }, () => post(fact)));
      assert.deepEqual(results.map(r => r.status).sort(), [200, 200, 200, 200, 201]);
      assert.ok(results.every(r => r.body.receipt.awardedAura === 5));
      assert.ok(results.every(r => r.body.receipt.eventId === fact.eventId));
      assert.equal((await post({ ...fact, metadata: { ...fact.metadata, serverDurationSeconds: 91 } })).status, 409);
      const alias = { ...fact, eventId: fact.eventId + ':retry' };
      assert.equal((await post(alias)).body.receipt.eventId, fact.eventId);
      assert.equal((await post({ ...alias, value: 2 })).status, 400);
      assert.equal((await post({ ...alias, metadata: { ...alias.metadata, gameId: 'sorting' } })).status, 409);
      assert.equal((await models.AuraBalance.findOne({ userId: user.id })).engagement, 5);
    });
    await t.test('source/type, Origin, retained principal, Hub and current membership are enforced', async () => {
      assert.equal((await post(event('learn'), 'arcade')).status, 403);
      assert.equal((await post(event(), 'arcade', { Origin: process.env.ALLOWED_ORIGINS })).status, 403);
      for (const change of [{ hubId: new mongoose.Types.ObjectId().toString() }, { userId: new mongoose.Types.ObjectId().toString() }, { hubId: null }]) assert.ok([400, 403].includes((await post({ ...event(), ...change })).status));
      assert.equal((await post(event('arcade', { accessJti: randomUUID() }))).status, 403);
      await models.User.updateOne({ _id: user.id }, { $inc: { membershipVersion: 1 } });
      assert.equal((await post(event())).status, 403);
      await models.User.updateOne({ _id: user.id }, { $set: { membershipVersion: 1 } });
      await models.Hub.updateOne({ _id: hub.id }, { $set: { status: 'disabled' } });
      assert.equal((await post(event())).status, 403);
      await models.Hub.updateOne({ _id: hub.id }, { $set: { status: 'active' } });
      await models.ServiceCredential.updateOne({ _id: credentials.arcade.id }, { $set: { eventTypes: [] } });
      assert.equal((await post(event())).status, 403);
      await models.ServiceCredential.updateOne({ _id: credentials.arcade.id }, { $set: { eventTypes: ['arcade.game_completed'] } });
    });
    await t.test('game/day and concurrent type caps are exact; zero receipts remain terminal', async () => {
      const capped = event();
      const zero = await post(capped);
      assert.equal(zero.body.receipt.awardedAura, 0);
      assert.equal((await post(capped)).body.receipt.receivedAt, zero.body.receipt.receivedAt);
      await post(event('arcade', { gameId: 'mathamplitude' }));
      await post(event('arcade', { gameId: 'sorting' }));
      const interviews = await Promise.all(Array.from({ length: 5 }, () => post(event('interview'))));
      assert.equal(interviews.filter(r => r.body.receipt.awardedAura === 30).length, 2);
      assert.equal(interviews.filter(r => r.body.receipt.awardedAura === 0).length, 3);
      assert.equal((await models.AuraBalance.findOne({ userId: user.id })).engagement, 75);
    });
    await t.test('Learn source budget partially awards the final fact, and all sources share one day', async () => {
      for (let i = 0; i < 8; i++) {
        const fact = event('learn', { sourceId: 'node' + i + ':v1', nodeId: 'node' + i, curriculumVersion: 'v1', masteryMethod: 'checkpoint' });
        fact.type = 'learn.node_mastered';
        for (const key of ['mode', 'attemptId', 'passed', 'correctCount', 'itemCount']) delete fact.metadata[key];
        const result = await post(fact);
        assert.equal(result.body.receipt.awardedAura, i < 6 ? 15 : i === 6 ? 10 : 0);
      }
      assert.equal(await models.DailyActivity.countDocuments({ userId: user.id }), 1);
      assert.deepEqual((await models.DailyActivity.findOne({ userId: user.id })).qualifyingSources.sort(), ['arcade', 'interview', 'learn']);
      assert.equal((await models.AuraBalance.findOne({ userId: user.id })).engagement, 175);
    });
    await t.test('external replacement preserves engagement, including concurrent replacements', async () => {
      const principal = { userId: user.id, hubId: hub.id };
      await service.replaceExternalBonus(principal, 70);
      let balance = await models.AuraBalance.findOne(principal);
      assert.equal(balance.engagement, 175); assert.equal(balance.total, 245);
      await service.replaceExternalBonus(principal, 90);
      balance = await models.AuraBalance.findOne(principal);
      assert.equal(balance.engagement, 175); assert.equal(balance.total, 265);
      await Promise.all([service.replaceExternalBonus(principal, 70), service.replaceExternalBonus(principal, 90)]);
      balance = await models.AuraBalance.findOne(principal);
      assert.equal(balance.total, balance.engagement + balance.externalBonus);
    });
    await t.test('expired access permits late delivery within binding, while old/future/unissued facts fail', async () => {
      await models.ModuleGrant.updateOne({ _id: bindings.arcade.id }, { $set: { accessExpiresAt: new Date(Date.now() - 1000) } });
      const past = { ...event(), occurredAt: new Date(Date.now() - 2000).toISOString() };
      assert.equal((await post(past)).status, 201);
      assert.equal((await post(event())).status, 403);
      assert.equal((await post({ ...event(), occurredAt: new Date(Date.now() + 60000).toISOString() })).status, 400);
      assert.equal((await post({ ...past, eventId: past.eventId + ':old', occurredAt: new Date(Date.now() - 31 * 86400000).toISOString() })).status, 400);
      await models.ModuleGrant.updateOne({ _id: bindings.arcade.id }, { $set: { retainUntil: new Date(Date.now() - 1000) } });
      assert.equal((await post(past)).status, 403);
    });
    await t.test('invalid facts, browser award fields, deferred types and disabled rules fail closed', async () => {
      for (const facts of [{ rawScore: 101 }, { answeredCount: 6 }, { serverDurationSeconds: -1 }, { rawScore: '100' }, { resumeText: 'private' }]) assert.equal((await post(event('interview', facts))).status, 400);
      assert.equal((await post({ ...event('interview'), awardedAura: 100 })).status, 400);
      assert.equal((await post({ ...event('learn'), type: 'learn.path_completed' })).status, 400);
      await assert.rejects(createAuraEventService().ingest(credentials.interview, event('interview')), { code: 'AURA_RULES_INACTIVE' });
      await assert.rejects(createAuraEventService().replaceExternalBonus({ userId: user.id, hubId: hub.id }, 70), { code: 'EXTERNAL_BONUS_DISABLED' });
    });
    await t.test('a transaction failure rolls back receipt, day and balance together', async () => {
      const fact = event('learn', { nodeId: 'rollback', attemptId: 'rollback', sourceId: 'rollback' });
      const before = await models.AuraEvent.countDocuments();
      const original = models.AuraBalance.updateOne;
      models.AuraBalance.updateOne = async () => { throw new Error('injected storage failure'); };
      try { assert.equal((await post(fact)).status, 503); }
      finally { models.AuraBalance.updateOne = original; }
      assert.equal(await models.AuraEvent.countDocuments(), before);
      assert.equal((await post(fact)).status, 201);
    });
    await t.test('malformed JSON and oversized bodies use bounded contract errors; throttling supplies Retry-After', async () => {
      const url = 'http://127.0.0.1:' + server.address().port + '/api/aura/events';
      for (const [body, status] of [['{broken', 400], [JSON.stringify({ text: 'x'.repeat(66000) }), 413]]) {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        assert.equal(response.status, status); assert.equal((await response.json()).error.retryable, false);
      }
      let limited;
      for (let i = 0; i <= 120; i++) {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + keys.interview }, body: '{}' });
        if (response.status === 429) { limited = response; break; }
      }
      assert.ok(limited); assert.ok(Number(limited.headers.get('Retry-After')) > 0);
      assert.equal((await limited.json()).error.retryable, true);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    // Only this guard's generated database can be dropped.
    if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
