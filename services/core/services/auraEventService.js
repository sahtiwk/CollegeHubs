const mongoose = require('mongoose');
const { failure, digest } = require('./moduleTokenService');
const AuraEvent = require('../models/AuraEvent');
const AuraBalance = require('../models/AuraBalance');
const AuraDayCounter = require('../models/AuraDayCounter');
const DailyActivity = require('../models/DailyActivity');
const ModuleGrant = require('../models/ModuleGrant');
const User = require('../models/User');
const Hub = require('../models/Hub');
const College = require('../models/College');
const TYPES = Object.freeze({ 'arcade.game_completed': 'arcade', 'interview.completed': 'interview', 'learn.quiz_completed': 'learn', 'learn.node_mastered': 'learn' });
const DAY = 86400000;
const invalid = () => failure(400, 'INVALID_EVENT', 'Invalid or unsupported event facts');
const text = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const exact = (object, keys) => object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key));
function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function validateEvent(body, now = new Date()) {
  if (!exact(body, ['schemaVersion', 'eventId', 'userId', 'hubId', 'source', 'type', 'value', 'occurredAt', 'metadata']) ||
      body.schemaVersion !== 1 || body.value !== 1 || !text(body.eventId) || !Object.hasOwn(TYPES, body.type) || TYPES[body.type] !== body.source ||
      ![body.userId, body.hubId].every(value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value)) ||
      typeof body.occurredAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(body.occurredAt)) throw invalid();
  const occurred = new Date(body.occurredAt);
  if (!Number.isFinite(+occurred) || occurred.toISOString() !== body.occurredAt || occurred > now || +occurred < +now - 30 * DAY) throw invalid();
  const m = body.metadata;
  const extra = { 'arcade.game_completed': ['gameId', 'rulesVersion', 'outcome', 'serverDurationSeconds'],
    'interview.completed': ['rawScore', 'answeredCount', 'questionCount', 'serverDurationSeconds', 'rubricVersion'],
    'learn.quiz_completed': ['nodeId', 'mode', 'attemptId', 'passed', 'correctCount', 'itemCount', 'curriculumVersion'],
    'learn.node_mastered': ['nodeId', 'curriculumVersion', 'masteryMethod'] };
  if (!exact(m, ['sourceId', 'accessJti', 'domainVersion', ...extra[body.type]]) || !text(m.sourceId) || !text(m.domainVersion) ||
      typeof m.accessJti !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(m.accessJti)) throw invalid();
  if (body.source === 'arcade' && (!['numberguess', 'mathamplitude', 'sorting'].includes(m.gameId) || !text(m.rulesVersion) ||
      !['success', 'failed', 'casual'].includes(m.outcome) || !integer(m.serverDurationSeconds, 0, 86400))) throw invalid();
  if (body.source === 'interview' && (!integer(m.rawScore, 0, 100) || m.questionCount !== 5 || !integer(m.answeredCount, 0, 5) ||
      !integer(m.serverDurationSeconds, 0, 86400) || !text(m.rubricVersion))) throw invalid();
  if (body.source === 'learn' && (!text(m.nodeId) || !text(m.curriculumVersion))) throw invalid();
  if (body.type === 'learn.quiz_completed' && (!['checkpoint', 'test-out'].includes(m.mode) || !text(m.attemptId) || m.sourceId !== m.attemptId ||
      m.itemCount !== (m.mode === 'checkpoint' ? 5 : 10) || !integer(m.correctCount, 0, m.itemCount) || typeof m.passed !== 'boolean' ||
      m.passed !== (m.correctCount / m.itemCount >= (m.mode === 'checkpoint' ? 0.6 : 0.8)))) throw invalid();
  if (body.type === 'learn.node_mastered' && (!['checkpoint', 'test-out'].includes(m.masteryMethod) || m.sourceId !== m.nodeId + ':' + m.curriculumVersion)) throw invalid();
  return body;
}
async function validatePrincipal(credential, event, session) {
  if (credential.service !== event.source || !credential.eventTypes?.includes(event.type)) throw failure(403, 'EVENT_SCOPE_FORBIDDEN', 'Service cannot submit this event type');
  const now = new Date();
  const binding = await ModuleGrant.findOne({ accessJti: event.metadata.accessJti, module: event.source, userId: event.userId, hubId: event.hubId,
    consumedAt: { $ne: null }, retainUntil: { $gt: now } }).session(session);
  if (!binding || !Number.isFinite(+binding.consumedAt) || !Number.isFinite(+binding.accessExpiresAt) ||
      +new Date(event.occurredAt) < +binding.consumedAt || +new Date(event.occurredAt) >= +binding.accessExpiresAt) throw failure(403, 'EVENT_BINDING_INVALID', 'Event has no valid retained issuance binding');
  const user = await User.findOne({ _id: event.userId, hubId: event.hubId, membershipStatus: 'active', membershipVersion: binding.membershipVersion }).session(session);
  const hub = await Hub.findOne({ _id: event.hubId, hubId: event.hubId, status: 'active' }).session(session);
  if (!user || !hub || !await College.exists({ _id: hub.collegeId, status: 'active' }).session(session)) throw failure(403, 'EVENT_MEMBERSHIP_INVALID', 'Current active membership is required');
}
function receipt(row) {
  return { eventId: row.eventId, userId: String(row.userId), hubId: String(row.hubId), awardedAura: row.awardedAura,
    weightVersion: row.ruleVersion, reason: row.policyReason, dayKey: row.dayKey, timezonePolicyVersion: row.timezonePolicyVersion,
    occurredAt: row.occurredAt.toISOString(), receivedAt: row.receivedAt.toISOString() };
}
function businessKey(event) {
  const m = event.metadata;
  const fact = event.type === 'learn.node_mastered' ? [m.nodeId, m.curriculumVersion]
    : event.source === 'arcade' ? [m.sourceId, m.rulesVersion] : [m.sourceId];
  return digest(canonicalJson([event.hubId, event.userId, event.type, ...fact]));
}
async function transaction(work) {
  // Unique-index races during the first daily/balance insert need a fresh snapshot.
  for (let attempt = 0; attempt < 5; attempt++) {
    const session = await mongoose.startSession();
    try { return await session.withTransaction(() => work(session), { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000, timeoutMS: 10000 }); }
    catch (err) { if (err.code !== 11000 || attempt === 4) throw err; }
    finally { await session.endSession(); }
  }
}
function createAuraEventService({ rules = null } = {}) {
  // Explicit fixtures remain isolated; normal ingestion activates only persisted released games.
  // Implemented native facts use nativeAuraService and the persisted native-v1 ruleset.
  if (rules) {
    rules = JSON.parse(JSON.stringify(rules));
    if (!text(rules.version) || !rules.version.startsWith('fixture-') || !integer(rules.timezonePolicyVersion, 1, 1000) || !rules.types || !Object.keys(rules.types).length) throw new Error('P2 requires explicitly injected fixture rules');
    new Intl.DateTimeFormat('en', { timeZone: rules.timezone });
    for (const [type, rule] of Object.entries(rules.types)) if (!Object.hasOwn(TYPES, type) ||
        !integer(rule.weight, 0, 100) || !integer(rule.countCap, 1, 100) || !integer(rule.sourceCap, 0, 100)) throw new Error('Invalid Aura rule');
    for (const source of Object.values(TYPES)) if (new Set(Object.entries(rules.types).filter(([type]) => TYPES[type] === source).map(([, rule]) => rule.sourceCap)).size > 1) throw new Error('Inconsistent source cap');
  }
  async function ingest(credential, input) {
    validateEvent(input);
    const event = JSON.parse(JSON.stringify(input));
    if (credential.service !== event.source || !credential.eventTypes?.includes(event.type)) throw failure(403, 'EVENT_SCOPE_FORBIDDEN', 'Service cannot submit this event type');
    let activeRules = rules;
    if (!activeRules && event.source === 'arcade') {
      const stored = await require('../models/AuraRuleSet').findOne({ version: { $in: ['arcade-numberguess-v1', 'arcade-three-games-v1'] }, activatedAt: { $lte: new Date(event.occurredAt) } }).sort({ activatedAt: -1, version: -1 }).lean();
      if (stored && stored.rules.games?.[event.metadata.gameId] === event.metadata.rulesVersion && event.metadata.domainVersion === 'v1') activeRules = stored.rules;
    }
    if (!activeRules || !activeRules.types[event.type]) throw failure(503, 'AURA_RULES_INACTIVE', 'Aura scoring is not activated yet; retain the pending result');
    const rule = activeRules.types[event.type], hash = digest(canonicalJson(event)), key = businessKey(event);
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: activeRules.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(event.occurredAt));
    return transaction(async session => {
      await validatePrincipal(credential, event, session);
      const previous = await AuraEvent.findOne({ eventId: event.eventId }).session(session);
      if (previous) {
        if (previous.payloadHash !== hash) throw failure(409, 'EVENT_ID_CONFLICT', 'Event ID already has different facts');
        const original = previous.canonical ? previous : await AuraEvent.findOne({ eventId: previous.originalEventId, hubId: event.hubId, userId: event.userId }).session(session);
        return { status: 200, body: { status: 'duplicate', receipt: receipt(original) } };
      }
      const original = await AuraEvent.findOne({ businessKey: key, canonical: true }).session(session);
      const base = { ...event, sourceId: event.metadata.sourceId, businessKey: key, payloadHash: hash, occurredAt: new Date(event.occurredAt),
        receivedAt: new Date(), ruleVersion: activeRules.version, dayKey, timezonePolicyVersion: activeRules.timezonePolicyVersion };
      delete base.schemaVersion;
      if (original) {
        await AuraEvent.create([{ ...base, canonical: false, originalEventId: original.eventId, awardedAura: 0, policyReason: 'semantic_duplicate' }], { session });
        return { status: 200, body: { status: 'duplicate', receipt: receipt(original) } };
      }
      const day = { userId: event.userId, dayKey, timezonePolicyVersion: activeRules.timezonePolicyVersion };
      let counter = await AuraDayCounter.findOne(day).session(session);
      if (!counter) counter = new AuraDayCounter({ ...day, hubId: event.hubId });
      const m = event.metadata, typeKey = event.type.replaceAll('.', '_');
      const qualified = event.source === 'arcade' ? m.outcome === 'success'
        : event.source === 'interview' ? m.answeredCount >= 3 && m.serverDurationSeconds >= 60
        : event.type === 'learn.quiz_completed' ? m.passed : true;
      const nodeMode = digest(canonicalJson([m.nodeId, m.mode]));
      const used = event.source === 'arcade' ? counter.gameIds.includes(m.gameId)
        : event.type === 'learn.quiz_completed' ? counter.nodeModeKeys.includes(nodeMode) : false;
      const count = counter.typeCounts.get(typeKey) || 0, total = counter.sourceTotals.get(event.source) || 0;
      const budget = Math.max(0, rule.sourceCap - total);
      const baseAward = rule.weight + (event.source === 'interview' ? Math.floor(m.rawScore / 10) : 0);
      const awardedAura = qualified && !used && count < rule.countCap ? Math.min(baseAward, budget) : 0;
      const policyReason = !qualified ? 'ineligible' : used ? 'daily_fact_limit' : count >= rule.countCap ? 'daily_count_cap' : !budget ? 'source_cap' : awardedAura < baseAward ? 'partial_source_cap' : 'awarded';
      if (qualified) {
        // Count only the first qualifying semantic/day fact; zero cap receipts are terminal.
        if (!used) counter.typeCounts.set(typeKey, Math.min(rule.countCap, count + 1));
        counter.sourceTotals.set(event.source, total + awardedAura);
        if (event.source === 'arcade' && !used) counter.gameIds.push(m.gameId);
        if (event.type === 'learn.quiz_completed' && !used && count < rule.countCap) counter.nodeModeKeys.push(nodeMode);
        await DailyActivity.updateOne(day, { $setOnInsert: { hubId: event.hubId, ...day }, $min: { firstOccurredAt: base.occurredAt }, $addToSet: { qualifyingSources: event.source } }, { upsert: true, session });
      }
      counter.version++;
      await counter.save({ session });
      const owner = { hubId: event.hubId, userId: event.userId };
      await AuraBalance.updateOne(owner, { $setOnInsert: { ...owner, externalBonus: 0 }, $inc: { engagement: awardedAura, total: awardedAura, version: 1 }, $set: { asOf: base.receivedAt } }, { upsert: true, session });
      const [stored] = await AuraEvent.create([{ ...base, canonical: true, originalEventId: event.eventId, awardedAura, policyReason }], { session });
      return { status: 201, body: { status: 'accepted', receipt: receipt(stored) } };
    });
  }
  async function replaceExternalBonus(owner, amount) {
    // Internal fixture seam only; no live provider/HTTP caller and no activation in startup.
    if (!rules?.version.startsWith('fixture-')) throw failure(503, 'EXTERNAL_BONUS_DISABLED', 'External bonus is disabled');
    if (!integer(amount, 0, 1000000) || !exact(owner, ['userId', 'hubId']) || !Object.values(owner).every(value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value))) throw invalid();
    return transaction(async session => {
      const balance = await AuraBalance.findOne(owner).session(session);
      if (!balance) throw failure(404, 'BALANCE_NOT_FOUND', 'Balance not found');
      balance.externalBonus = amount; balance.total = balance.engagement + amount; balance.version++; balance.asOf = new Date();
      await balance.save({ session });
      return balance;
    });
  }
  return { ingest, replaceExternalBonus };
}
module.exports = { createAuraEventService, validateEvent, canonicalJson, validatePrincipal };
