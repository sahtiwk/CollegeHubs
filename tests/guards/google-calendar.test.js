const test = require('node:test');
const assert = require('node:assert/strict');
const { eventBody, createAdapter } = require('../../services/core/services/googleCalendarAdapter');
const calendar = 'fixture@group.calendar.google.com';
const source = { _id: 'a'.repeat(24), hubId: 'b'.repeat(24), title: 'Official examination window', sourceRef: 'Reviewed test source', sourceUrl: 'https://example.test/circular', version: 1, provenance: 'official_reviewed', timezone: 'Asia/Kolkata', allDay: true, startsAt: '2026-10-22T00:00:00+05:30', endsAt: '2026-10-29T00:00:00+05:30' };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
test('calendar token vault authenticates ciphertext and its account binding', () => {
  const vault=require('../../services/core/services/calendarTokenVault'),old=process.env.GOOGLE_CALENDAR_TOKEN_KEY;
  process.env.GOOGLE_CALENDAR_TOKEN_KEY='a'.repeat(64);
  try {
    const sealed=vault.seal('fixture-token','owner-a');assert.equal(vault.open(sealed,'owner-a'),'fixture-token');
    assert.throws(()=>vault.open(sealed,'owner-b'));assert.throws(()=>vault.open(sealed.replace(/^./,sealed[0]==='A'?'B':'A'),'owner-a'));
    assert.notEqual(sealed,vault.seal('fixture-token','owner-a'));
  } finally { if(old===undefined)delete process.env.GOOGLE_CALENDAR_TOKEN_KEY;else process.env.GOOGLE_CALENDAR_TOKEN_KEY=old; }
});
test('calendar sync: reviewed dates, stable IDs and no guests or notifications', () => {
  const body = eventBody(source);
  assert.equal(body.start.date, '2026-10-22'); assert.equal(body.end.date, '2026-10-29');
  assert.match(body.id, /^[0-9a-v]{5,1024}$/);
  assert.equal(eventBody({ ...source, version: 2, title: 'Changed' }).id, body.id);
  assert.notEqual(eventBody({ ...source, hubId: 'c'.repeat(24) }).id, body.id);
  assert.equal(body.attendees, undefined); assert.equal(body.reminders.useDefault, false);
  assert.throws(() => eventBody({ ...source, provenance: 'seeded_fixture' }), { code: 'CALENDAR_SOURCE_UNREVIEWED' });
});
test('calendar sync: retries after lost insert response reuse stable ID', async () => {
  const body = eventBody(source), calls = [];
  const adapter = createAdapter('test-only-token', { fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? response({}, 404) : calls.length === 2 ? response({}, 409) : response({ ...body, etag: 'v1' });
  } });
  assert.equal(await adapter.syncEvent(calendar, source), 'unchanged');
  assert.deepEqual(calls.map(c => c.options.method), ['GET', 'POST', 'GET']);
  assert.equal(JSON.parse(calls[1].options.body).id, body.id);
});
test('calendar sync: changes and cancellations use conditional updates', async () => {
  for (const change of [{ title: 'New dates', version: 2 }, { status: 'cancelled', version: 2 }]) {
    const calls = [], original = eventBody(source);
    const adapter = createAdapter('test-only-token', { fetchImpl: async (url, options) => {
      calls.push(options); return response(options.method === 'GET' ? { ...original, etag: 'original-etag' } : {});
    } });
    assert.equal(await adapter.syncEvent(calendar, { ...source, ...change }), change.status ? 'cancelled' : 'updated');
    assert.equal(calls[1].headers['If-Match'], 'original-etag');
    assert.equal(JSON.parse(calls[1].body).status, change.status || 'confirmed');
  }
});
test('calendar sync: reject personal targets, foreign events and stale source versions', async () => {
  for (const remote of [{ ...eventBody(source), extendedProperties: {} }, eventBody({ ...source, version: 3 })]) {
    let writes = 0;
    const adapter = createAdapter('test-only-token', { fetchImpl: async (url, options) => { if (options.method !== 'GET') writes++; return response({ ...remote, etag: 'v3' }); } });
    await assert.rejects(adapter.syncEvent('primary', source), { code: 'GOOGLE_CALENDAR_TARGET' });
    await assert.rejects(adapter.syncEvent(calendar, source), { status: 409 });
    assert.equal(writes, 0);
  }
});
test('calendar sync: access loss before write stops mutation; rate limits are not retried', async () => {
  let calls = 0;
  const adapter = createAdapter('test-only-token', { beforeWrite: async () => { throw Error('Disconnected'); }, fetchImpl: async () => { calls++; return response({}, 404); } });
  await assert.rejects(adapter.syncEvent(calendar, source), /Disconnected/); assert.equal(calls, 1);
  const limited = createAdapter('test-only-token', { fetchImpl: async () => response({ privateData: 'must not appear' }, 429) });
  await assert.rejects(limited.syncEvent(calendar, source), error => error.code === 'GOOGLE_CALENDAR_RATE_LIMIT' && !error.message.includes('privateData'));
});
