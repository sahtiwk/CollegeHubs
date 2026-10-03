const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const payload = { status: 'OK', result: [{ id: 2201, name: 'Recorded schedule fixture', phase: 'BEFORE', startTimeSeconds: 1791801000, durationSeconds: 7200 }] };

test('G3: schedule normalization rejects unsafe data and deduplicates provider IDs', () => {
  const { normalize } = require('../../services/core/integrations/codeforces');
  const rows = normalize({ ...payload, result: [...payload.result, ...payload.result] });
  assert.equal(rows.length, 1); assert.equal(rows[0].providerId, '2201');
  assert.equal(rows[0].url, 'https://codeforces.com/contest/2201');
  assert.throws(() => normalize({ status: 'FAILED' }));
  for (const field of [{ id: -1 }, { startTimeSeconds: Infinity }, { durationSeconds: -1 }, { name: '' }]) assert.throws(() => normalize({ status: 'OK', result: [{ ...payload.result[0], ...field }] }));
});
test('G3: schedule transport bounds deadlines, redirects and response bytes', async () => {
  const { fetchContests } = require('../../services/core/integrations/codeforces');
  assert.equal((await fetchContests({ fetcher: async () => new Response(JSON.stringify(payload)), timeoutMs: 100 })).length, 1);
  await assert.rejects(fetchContests({ fetcher: async () => new Response('x'.repeat(101)), maxBytes: 100 }));
  await assert.rejects(fetchContests({ fetcher: async () => new Response('', { status: 302 }) }));
  await assert.rejects(fetchContests({ fetcher: async () => new Promise(() => {}), timeoutMs: 25 }), /timeout/);
});
test('G1/G3: persisted schedules and scoped academic seeds survive provider failure', { skip: !process.env.GUARD_MONGO_URI }, async t => {
  const mongoose = require('mongoose'); const uri = new URL(process.env.GUARD_MONGO_URI);
  assert.ok(['localhost', '127.0.0.1'].includes(uri.hostname));
  const dbName = 'collegehubs_demo_schedule_' + randomUUID().replaceAll('-', '');
  await mongoose.connect(process.env.GUARD_MONGO_URI, { dbName });
  const Contest = require('../../services/core/models/Contest');
  const CalendarEvent = require('../../services/core/models/CalendarEvent');
  const Hub = require('../../services/core/models/Hub'), Channel = require('../../services/core/models/Channel');
  const { createProviderRefresh } = require('../../services/core/services/providerRefresh');
  const schedule = require('../../services/core/services/scheduleService');
  try {
    await Promise.all([Contest, CalendarEvent, Hub, Channel].map(m => m.init()));
    const hubId = new mongoose.Types.ObjectId(), other = new mongoose.Types.ObjectId();
    await Hub.collection.insertMany([{ _id: hubId, hubId, collegeId: new mongoose.Types.ObjectId(), slug: 'schedule-home', status: 'active' }, { _id: other, hubId: other, collegeId: new mongoose.Types.ObjectId(), slug: 'schedule-other', status: 'active' }]);
    const channel = await Channel.create({ hubId, slug: 'dsa', title: 'DSA', defaultSetVersion: 1 });
    const foreign = await Channel.create({ hubId: other, slug: 'dsa', title: 'Other DSA', defaultSetVersion: 1 });
    const unused = await Channel.create({ hubId, slug: 'web', title: 'Web', defaultSetVersion: 1 });
    const seed = [{ key: 'practice-v1', hubSlug: 'schedule-home', channelSlugs: ['dsa'], title: 'Sample academic event', startsAt: '2026-10-12T10:00:00Z', endsAt: '2026-10-12T11:00:00Z', provenance: 'seeded_fixture' }];
    await t.test('same-Hub seed is idempotent; channel selectors and foreign references are fenced', async () => {
      await schedule.seedCalendar(seed); await schedule.seedCalendar(seed);
      assert.equal(await CalendarEvent.countDocuments(), 1);
      assert.equal((await schedule.calendar({ hubId: String(hubId) }, { channelId: channel.id })).items.length, 1);
      assert.equal((await schedule.calendar({ hubId: String(hubId) }, { channelId: unused.id })).items.length, 0);
      await assert.rejects(schedule.calendar({ hubId: String(hubId) }, { channelId: foreign.id }), { status: 404 });
      await assert.rejects(schedule.calendar({ hubId: String(hubId) }, { userId: 'spoof' }), { status: 400 });
      await assert.rejects(schedule.seedCalendar([{ ...seed[0], key: 'bad', channelSlugs: ['missing'] }]));
      assert.equal(await CalendarEvent.countDocuments(), 1);
    });
    await t.test('first fetch failure is unavailable with no fabricated date; cooldown is durable', async () => {
      let calls = 0; const failed = createProviderRefresh({ load: async () => { calls++; throw Error('timeout'); }, enabled: () => true });
      await failed.refresh(); const row = await Contest.findOne();
      assert.equal(row.fetchedAt, null); assert.equal(row.items.length, 0);
      assert.equal((await schedule.contests({ trigger: () => {} })).status, 'unavailable');
      await failed.refresh(); assert.equal(calls, 1);
    });
    await t.test('concurrent refreshers share one lease; stale failures preserve last-good cache and timestamp', async () => {
      await Contest.updateOne({}, { $set: { nextAttemptAt: new Date(0) } });
      let calls = 0; const rows = require('../../services/core/integrations/codeforces').normalize(payload);
      const load = async () => { calls++; await new Promise(r => setTimeout(r, 20)); return rows; };
      const a = createProviderRefresh({ load, enabled: () => true }), b = createProviderRefresh({ load, enabled: () => true });
      await Promise.all([a.refresh(), b.refresh(), a.refresh()]); assert.equal(calls, 1);
      const before = await Contest.findOne(); assert.ok(before.fetchedAt);
      await Contest.updateOne({}, { $set: { nextAttemptAt: new Date(0) } });
      await createProviderRefresh({ load: async () => { throw Error('timeout'); }, enabled: () => true }).refresh();
      const after = await Contest.findOne(); assert.equal(+after.fetchedAt, +before.fetchedAt); assert.deepEqual(after.items.toObject(), before.items.toObject());
      const result = await schedule.contests({ trigger: () => {}, now: new Date('2026-10-03') });
      assert.equal(result.status, 'stale'); assert.equal(result.stale, true);
      let disabledCalls = 0; await createProviderRefresh({ load: async () => { disabledCalls++; }, enabled: () => false }).refresh(); assert.equal(disabledCalls, 0);
    });
    await t.test('cache read returns before provider settles; past contests are omitted without changing fetchedAt', async () => {
      let started = false;
      const result = await schedule.contests({ trigger: () => { started = true; return new Promise(() => {}); }, now: new Date('2027-01-01') });
      assert.equal(started, true); assert.equal(result.items.length, 0); assert.ok(result.fetchedAt);
    });
  } finally { if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});
