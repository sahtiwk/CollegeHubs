const { createHash, randomUUID } = require('node:crypto');
const { fail, exact } = require('../errors');
const { TYPES, RUBRIC, validateQuestions, evaluateReport } = require('./evaluationPolicy');
const idPattern = /^[a-f0-9]{24}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const transactionOptions = { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000, timeoutMS: 10000 };
const scope = identity => ({ userId: identity.user_id, hubId: identity.hub_id });
const publicQuestions = questions => questions.map(q => ({ id: q.id, questionText: q.questionText, category: q.category, difficulty: q.difficulty }));
function createPracticeService(connection, models, ai, events) {
  const { Interview, Resume, Session, AiControl } = models;
  const now = async () => (await connection.db.command({ hello: 1 })).localTime;
  const transaction = work => connection.transaction(work, transactionOptions);
  const credential = (identity, at, reserve = 0) => { if (identity.principal.exp * 1000 <= +at + reserve) throw fail(401, 'INTERVIEW_SESSION_REQUIRED'); };
  async function owned(Model, identity, id, session = null) {
    if (!idPattern.test(id || '')) throw fail(404, 'NOT_FOUND');
    const row = await Model.findOne({ ...scope(identity), _id: id }).session(session);
    if (!row) throw fail(404, 'NOT_FOUND'); return row;
  }
  const interviewDto = row => ({ id: String(row._id), learnTopics: (row.learnTopics || []).map(t=>({nodeId:t.nodeId,label:t.label,version:t.version,reason:t.reason,asOf:t.asOf})), jobTitle: row.jobTitle, jobDescription: row.jobDescription, company: row.company || '', experienceLevel: row.experienceLevel || 'entry', questionTypes: row.questionTypes, resumeId: row.resumeId ? String(row.resumeId) : null, resumeUnavailable: row.resumeUnavailable, questionCount: 5, questions: publicQuestions(row.questions), status: row.status, lastError: row.lastError, retryAt: row.retryAt, leaseUntil: row.generationLeaseUntil, createdAt: row.createdAt });
  const sessionDto = (row, at) => ({ id: String(row._id), interviewId: String(row.interviewId), jobTitle: row.jobTitle, questions: publicQuestions(row.questions), answers: row.answers.map(a => ({ questionId: a.questionId, answer: a.answer, skipped: a.skipped, revision: a.revision, savedAt: a.savedAt })), status: row.status, report: row.report, createdAt: row.createdAt, completedAt: row.completedAt || null, serverNow: at, elapsedSeconds: row.serverDurationSeconds ?? Math.max(0, Math.floor((+at - +row.createdAt) / 1000)), leaseUntil: row.evaluationLeaseUntil, retryAt: row.retryAt, lastError: row.lastError, deliveryStatus: row.deliveryStatus, receipt: row.receipt });
  async function recover(Model, identity, id, kind, at) {
    const generating = kind === 'generation', prefix = generating ? 'generation' : 'evaluation';
    await Model.updateOne({ ...scope(identity), _id: id, status: generating ? 'generating' : 'evaluating', [prefix + 'LeaseUntil']: { $lte: at } }, { $set: { status: prefix + '_failed', [prefix + 'Lease']: null, lastError: prefix.toUpperCase() + '_INTERRUPTED', retryAt: at } });
  }
  async function prepareBudget(identity, kind, at) {
    const owner = createHash('sha256').update(identity.user_id + ':' + identity.hub_id).digest('hex');
    const keys = ['hour:' + owner + ':' + kind + ':' + Math.floor(+at / 3600000), 'daily:' + at.toISOString().slice(0, 10)];
    for (const key of ['provider', ...keys]) {
      try { await AiControl.updateOne({ _id: key }, { $setOnInsert: { count: 0, leaseUntil: new Date(0), cooldownUntil: new Date(0), ...(key !== 'provider' ? { expiresAt: new Date(+at + 172800000) } : {}) } }, { upsert: true }); }
      catch (error) { if (error.code !== 11000) throw error; }
    }
    return keys;
  }
  async function acquireBudget(keys, kind, token, at, session) {
    const gate = await AiControl.findOneAndUpdate({ _id: 'provider', leaseUntil: { $lte: at }, cooldownUntil: { $lte: at } }, { $set: { leaseToken: token, leaseUntil: new Date(+at + 30000) } }, { session, new: true });
    if (!gate) { const error = fail(429, 'AI_BUSY'); error.retryAfter = 30; throw error; }
    for (const [i, key] of keys.entries()) {
      const limit = i === 1 ? 30 : kind === 'generation' ? 3 : 6;
      if (!await AiControl.findOneAndUpdate({ _id: key, count: { $lt: limit } }, { $inc: { count: 1 } }, { session })) { const error = fail(429, 'AI_QUOTA'); error.retryAfter = i === 1 ? 3600 : Math.max(1, Math.ceil((3600000 - (+at % 3600000)) / 1000)); throw error; }
    }
  }
  async function releaseBudget(token, error) {
    await AiControl.updateOne({ _id: 'provider', leaseToken: token }, { $set: { leaseToken: null, leaseUntil: new Date(0), ...(error?.code === 'AI_RATE_LIMIT' ? { cooldownUntil: new Date(Date.now() + error.retryAfter * 1000) } : {}) } });
  }
  async function create(identity, input) {
    const required = ['resumeId','jobTitle','jobDescription','questionTypes'], allowed = [...required,'clientRequestId','company','experienceLevel'];
    if (!input || !required.every(k => Object.hasOwn(input,k)) || Object.keys(input).some(k => !allowed.includes(k)) || !idPattern.test(input.resumeId || '') || typeof input.jobTitle !== 'string' || !input.jobTitle.trim() || input.jobTitle.length > 160 || typeof input.jobDescription !== 'string' || !input.jobDescription.trim() || input.jobDescription.length > 5000 || !Array.isArray(input.questionTypes) || !input.questionTypes.length || input.questionTypes.length > 5 || new Set(input.questionTypes).size !== input.questionTypes.length || input.questionTypes.some(t => !TYPES.includes(t)) || input.clientRequestId !== undefined && !uuid.test(input.clientRequestId) || input.company !== undefined && (typeof input.company !== 'string' || input.company.length > 160) || input.experienceLevel !== undefined && !['entry','mid','senior'].includes(input.experienceLevel)) throw fail(400, 'INVALID_DRAFT');
    const values = { resumeId: input.resumeId, jobTitle: input.jobTitle.trim(), jobDescription: input.jobDescription.trim(), questionTypes: input.questionTypes, company: input.company || '', experienceLevel: input.experienceLevel || 'entry' };
    const creationHash = createHash('sha256').update(JSON.stringify(values)).digest('hex');
    const replay = async () => { const old = input.clientRequestId && await Interview.findOne({ ...scope(identity), clientRequestId: input.clientRequestId }).select('+creationHash'); if (old && old.creationHash !== creationHash) throw fail(409, 'DRAFT_CREATION_CONFLICT'); return old ? interviewDto(old) : null; };
    const old = await replay(); if (old) return old;
    try { return await transaction(async session => {
      const resume = await Resume.findOneAndUpdate({ ...scope(identity), _id: input.resumeId }, { $inc: { referenceVersion: 1 } }, { session }); if (!resume) throw fail(404, 'NOT_FOUND');
      if (await Interview.countDocuments(scope(identity)).session(session) >= 20) throw fail(409, 'DRAFT_LIMIT');
      const [row] = await Interview.create([{ ...scope(identity), ...values, ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}), creationHash }], { session }); return interviewDto(row);
    }); } catch (error) { if (error.code === 11000) { const existing = await replay(); if (existing) return existing; } throw error; }
  }
  async function readInterview(identity, id) {
    await owned(Interview, identity, id); await recover(Interview, identity, id, 'generation', await now()); return interviewDto(await owned(Interview, identity, id));
  }
  async function generate(identity, id, input) {
    if (!exact(input, [])) throw fail(400, 'INVALID_BODY');
    let row = await owned(Interview, identity, id);
    if (row.questions.length === 5) return interviewDto(row);
    ai.requireReady(); const at = await now(); credential(identity, at, 30000);
    if (row.status === 'generating' && +row.generationLeaseUntil > +at) return interviewDto(row);
    const token = randomUUID(), keys = await prepareBudget(identity, 'generation', at);
    let resumeText;
    row = await transaction(async session => {
      const fresh = await owned(Interview, identity, id, session);
      if (+fresh.topicLeaseUntil > +at) throw fail(409, 'TOPICS_LOCKED', 'Topic import is in progress. Retry shortly.');
      if (fresh.questions.length || fresh.status === 'generating' && +fresh.generationLeaseUntil > +at) return fresh;
      if (+fresh.retryAt > +at) { const error = fail(429, 'AI_COOLDOWN'); error.retryAfter = Math.ceil((+fresh.retryAt - +at)/1000); throw error; }
      const resume = fresh.resumeId && await Resume.findOneAndUpdate({ ...scope(identity), _id: fresh.resumeId }, { $inc: { referenceVersion: 1 } }, { session }).select('+extractedText');
      if (!resume || fresh.resumeUnavailable) throw fail(409, 'RESUME_UNAVAILABLE');
      await acquireBudget(keys, 'generation', token, at, session); resumeText = resume.extractedText;
      fresh.status = 'generating'; fresh.generationLease = token; fresh.generationLeaseUntil = new Date(+at + 30000); fresh.generationAttempts++; fresh.lastError = null; await fresh.save({ session }); return fresh;
    });
    if (row.generationLease !== token) return interviewDto(row);
    let failure;
    try {
      const categoryOrder = Array.from({ length: 5 }, (_, i) => row.questionTypes[i % row.questionTypes.length]);
      const output = await ai.generate({ jobTitle: row.jobTitle, jobDescription: row.jobDescription, experienceLevel: row.experienceLevel || 'entry', categoryOrder, resumeText, learnTopics: (row.learnTopics || []).map(t=>({label:t.label,version:t.version})) });
      resumeText = null; const questions = validateQuestions(output, row.questionTypes);
      await transaction(async session => {
        const finishedAt = await now(), fresh = await owned(Interview, identity, id, session);
        if (fresh.status !== 'generating' || fresh.generationLease !== token || +fresh.generationLeaseUntil <= +finishedAt) throw fail(409, 'GENERATION_INTERRUPTED');
        if (!fresh.resumeId || !await Resume.findOneAndUpdate({ ...scope(identity), _id: fresh.resumeId }, { $inc: { referenceVersion: 1 } }, { session })) throw fail(409, 'RESUME_UNAVAILABLE');
        fresh.questions = questions; fresh.status = 'ready'; fresh.generationLease = null; fresh.lastError = null; await fresh.save({ session });
      });
      return await readInterview(identity,id);
    } catch (error) {
      failure = error; await Interview.updateOne({ ...scope(identity), _id: id, status: 'generating', generationLease: token }, { $set: { status: 'generation_failed', generationLease: null, lastError: error.status ? error.code : 'AI_UNAVAILABLE', retryAt: new Date(Date.now() + (error.retryAfter || 30)*1000) } }); throw error;
    } finally { resumeText = null; await releaseBudget(token, failure); }
  }
  async function start(identity, input) {
    if (!exact(input, ['interviewId']) || !idPattern.test(input.interviewId || '')) throw fail(400, 'INVALID_SESSION');
    const existing = await Session.findOne({ ...scope(identity), interviewId: input.interviewId }); if (existing) return sessionDto(existing, await now());
    try { return await transaction(async session => {
      const interview = await owned(Interview, identity, input.interviewId, session), at = await now(); credential(identity, at);
      if (interview.questions.length !== 5 || !['ready','in_progress','completed'].includes(interview.status)) throw fail(409, 'QUESTIONS_NOT_READY');
      // Shared parent write serializes start against draft deletion and concurrent starts.
      interview.status = 'in_progress'; await interview.save({ session });
      const [row] = await Session.create([{ ...scope(identity), interviewId: interview._id, jobTitle: interview.jobTitle, questions: interview.questions.map(q => q.toObject()), answers: interview.questions.map(q => ({ questionId: q.id, answer: '', skipped: false, revision: 0 })), createdAt: at }], { session });
      return sessionDto(row, at);
    }); } catch (error) { if (error.code === 11000) { const row = await Session.findOne({ ...scope(identity), interviewId: input.interviewId }); if (row) return sessionDto(row, await now()); } throw error; }
  }
  async function readSession(identity, id) {
    await owned(Session, identity, id); const at = await now(); await recover(Session, identity, id, 'evaluation', at); const row = await owned(Session, identity, id);
    if (row.deliveryStatus === 'pending') events.trigger(row.id); return sessionDto(row, at);
  }
  async function saveAnswer(identity, id, questionId, input) {
    if (!exact(input, ['revision','answer','skipped']) || !Number.isSafeInteger(input.revision) || input.revision < 1 || input.revision > 1000 || typeof input.answer !== 'string' || input.answer.length > 2000 || typeof input.skipped !== 'boolean' || input.skipped && input.answer !== '' || !input.skipped && !input.answer.trim()) throw fail(400, 'INVALID_ANSWER');
    const value = { answer: input.answer.trim(), skipped: input.skipped, revision: input.revision };
    return transaction(async session => {
      const row = await owned(Session, identity, id, session), at = await now(); credential(identity, at);
      if (!['active','evaluation_failed'].includes(row.status)) throw fail(409, 'ANSWERS_LOCKED');
      const answer = row.answers.find(a => a.questionId === questionId); if (!answer) throw fail(404, 'QUESTION_NOT_FOUND');
      if (answer.revision === input.revision && answer.answer === value.answer && answer.skipped === value.skipped) return sessionDto(row, at);
      if (answer.revision + 1 !== input.revision) throw fail(409, 'ANSWER_REVISION_CONFLICT');
      Object.assign(answer, value, { savedAt: at }); await row.save({ session }); return sessionDto(row, at);
    });
  }
  async function complete(identity, id, input) {
    if (!exact(input, [])) throw fail(400, 'INVALID_COMPLETION');
    let row = await owned(Session, identity, id); const at = await now();
    if (row.status === 'completed') { events.trigger(row.id); return sessionDto(row, at); }
    if (row.status === 'evaluating' && +row.evaluationLeaseUntil > +at) return sessionDto(row, at);
    ai.requireReady(); credential(identity, at, 30000);
    const token = randomUUID(), keys = await prepareBudget(identity, 'evaluation', at);
    row = await transaction(async session => {
      const fresh = await owned(Session, identity, id, session);
      if (fresh.status === 'completed' || fresh.status === 'evaluating' && +fresh.evaluationLeaseUntil > +at) return fresh;
      if (fresh.status === 'abandoned' || fresh.questions.length !== 5 || fresh.answers.length !== 5 || fresh.answers.some(a => a.revision < 1)) throw fail(409, 'ANSWERS_NOT_SAVED');
      if (+fresh.retryAt > +at) { const error = fail(429, 'AI_COOLDOWN'); error.retryAfter = Math.ceil((+fresh.retryAt - +at)/1000); throw error; }
      await acquireBudget(keys, 'evaluation', token, at, session);
      fresh.status = 'evaluating'; fresh.evaluationLease = token; fresh.evaluationLeaseUntil = new Date(+at + 30000); fresh.evaluationAttempts++; fresh.lastError = null; await fresh.save({ session }); return fresh;
    });
    if (row.evaluationLease !== token) return sessionDto(row, at);
    let failure;
    try {
      const output = await ai.evaluate({ jobTitle: row.jobTitle, questions: row.questions.map(q => q.toObject()), answers: row.answers.map(a => ({ questionId: a.questionId, answer: a.answer, skipped: a.skipped })) });
      const report = evaluateReport(output, row.questions, row.answers);
      await transaction(async session => {
        const completedAt = await now(), fresh = await owned(Session, identity, id, session); credential(identity, completedAt);
        if (fresh.status !== 'evaluating' || fresh.evaluationLease !== token || +fresh.evaluationLeaseUntil <= +completedAt) throw fail(409, 'EVALUATION_INTERRUPTED');
        // Duration is frozen at evaluation request; provider latency cannot qualify an early completion.
        const duration = Math.max(0, Math.min(86400, Math.floor((+at - +fresh.createdAt)/1000)));
        fresh.report = { ...report, providerModel: ai.model, evaluatedAt: completedAt }; fresh.status = 'completed'; fresh.completedAt = completedAt; fresh.serverDurationSeconds = duration; fresh.evaluationLease = null; fresh.lastError = null;
        fresh.event = { schemaVersion: 1, eventId: `interview:${fresh._id}:completed:v1`, userId: identity.user_id, hubId: identity.hub_id, source: 'interview', type: 'interview.completed', value: 1, occurredAt: completedAt.toISOString(), metadata: { sourceId: String(fresh._id), accessJti: identity.principal.jti, domainVersion: 'v1', rawScore: report.score, answeredCount: report.answeredCount, questionCount: 5, serverDurationSeconds: duration, rubricVersion: RUBRIC } };
        fresh.deliveryStatus = 'pending'; await fresh.save({ session });
        await Interview.updateOne({ ...scope(identity), _id: fresh.interviewId }, { $set: { status: 'completed' } }, { session });
      });
      return await readSession(identity,id);
    } catch (error) {
      failure = error; await Session.updateOne({ ...scope(identity), _id: id, status: 'evaluating', evaluationLease: token }, { $set: { status: 'evaluation_failed', evaluationLease: null, lastError: error.status ? error.code : 'AI_UNAVAILABLE', retryAt: new Date(Date.now() + (error.retryAfter || 30)*1000) } }); throw error;
    } finally { await releaseBudget(token, failure); }
  }
  async function removeInterview(identity, id) { await transaction(async session => { const row = await owned(Interview,identity,id,session); if (row.questions.length || row.status === 'generating' || await Session.exists({ ...scope(identity), interviewId: row._id }).session(session)) throw fail(409,'INTERVIEW_RETAINED'); await Interview.deleteOne({ ...scope(identity), _id: row._id },{session}); }); return { deleted: true }; }
  const listInterviews = async identity => ({ items: (await Interview.find(scope(identity)).sort({ createdAt: -1, _id: -1 }).limit(20)).map(interviewDto) });
  const history = async identity => { const at = await now(); return { items: (await Session.find(scope(identity)).sort({ createdAt: -1, _id: -1 }).limit(20)).map(row => ({ id: row.id, interviewId: String(row.interviewId), jobTitle: row.jobTitle, status: row.status, createdAt: row.createdAt, score: row.report?.score ?? null, deliveryStatus: row.deliveryStatus, receipt: row.receipt, serverNow: at })) }; };
  return { create, readInterview, generate, start, readSession, saveAnswer, complete, removeInterview, listInterviews, history };
}
module.exports = { createPracticeService };
