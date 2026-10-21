const mongoose = require('mongoose');
const Contest = require('../models/Contest'), CalendarEvent = require('../models/CalendarEvent');
const Channel = require('../models/Channel'), Hub = require('../models/Hub');
const provider = require('./providerRefresh');
const { accessError } = require('./hubAccess');
const clist = require('../integrations/clist');
const clistRefresh = provider.createProviderRefresh({provider:'clist',load:clist.fetchContests,enabled:()=>provider.enabled()&&clist.enabled()});
async function contests({ source = 'codeforces', trigger = source==='clist'?clistRefresh.refresh:provider.refresh, now = new Date() } = {}) {
  const row = await Contest.findOne({ provider: source }).maxTimeMS(2000).lean();
  // Request-triggered best effort only. Reading the cache never waits for the network.
  Promise.resolve().then(() => trigger()).catch(() => {});
  const fetchedAt = row?.fetchedAt || null;
  const stale = !!fetchedAt && (!!row.lastError || +now - +fetchedAt >= provider.FRESH_MS);
  return { provider: source==='clist'?'Clist':'Codeforces', sourceUrl: source==='clist'?'https://clist.by':'https://codeforces.com/contests', provenance: row?.provenance || 'provider', fetchedAt, stale,
    status: !fetchedAt ? 'unavailable' : stale ? 'stale' : 'ok', refreshEnabled: provider.enabled()&&(source!=='clist'||clist.enabled()), nextAttemptAt: row?.nextAttemptAt || null,
    items: (row?.items || []).filter(item => +item.endsAt > +now).slice(0, 100).map(({ providerId, title, startsAt, endsAt, url }) => ({ providerId, title, startsAt, endsAt, url })) };
}
async function calendar(context, query = {}, options = {}) {
  const page = require('./calendarQuery').selectors(query, context.hubId, options);
  const channel = await Channel.findOne({ _id: query.channelId, hubId: context.hubId, archivedAt: null }).lean();
  if (!channel) throw accessError(404, 'CHANNEL_NOT_FOUND', 'Channel not found');
  const limit = options.exporting ? 500 : page.limit;
  const rows = await CalendarEvent.find(page.after ? { $and: [page.filter, page.after] } : page.filter).sort({ startsAt: 1, _id: 1 }).limit(limit + 1).maxTimeMS(2000).lean();
  if (options.exporting && rows.length > limit) throw accessError(422, 'EXPORT_RANGE_TOO_LARGE', 'Choose a smaller range to export at most 500 events');
  const items = rows.slice(0, limit).map(row => ({ _id: row._id, title: row.title, startsAt: row.startsAt, endsAt: row.endsAt,
    seededAt: row.seededAt, updatedAt: row.updatedAt || row.seededAt, provenance: row.provenance, allDay: !!row.allDay, status: row.status || 'confirmed',
    sourceRef: row.sourceRef || 'Demonstration sample; not a college announcement', sourceUrl: row.sourceUrl || null,
    version: row.version || 1, timezone: row.timezone || 'Asia/Kolkata', reviewedAt: row.reviewedAt || null,
    past: +row.endsAt <= +(options.now || new Date()) }));
  return { hubId: context.hubId, channelId: channel._id, channelTitle: channel.title, status: 'ok', timezone: 'Asia/Kolkata',
    from: page.from, to: page.to, hasMore: rows.length > limit, nextCursor: rows.length > limit ? page.cursor(rows[limit - 1]) : null, items };
}
async function seedCalendar(entries = require('../config/calendar.seed.json'), { dryRun = false } = {}) {
  if (!Array.isArray(entries) || entries.length > 100) throw new Error('Invalid seed');
  const normalized = entries.map(entry => require('../config/calendarPolicy').validateEntry(entry));
  if (new Set(entries.map(e => e.hubSlug + ':' + e.key)).size !== entries.length) throw new Error('Duplicate calendar import key');
  // Validate Hub/channel references inside the transaction; any invalid entry rolls back the entire batch.
  return mongoose.connection.transaction(async session => {
    for (const [index, entry] of entries.entries()) {
      const hub = await Hub.findOne({ slug: entry.hubSlug, status: 'active' }).session(session);
      if (!hub) throw new Error('Seed Hub not provisioned');
      const channels = await Channel.find({ hubId: hub._id, slug: { $in: entry.channelSlugs }, archivedAt: null }).session(session);
      if (channels.length !== entry.channelSlugs.length) throw new Error('Seed channel missing from Hub');
      const selector = { hubId: hub._id, seedKey: entry.key }, old = await CalendarEvent.findOne(selector).session(session).lean(), data = normalized[index];
      if (old && old.provenance !== data.provenance) throw new Error('Cannot relabel a sample or reviewed event; use a distinct source key');
      if (old?.provenance === 'seeded_fixture' && (+old.startsAt !== +data.startsAt || +old.endsAt !== +data.endsAt)) throw new Error('Sample dates are fixed; never move them to imply freshness');
      if (old?.importHash === data.importHash) continue;
      if (old?.importHash && data.version <= old.version) throw new Error('Changed calendar facts require a higher source version');
      // Retained samples without hashes can only be adopted with their original dates/title.
      if (old && !old.importHash && (old.title !== data.title || +old.startsAt !== +data.startsAt || +old.endsAt !== +data.endsAt)) throw new Error('Retained sample facts cannot be moved during adoption');
      if (!dryRun) await CalendarEvent.updateOne(selector, { $set: { ...data, channelIds: channels.map(c => c._id), updatedAt: new Date() }, $setOnInsert: { seededAt: new Date() } }, { upsert: true, runValidators: true, session });
    }
    return { seeded: dryRun ? 0 : entries.length, validated: entries.length, dryRun };
  });
}
module.exports = { contests, calendar, seedCalendar };
