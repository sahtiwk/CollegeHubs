const mongoose = require('mongoose');
const Contest = require('../models/Contest'), CalendarEvent = require('../models/CalendarEvent');
const Channel = require('../models/Channel'), Hub = require('../models/Hub');
const provider = require('./providerRefresh');
const { accessError } = require('./hubAccess');
const invalid = () => accessError(400, 'INVALID_QUERY', 'Invalid calendar selector');
async function contests({ trigger = provider.refresh, now = new Date() } = {}) {
  const row = await Contest.findOne({ provider: 'codeforces' }).maxTimeMS(2000).lean();
  // Request-triggered best effort only. Reading the cache never waits for the network.
  Promise.resolve().then(() => trigger()).catch(() => {});
  const fetchedAt = row?.fetchedAt || null;
  const stale = !!fetchedAt && (!!row.lastError || +now - +fetchedAt >= provider.FRESH_MS);
  return { provider: 'Codeforces', sourceUrl: 'https://codeforces.com/contests', provenance: row?.provenance || 'provider', fetchedAt, stale,
    status: !fetchedAt ? 'unavailable' : stale ? 'stale' : 'ok', refreshEnabled: provider.enabled(), nextAttemptAt: row?.nextAttemptAt || null,
    items: (row?.items || []).filter(item => +item.endsAt > +now).slice(0, 100).map(({ providerId, title, startsAt, endsAt, url }) => ({ providerId, title, startsAt, endsAt, url })) };
}
async function calendar(context, query = {}) {
  if (Object.keys(query).some(key => key !== 'channelId') || typeof query.channelId !== 'string' || !/^[a-f0-9]{24}$/i.test(query.channelId)) throw invalid();
  const channel = await Channel.findOne({ _id: query.channelId, hubId: context.hubId, archivedAt: null }).lean();
  if (!channel) throw accessError(404, 'CHANNEL_NOT_FOUND', 'Channel not found');
  const rows = await CalendarEvent.find({ hubId: context.hubId, channelIds: channel._id }).sort({ startsAt: 1, _id: 1 }).limit(101).maxTimeMS(2000).lean();
  return { hubId: context.hubId, channelId: channel._id, status: 'ok', fetchedAt: null, stale: false, provenance: 'seeded_fixture', timezone: 'Asia/Kolkata', hasMore: rows.length > 100,
    items: rows.slice(0, 100).map(({ _id, title, startsAt, endsAt, seededAt, provenance }) => ({ _id, title, startsAt, endsAt, seededAt, provenance })) };
}
async function seedCalendar(entries = require('../config/calendar.seed.json')) {
  if (!Array.isArray(entries) || entries.length > 100) throw new Error('Invalid seed');
  // Validate Hub/channel references inside the transaction; any invalid entry rolls back the entire batch.
  return mongoose.connection.transaction(async session => {
    for (const entry of entries) {
      if (!entry || typeof entry.key !== 'string' || !/^[a-z0-9-]{1,80}$/.test(entry.key) || typeof entry.title !== 'string' || !entry.title.trim() || entry.title.length > 200 || entry.provenance !== 'seeded_fixture' ||
        typeof entry.hubSlug !== 'string' || !Array.isArray(entry.channelSlugs) || !entry.channelSlugs.length || entry.channelSlugs.some(slug => typeof slug !== 'string') || new Set(entry.channelSlugs).size !== entry.channelSlugs.length ||
        !Number.isFinite(Date.parse(entry.startsAt)) || !Number.isFinite(Date.parse(entry.endsAt)) || Date.parse(entry.endsAt) <= Date.parse(entry.startsAt)) throw new Error('Invalid calendar seed');
      const hub = await Hub.findOne({ slug: entry.hubSlug, status: 'active' }).session(session);
      if (!hub) throw new Error('Seed Hub not provisioned');
      const channels = await Channel.find({ hubId: hub._id, slug: { $in: entry.channelSlugs }, archivedAt: null }).session(session);
      if (channels.length !== entry.channelSlugs.length) throw new Error('Seed channel missing from Hub');
      await CalendarEvent.updateOne({ hubId: hub._id, seedKey: entry.key }, { $set: { channelIds: channels.map(c => c._id), title: entry.title, startsAt: new Date(entry.startsAt), endsAt: new Date(entry.endsAt), provenance: entry.provenance }, $setOnInsert: { seededAt: new Date() } }, { upsert: true, runValidators: true, session });
    }
    return { seeded: entries.length };
  });
}
module.exports = { contests, calendar, seedCalendar };
