const { randomUUID, randomBytes, createHash } = require('node:crypto');
const Connection = require('../models/GoogleCalendarConnection');
const Channel = require('../models/Channel');
const CalendarEvent = require('../models/CalendarEvent');
const { requireHubAccess, accessError } = require('./hubAccess');
const oauth = require('./googleCalendarOAuth'), vault = require('./calendarTokenVault');
const { createAdapter } = require('./googleCalendarAdapter');
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (status, code, message) => { throw accessError(status, code, message); };
async function status(context) {
  const row = await Connection.findOne({ userId: context.userId }).lean();
  const same = row && String(row.hubId) === context.hubId && row.membershipVersion === context.membershipVersion;
  return { ...oauth.capability(), state: same ? row.state : 'disconnected', channelId: same ? row.channelId : null,
    lastSyncedAt: same ? row.lastSyncedAt : null, lastError: same ? row.lastError : null };
}
async function start(context, channelId) {
  if (!oauth.capability().available) fail(503, 'CALENDAR_DISABLED', 'Calendar sync is not configured');
  if (!/^[a-f\d]{24}$/i.test(channelId || '') || !await Channel.exists({ _id: channelId, hubId: context.hubId, archivedAt: null })) fail(404, 'CHANNEL_NOT_FOUND', 'Channel not found');
  const old = await Connection.findOne({ userId: context.userId }).lean();
  if (old?.state === 'connected') fail(409, 'CALENDAR_CONNECTED', 'Disconnect the existing calendar first');
  if (old?.nonceExpiresAt > new Date() || old?.leaseUntil > new Date()) fail(409, 'CALENDAR_BUSY', 'A connection is already in progress. Retry in a few minutes');
  const nonce = randomBytes(32).toString('base64url'), generation = randomUUID();
  const filter = old ? { _id: old._id, generation: old.generation, state: old.state, nonceHash: old.nonceHash || { $exists: false }, leaseUntil: { $not: { $gt: new Date() } } } : { userId: context.userId, generation: { $exists: false } };
  const result = await Connection.updateOne(filter, { $set: { userId: context.userId, hubId: context.hubId, channelId, membershipVersion: context.membershipVersion, state: 'pending', generation, nonceHash: digest(nonce), nonceExpiresAt: new Date(Date.now() + 300000), leaseUntil: new Date(0) }, $unset: { tokenCipher: 1, calendarId: 1, lastError: 1, scanAfter: 1, lastSyncedAt: 1 } }, { upsert: !old, runValidators: true });
  if (!result.modifiedCount && !result.upsertedCount) fail(409, 'CALENDAR_BUSY', 'Calendar connection changed; retry');
  return { nonce, clientId: oauth.capability().clientId };
}
async function connect(context, { nonce, code }, origin) {
  if (!oauth.capability().available) fail(503, 'CALENDAR_DISABLED', 'Calendar sync is not configured');
  if (typeof nonce !== 'string' || !/^[\w-]{43}$/.test(nonce) || typeof code !== 'string' || !code || code.length > 4096) fail(400, 'CALENDAR_REQUEST', 'Invalid calendar connection request');
  const row = await Connection.findOneAndUpdate({ userId: context.userId, hubId: context.hubId, membershipVersion: context.membershipVersion, state: 'pending', nonceHash: digest(nonce), nonceExpiresAt: { $gt: new Date() } }, { $unset: { nonceHash: 1 }, $set: { leaseUntil: new Date(Date.now() + 60000) } }, { new: true }).lean();
  if (!row) fail(409, 'CALENDAR_REQUEST_EXPIRED', 'Start a new calendar connection');
  const selector = { _id: row._id, generation: row.generation, state: 'pending' };
  try {
    const tokens = await oauth.exchange(code, origin);
    const adapter = createAdapter(tokens.accessToken, { beforeWrite: async () => {
      const fresh = await requireHubAccess({ sub: context.userId }, context.hubId);
      if (fresh.membershipVersion !== context.membershipVersion || !await Connection.exists(selector)) fail(409, 'CALENDAR_CHANGED', 'Calendar connection changed');
    } });
    const remote = await adapter.createCalendar();
    if (typeof remote.id !== 'string' || !remote.id.endsWith('@group.calendar.google.com')) throw Error('Invalid secondary calendar');
    const result = await Connection.updateOne(selector, { $set: { state: 'connected', calendarId: remote.id, tokenCipher: vault.seal(tokens.refreshToken, row.userId), nextAttemptAt: new Date(), leaseUntil: new Date(0) }, $unset: { nonceExpiresAt: 1 } });
    if (!result.modifiedCount) fail(409, 'CALENDAR_CHANGED', 'Calendar connection changed; the new Google calendar may remain empty');
    return status(context);
  } catch (error) {
    await Connection.updateOne(selector, { $set: { state: 'error', lastError: error.code || 'CALENDAR_CONNECT_FAILED', leaseUntil: new Date(0) }, $unset: { nonceExpiresAt: 1, tokenCipher: 1 } });
    throw error;
  }
}
async function disconnect(context) {
  // Stop future writes and remove the stored credential; retain the user's Google copy.
  await Connection.updateOne({ userId: context.userId }, { $set: { state: 'disconnected', generation: randomUUID() }, $unset: { tokenCipher: 1, nonceHash: 1, nonceExpiresAt: 1, leaseUntil: 1, leaseOwner: 1 } });
  return status(context);
}
async function queue(context) {
  const row = await Connection.findOne({ userId: context.userId, hubId: context.hubId, membershipVersion: context.membershipVersion, state: 'connected' }).lean();
  if (!row) fail(409, 'CALENDAR_NOT_CONNECTED', 'Connect Google Calendar first');
  // A request can advance a stale sync, but cannot continuously bypass rate limiting.
  if (!row.lastError && (!row.lastSyncedAt || Date.now() - +row.lastSyncedAt > 60000)) await Connection.updateOne({ _id: row._id, generation: row.generation }, { $min: { nextAttemptAt: new Date() } });
  return status(context);
}
async function tick() {
  if (!oauth.capability().available) return;
  const leaseOwner = randomUUID();
  const row = await Connection.findOneAndUpdate({ state: 'connected', nextAttemptAt: { $lte: new Date() }, leaseUntil: { $lte: new Date() } }, { $set: { leaseOwner, leaseUntil: new Date(Date.now() + 120000) } }, { new: true, sort: { nextAttemptAt: 1 } }).select('+tokenCipher').lean();
  if (!row) return;
  const selector = { _id: row._id, generation: row.generation, state: 'connected', leaseOwner };
  try {
    const valid = async () => {
      const context = await requireHubAccess({ sub: String(row.userId) }, String(row.hubId));
      if (context.membershipVersion !== row.membershipVersion || !await Channel.exists({ _id: row.channelId, hubId: row.hubId, archivedAt: null })) fail(403, 'CALENDAR_MEMBERSHIP_CHANGED', 'Calendar membership changed');
      if (!await Connection.exists(selector)) fail(409, 'CALENDAR_CHANGED', 'Calendar disconnected');
    };
    await valid();
    const adapter = createAdapter(await oauth.refresh(vault.open(row.tokenCipher, row.userId)), { beforeWrite: valid });
    const events = await CalendarEvent.find({ hubId: row.hubId, channelIds: row.channelId, provenance: 'official_reviewed', ...(row.scanAfter ? { _id: { $gt: row.scanAfter } } : {}) }).sort({ _id: 1 }).limit(51).maxTimeMS(2000).lean();
    const began = Date.now(); let count = 0;
    for (const event of events.slice(0, 50)) {
      if (Date.now() - began > 45000) break;
      await adapter.syncEvent(row.calendarId, event); count++;
      await Connection.updateOne(selector, { $set: { scanAfter: event._id } });
    }
    const more = count < events.length;
    await Connection.updateOne(selector, { $set: { leaseUntil: new Date(0), nextAttemptAt: new Date(Date.now() + (more ? 60000 : 900000)), ...(!more ? { lastSyncedAt: new Date() } : {}) }, $unset: { leaseOwner: 1, lastError: 1, ...(!more ? { scanAfter: 1 } : {}) } });
  } catch (error) {
    const stop = error.status === 403 || error.code === 'GOOGLE_CALENDAR_RECONNECT';
    await Connection.updateOne(selector, { $set: { ...(stop ? { state: 'reconnect' } : {}), lastError: error.code || 'CALENDAR_SYNC_FAILED', leaseUntil: new Date(0), nextAttemptAt: new Date(Date.now() + 900000) }, $unset: { leaseOwner: 1, ...(stop ? { tokenCipher: 1 } : {}) } });
  }
}
function startWorker() {
  let busy = false;
  const run = async () => { if (busy) return; busy = true; try { await tick(); } catch { /* Retry next tick; never log tokens or provider payloads. */ } finally { busy = false; } };
  void run(); const timer = setInterval(run, 60000); timer.unref();
  return () => clearInterval(timer);
}
module.exports = { status, start, connect, disconnect, queue, tick, startWorker };
