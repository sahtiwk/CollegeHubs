const mongoose = require('mongoose');
const RuleSet = require('../models/AuraRuleSet');
const Event = require('../models/AuraEvent');
const Balance = require('../models/AuraBalance');
const Counter = require('../models/AuraDayCounter');
const Activity = require('../models/DailyActivity');
const User = require('../models/User');
const Hub = require('../models/Hub');
const College = require('../models/College');
const { canonicalJson } = require('./auraEventService');
const { digest, failure } = require('./moduleTokenService');
const configured = require('../config/auraRules.v1.json');
async function activate(config = configured) {
  const rulesHash = digest(canonicalJson(config));
  let stored = await RuleSet.findOne({ version: config.version });
  if (!stored) {
    const { localTime } = await mongoose.connection.db.command({ hello: 1 });
    try { stored = await RuleSet.create({ version: config.version, rules: config, rulesHash, activatedAt: localTime }); }
    catch (error) { if (error.code !== 11000) throw error; stored = await RuleSet.findOne({ version: config.version }); }
  }
  if (stored.rulesHash !== rulesHash || digest(canonicalJson(stored.rules)) !== rulesHash) throw new Error('Aura rules changed without a new version');
  return stored;
}
async function score(fact, session) {
  if (!session?.inTransaction()) throw new Error('Native scoring requires the domain transaction');
  const active = await RuleSet.findOne({ version: configured.version }).session(session);
  if (!active || new Date(fact.occurredAt) < active.activatedAt) return null;
  const rules = active.rules, rule = rules.types[fact.type];
  if (!rule) return null;
  const payloadHash = digest(canonicalJson({ eventId: fact.eventId, businessKey: fact.businessKey, hubId: String(fact.hubId), userId: String(fact.userId), sourceId: String(fact.sourceId), type: fact.type, occurredAt: new Date(fact.occurredAt).toISOString() }));
  const previous = await Event.findOne({ eventId: fact.eventId }).session(session);
  const receipt = row => ({ eventId: row.eventId, awardedAura: row.awardedAura, weightVersion: row.ruleVersion, reason: row.policyReason, dayKey: row.dayKey });
  if (previous) {
    if (previous.payloadHash !== payloadHash) throw failure(409, 'EVENT_ID_CONFLICT', 'Event facts changed');
    return receipt(previous);
  }
  const user = await User.exists({ _id: fact.userId, hubId: fact.hubId, membershipStatus: 'active' }).session(session);
  const hub = await Hub.findOne({ _id: fact.hubId, hubId: fact.hubId, status: 'active' }).session(session);
  const qualified = !!user && !!hub && !!await College.exists({ _id: hub.collegeId, status: 'active' }).session(session);
  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: rules.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(fact.occurredAt));
  const day = { userId: fact.userId, dayKey, timezonePolicyVersion: rules.timezonePolicyVersion };
  let counter = await Counter.findOne(day).session(session);
  if (!counter) counter = new Counter({ ...day, hubId: fact.hubId });
  const typeKey = fact.type.replaceAll('.', '_'), count = counter.typeCounts.get(typeKey) || 0, used = counter.sourceTotals.get('core') || 0;
  const awardedAura = qualified && count < rule.countCap ? Math.min(rule.weight, Math.max(0, rules.sourceCap - used)) : 0;
  const policyReason = !qualified ? 'membership_inactive' : count >= rule.countCap ? 'daily_count_cap' : used >= rules.sourceCap ? 'source_cap' : awardedAura < rule.weight ? 'partial_source_cap' : 'awarded';
  if (qualified) {
    counter.typeCounts.set(typeKey, Math.min(rule.countCap, count + 1)); counter.sourceTotals.set('core', used + awardedAura);
    await Activity.updateOne(day, { $setOnInsert: { ...day, hubId: fact.hubId }, $min: { firstOccurredAt: fact.occurredAt }, $addToSet: { qualifyingSources: 'core' } }, { upsert: true, session });
  }
  counter.version++; await counter.save({ session });
  const { localTime: receivedAt } = await mongoose.connection.db.command({ hello: 1 });
  const owner = { hubId: fact.hubId, userId: fact.userId };
  await Balance.updateOne(owner, { $setOnInsert: { ...owner, externalBonus: 0 }, $inc: { engagement: awardedAura, total: awardedAura, version: 1 }, $set: { asOf: receivedAt } }, { upsert: true, session });
  const [event] = await Event.create([{ ...owner, eventId: fact.eventId, businessKey: fact.businessKey, source: 'core', type: fact.type, sourceId: String(fact.sourceId), canonical: true, originalEventId: fact.eventId, payloadHash, value: 1,
    metadata: { sourceId: String(fact.sourceId), weightApplied: rule.weight, normalizedSourceHash: fact.normalizedSourceHash }, occurredAt: fact.occurredAt, receivedAt,
    ruleVersion: active.version, awardedAura, policyReason, dayKey, timezonePolicyVersion: rules.timezonePolicyVersion }], { session });
  return receipt(event);
}
module.exports = { activate, score };
