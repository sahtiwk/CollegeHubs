const mongoose = require('mongoose');
const User = require('../models/User');
const Balance = require('../models/AuraBalance');
const Event = require('../models/AuraEvent');
const NativeFact = require('../models/NativeFact');
const Solution = require('../models/StudySolution');
const RuleSet = require('../models/AuraRuleSet');
const streak = require('./streakService');
const { pageInput, cursorFor } = require('../utils/pagination');
const { accessError } = require('./hubAccess');
const only = (query, fields) => { if (Object.keys(query).some(key => !fields.includes(key))) throw accessError(400, 'INVALID_QUERY', 'Unexpected Aura selectors'); };
async function summary(context) {
  const owner = { hubId: context.hubId, userId: context.userId };
  const [balance, days, recent, pending, inactive, rules] = await Promise.all([
    Balance.findOne(owner).lean(), streak.read(context.userId),
    Event.find({ ...owner, canonical: true }).sort({ receivedAt: -1, _id: -1 }).limit(20).select('eventId type awardedAura ruleVersion policyReason dayKey occurredAt receivedAt').lean(),
    Solution.countDocuments({ ...owner, awardStatus: 'pending' }), NativeFact.countDocuments({ ...owner, status: 'rules_inactive' }), RuleSet.findOne({ version: 'native-v1' }).lean(),
  ]);
  return { hubId: context.hubId, userId: context.userId, engagement: balance?.engagement || 0, externalBonus: balance?.externalBonus || 0, total: balance?.total || 0, asOf: balance?.asOf || null, streak: days,
    recent: recent.map(row => ({ eventId: row.eventId, type: row.type, awardedAura: row.awardedAura, ruleVersion: row.ruleVersion, reason: row.policyReason, dayKey: row.dayKey, occurredAt: row.occurredAt, receivedAt: row.receivedAt })), pending, inactive,
    scoring: rules ? { status: 'active', version: rules.version, activatedAt: rules.activatedAt, types: rules.rules.types, dailyCap: rules.rules.sourceCap } : { status: 'inactive' } };
}
async function leaderboard(context, query = {}) {
  only(query, ['limit', 'cursor']);
  const { limit, after } = pageInput(query, 'aura-ranking-v1', context.hubId);
  // Aggregations do not cast IDs; replace the signed cursor's string IDs explicitly.
  if (after.$or) for (const part of after.$or) if (part._id) part._id.$gt = new mongoose.Types.ObjectId(part._id.$gt);
  const rows = await User.aggregate([
    { $match: { hubId: new mongoose.Types.ObjectId(context.hubId), membershipStatus: 'active' } },
    { $lookup: { from: 'aurabalances', let: { user: '$_id', hub: '$hubId' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$user'] }, { $eq: ['$hubId', '$$hub'] }] } } }, { $project: { total: 1 } }], as: 'balance' } },
    { $set: { auraPoints: { $ifNull: [{ $arrayElemAt: ['$balance.total', 0] }, 0] } } },
    { $setWindowFields: { sortBy: { auraPoints: -1, _id: 1 }, output: { rank: { $sum: 1, window: { documents: ['unbounded', 'current'] } } } } },
    { $facet: { items: [{ $match: after }, { $sort: { auraPoints: -1, _id: 1 } }, { $limit: limit + 1 }, { $project: { _id: 1, username: 1, fullName: 1, auraPoints: 1, rank: 1 } }], own: [{ $match: { _id: new mongoose.Types.ObjectId(context.userId) } }, { $project: { _id: 0, rank: 1, auraPoints: 1 } }] } },
  ]).option({ maxTimeMS: 3000 });
  const items = rows[0]?.items || [], page = items.slice(0, limit);
  return { hubId: context.hubId, items: page, ownRank: rows[0]?.own[0] || null, nextCursor: items.length > limit ? cursorFor('aura-ranking-v1', context.hubId, page.at(-1)) : null };
}
module.exports = { summary, leaderboard, only };
