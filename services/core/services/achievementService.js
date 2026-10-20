const mongoose = require('mongoose');
const config = require('../config/achievements');
// Also used by the resumable migration. Every query is owner-scoped and time bounded.
async function project(db, owner, session) {
  const options = { ...(session ? { session } : {}), maxTimeMS: 3000 };
  const awards = [];
  const add = (badgeId, rows, dateField, evidence) => {
    if (rows.length) awards.push({ ...owner, badgeId, policyVersion: config.version,
      earnedAt: new Date(Math.max(...rows.map(row => new Date(row[dateField]).getTime()))),
      recordedAt: new Date(), evidence: rows.map(evidence) });
  };
  const facts = db.collection('nativefacts');
  const first = await facts.find({ ...owner, type: { $in: ['code.shared','resource.shared','answer.accepted','study.completed'] } }, options).sort({ occurredAt: 1, _id: 1 }).limit(1).toArray();
  add('first-contribution', first, 'occurredAt', row => 'native:' + row.eventId);
  const study = await facts.find({ ...owner, type: 'study.completed' }, options).sort({ occurredAt: 1, _id: 1 }).limit(1).toArray();
  add('study-partner', study, 'occurredAt', row => 'native:' + row.eventId);
  const days = await db.collection('dailyactivities').find({ ...owner, timezonePolicyVersion: 1 }, options).sort({ dayKey: 1 }).limit(7).toArray();
  if (days.length === 7) add('consistent-learner', days, 'firstOccurredAt', row => 'day:' + row.dayKey);
  const nodes = await db.collection('auraevents').aggregate([
    { $match: { ...owner, canonical: true, type: 'learn.node_mastered', policyReason: { $in: ['awarded','partial_source_cap','source_cap','daily_count_cap'] }, 'metadata.nodeId': { $type: 'string' } } },
    { $sort: { occurredAt: 1, _id: 1 } },
    { $group: { _id: '$metadata.nodeId', occurredAt: { $first: '$occurredAt' }, eventId: { $first: '$eventId' } } },
    { $sort: { occurredAt: 1, _id: 1 } }, { $limit: 3 },
  ], options).toArray();
  if (nodes.length === 3) add('academic-explorer', nodes, 'occurredAt', row => 'event:' + row.eventId);
  for (const award of awards) {
    try { await db.collection('achievementawards').updateOne({ userId: owner.userId, badgeId: award.badgeId }, { $setOnInsert: award }, { ...options, upsert: true }); }
    catch (error) { if (session || error.code !== 11000) throw error; } // Concurrent read projection already inserted the same immutable badge.
  }
}
async function read(context) {
  const owner = { hubId: new mongoose.Types.ObjectId(context.hubId), userId: new mongoose.Types.ObjectId(context.userId) };
  await project(mongoose.connection.db, owner);
  const rows = await mongoose.connection.db.collection('achievementawards').find(owner).limit(config.badges.length).toArray();
  return config.badges.map(badge => { const row = rows.find(item => item.badgeId === badge.id); return { ...badge, earned: !!row, earnedAt: row?.earnedAt || null, recordedAt: row?.recordedAt || null, policyVersion: config.version }; });
}
module.exports = { project, read };
