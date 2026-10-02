const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const Room = require('../models/StudyRoom');
const Solution = require('../models/StudySolution');
const Problem = require('../models/Problem');
const messages = require('./messageService');
const { accessError } = require('./hubAccess');
const { transaction } = require('./nativeFactService');
const seed = require('../config/problems.seed.json');
const fail = (status, code, message) => { throw accessError(status, code, message); };
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
const member = (room, userId) => room.participantIds.some(id => String(id) === userId);
const scope = (context, id) => ({ _id: id, hubId: context.hubId });
const live = { status: 'active', $expr: { $gt: ['$endAt', '$$NOW'] } };
const buckets = new Map();
function rate(context, kind, limit, windowMs) {
  const now = Date.now(), key = kind + ':' + context.userId;
  for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
  const bucket = buckets.get(key) || { count: 0, until: now + windowMs };
  if (bucket.count >= limit || (!buckets.has(key) && buckets.size >= 10000)) fail(429, 'STUDY_RATE_LIMIT', 'Please wait before trying again');
  bucket.count++; buckets.set(key, bucket);
}
function fields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) fail(400, 'INVALID_STUDY_INPUT', 'Unexpected study fields');
}
const date = value => value ? new Date(value).toISOString() : null;
function roomDto(row) {
  return { _id: String(row._id), hubId: String(row.hubId), channelId: String(row.channelId), hostId: String(row.hostId),
    problem: row.problem, durationMinutes: row.durationMinutes, participantIds: row.participantIds.map(String),
    status: row.status, version: row.version, startAt: date(row.startAt), endAt: date(row.endAt),
    closedAt: date(row.closedAt), closeReason: row.closeReason, closeCount: row.closeCount };
}
function solutionDto(row) {
  return { _id: String(row._id), userId: String(row.userId), revision: row.revision, source: row.source, language: row.language,
    savedAt: date(row.savedAt), submittedAt: date(row.submittedAt), sealedAt: date(row.sealedAt), outcome: row.outcome, sourceHash: row.sourceHash };
}
async function authorized(claims, id, participant = true) {
  const context = await messages.authorize(claims);
  if (!objectId(id)) fail(404, 'STUDY_NOT_FOUND', 'Study room unavailable');
  const room = await Room.findOne(scope(context, id)).lean();
  if (!room || (participant && !member(room, context.userId))) fail(404, 'STUDY_NOT_FOUND', 'Study room unavailable');
  await messages.channelFor(context, String(room.channelId));
  return { context, room };
}
async function problems(claims) {
  const context = await messages.authorize(claims);
  // Immutable, versioned, Hub-local copies. No reset or modification of earlier seeds.
  await transaction(async session => {
    for (const item of seed) await Problem.updateOne({ hubId: context.hubId, slug: item.slug, version: item.version }, { $setOnInsert: { ...item, hubId: context.hubId } }, { upsert: true, session, runValidators: true });
  });
  const rows = await Problem.find({ hubId: context.hubId, $or: seed.map(({ slug, version }) => ({ slug, version })) }).sort({ slug: 1 }).limit(20).lean();
  return { items: rows.map(row => ({ _id: String(row._id), slug: row.slug, version: row.version, title: row.title, statement: row.statement, allowedLanguages: row.allowedLanguages })) };
}
async function create(claims, input) {
  fields(input, ['channelId', 'problemId', 'durationMinutes', 'clientRoomId']);
  const context = await messages.authorize(claims);
  await messages.channelFor(context, input.channelId);
  if (!objectId(input.problemId) || !Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 60 || typeof input.clientRoomId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(input.clientRoomId)) fail(400, 'INVALID_STUDY_INPUT', 'Choose a problem, duration of 5-60 minutes and a unique creation ID');
  const key = { hubId: context.hubId, hostId: context.userId, clientRoomId: input.clientRoomId };
  const replay = row => {
    if (String(row.channelId) !== input.channelId || String(row.problemId) !== input.problemId || row.durationMinutes !== input.durationMinutes) fail(409, 'STUDY_CREATE_CONFLICT', 'Creation ID already used for another room');
    return row;
  };
  const previous = await Room.findOne(key).lean();
  if (previous) { replay(previous); return snapshot(claims, String(previous._id)); }
  if (process.env.STUDY_ROOMS_ENABLED === 'false') fail(503, 'STUDY_CREATION_DISABLED', 'New study rooms are temporarily unavailable');
  rate(context, 'create', 10, 60000);
  const id = await transaction(async session => {
    const prior = await Room.findOne(key).session(session);
    if (prior) return String(replay(prior)._id);
    const problem = await Problem.findOne({ _id: input.problemId, hubId: context.hubId }).session(session).lean();
    if (!problem) fail(404, 'PROBLEM_NOT_FOUND', 'Problem unavailable');
    const [room] = await Room.create([{ ...key, channelId: input.channelId, problemId: problem._id,
      problem: { _id: String(problem._id), slug: problem.slug, version: problem.version, title: problem.title, statement: problem.statement, allowedLanguages: problem.allowedLanguages },
      durationMinutes: input.durationMinutes, participantIds: [context.userId] }], { session });
    await Solution.create([{ hubId: context.hubId, roomId: room._id, userId: context.userId }], { session });
    return room.id;
  });
  return snapshot(claims, id);
}
async function list(claims, query = {}) {
  fields(query, ['channelId', 'beforeId', 'limit']);
  const context = await messages.authorize(claims);
  await messages.channelFor(context, query.channelId);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if ((query.limit !== undefined && !['number', 'string'].includes(typeof query.limit)) || !Number.isInteger(limit) || limit < 1 || limit > 50 || (query.beforeId !== undefined && !objectId(query.beforeId))) fail(400, 'INVALID_STUDY_INPUT', 'Invalid room page');
  const rows = await Room.find({ hubId: context.hubId, channelId: query.channelId, $or: [{ status: 'waiting' }, { participantIds: context.userId }], ...(query.beforeId ? { _id: { $lt: query.beforeId } } : {}) }).sort({ _id: -1 }).limit(limit + 1).lean();
  return { items: rows.slice(0, limit).map(roomDto), hasMore: rows.length > limit };
}
async function join(claims, id, input = {}) {
  fields(input, []);
  const { context } = await authorized(claims, id, false);
  await transaction(async session => {
    const room = await Room.findOne(scope(context, id)).session(session);
    if (member(room, context.userId)) return; // Reconnect remains valid after start/close.
    if (room.status !== 'waiting') fail(409, 'STUDY_ALREADY_STARTED', 'Joining is only allowed while waiting');
    if (room.participantIds.length >= 8) fail(409, 'STUDY_FULL', 'A room holds at most eight participants');
    room.participantIds.push(context.userId); room.version++; room.fence++;
    await room.save({ session });
    await Solution.create([{ hubId: context.hubId, roomId: id, userId: context.userId }], { session });
  });
  return snapshot(claims, id);
}
async function start(claims, id, input = {}) {
  fields(input, []);
  const { context, room } = await authorized(claims, id);
  if (String(room.hostId) !== context.userId) fail(403, 'STUDY_HOST_REQUIRED', 'Only the host can start');
  await transaction(async session => {
    const current = await Room.findOne(scope(context, id)).session(session);
    if (current.status !== 'waiting') return; // Retry can never restart or extend.
    if (current.participantIds.length < 2) fail(409, 'STUDY_NEEDS_PEER', 'At least two participants are required');
    await Room.findOneAndUpdate({ ...scope(context, id), status: 'waiting' }, [{ $set: { status: 'active', startAt: '$$NOW', endAt: { $add: ['$$NOW', current.durationMinutes * 60000] }, version: { $add: ['$version', 1] }, fence: { $add: ['$fence', 1] } } }], { session, new: true });
  });
  return snapshot(claims, id);
}
async function fence(context, id, session) {
  // All draft/submission writes and deadline closure serialize on this same document.
  // The predicate and timestamp run in Mongo, independent of browser/Core wall clocks.
  const row = await Room.findOneAndUpdate({ ...scope(context, id), ...live }, [{ $set: { fence: { $add: ['$fence', 1] } } }], { session, new: true });
  if (!row) fail(409, 'STUDY_CLOSED', 'The room deadline has passed');
  return row;
}
function revision(value) { return Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER; }
async function save(claims, id, input) {
  fields(input, ['expectedRevision', 'revision', 'source', 'language']);
  const { context, room } = await authorized(claims, id);
  if (!revision(input.expectedRevision) || !revision(input.revision) || input.revision !== input.expectedRevision + 1 || typeof input.source !== 'string' || !room.problem.allowedLanguages.includes(input.language)) fail(400, 'INVALID_DRAFT', 'Use the next revision and an allowed language');
  if (Buffer.byteLength(input.source, 'utf8') > 32768) fail(413, 'DRAFT_TOO_LARGE', 'Source exceeds 32 KiB');
  const key = { hubId: context.hubId, roomId: id, userId: context.userId };
  const identical = row => row.revision === input.revision && row.source === input.source && row.language === input.language;
  const previous = await Solution.findOne(key).lean();
  if (identical(previous)) return snapshot(claims, id); // Lost ack retry, including after closure.
  if (previous.revision !== input.expectedRevision || previous.submittedAt || previous.sealedAt) fail(409, 'DRAFT_CONFLICT', 'Reload the acknowledged draft; this revision is stale or frozen');
  rate(context, 'draft', 2, 1000);
  await transaction(async session => {
    const current = await Solution.findOne(key).session(session);
    if (identical(current)) return;
    if (current.revision !== input.expectedRevision || current.submittedAt || current.sealedAt) fail(409, 'DRAFT_CONFLICT', 'Reload the acknowledged draft; this revision is stale or frozen');
    await fence(context, id, session);
    await Solution.updateOne({ ...key, revision: input.expectedRevision, sealedAt: null, submittedAt: null }, [{ $set: { source: { $literal: input.source }, language: { $literal: input.language }, revision: input.revision, savedAt: '$$NOW' } }], { session });
    // A stalled save which crosses the deadline rolls back, even after its first fence.
    await fence(context, id, session);
  });
  return snapshot(claims, id);
}
async function submit(claims, id, input) {
  fields(input, ['draftRevision']);
  const { context } = await authorized(claims, id);
  if (!revision(input.draftRevision)) fail(400, 'INVALID_DRAFT', 'Supply an acknowledged draft revision');
  await transaction(async session => {
    const key = { hubId: context.hubId, roomId: id, userId: context.userId };
    const current = await Solution.findOne(key).session(session);
    if (current.revision !== input.draftRevision) fail(409, 'DRAFT_CONFLICT', 'Submit the latest acknowledged draft revision');
    if (current.submittedAt) return;
    await fence(context, id, session);
    await Solution.updateOne(key, [{ $set: { submittedAt: '$$NOW' } }], { session });
    await fence(context, id, session);
  });
  return snapshot(claims, id);
}
async function closeDue(id) {
  // Internal worker only: no browser-selected force-close, deadline or Hub.
  if (!objectId(String(id))) return null;
  return transaction(async session => {
    const room = await Room.findOneAndUpdate({ _id: id, status: 'active', $expr: { $lte: ['$endAt', '$$NOW'] } }, [{ $set: {
      status: 'review', closedAt: '$$NOW', closeReason: 'deadline', closeCount: { $add: ['$closeCount', 1] }, version: { $add: ['$version', 1] }, fence: { $add: ['$fence', 1] },
    } }], { session, new: true });
    if (!room) return null;
    const solutions = await Solution.find({ hubId: room.hubId, roomId: room._id, userId: { $in: room.participantIds } }).session(session);
    if (solutions.length !== room.participantIds.length) throw new Error('Study participant draft invariant failed');
    for (const solution of solutions) {
      solution.sealedAt = room.closedAt;
      solution.sourceHash = createHash('sha256').update(solution.source).digest('hex');
      solution.outcome = solution.source.trim() ? 'submitted' : 'empty';
      await solution.save({ session });
    }
    return { roomId: room.id, hubId: String(room.hubId), status: room.status, version: room.version, closedAt: date(room.closedAt) };
  });
}
async function snapshot(claims, id) {
  const { context } = await authorized(claims, id);
  await closeDue(id); // Owned reads recover overdue work even between scans.
  return transaction(async session => {
    const [room] = await Room.aggregate([{ $match: { _id: new mongoose.Types.ObjectId(id), hubId: new mongoose.Types.ObjectId(context.hubId) } }, { $addFields: { serverNow: '$$NOW' } }]).session(session);
    const own = await Solution.findOne({ hubId: context.hubId, roomId: id, userId: context.userId }).session(session).lean();
    return { room: roomDto(room), ownSolution: solutionDto(own), serverNow: date(room.serverNow) };
  });
}
async function submissions(claims, id) {
  const result = await snapshot(claims, id);
  if (result.room.status !== 'review') fail(409, 'STUDY_PRIVATE', 'Peer solutions are private until the room closes');
  const rows = await Solution.find({ hubId: result.room.hubId, roomId: id, userId: { $in: result.room.participantIds }, sealedAt: { $ne: null } }).sort({ userId: 1 }).limit(8).lean();
  return { room: result.room, items: rows.map(solutionDto), serverNow: result.serverNow };
}
async function time(claims) {
  await messages.authorize(claims);
  const hello = await mongoose.connection.db.command({ hello: 1 });
  return { serverNow: date(hello.localTime) };
}
function errorDto(error) {
  return { error: { code: error.status ? error.code : 'STUDY_UNAVAILABLE', message: error.status ? error.message : 'Study rooms unavailable; retry or synchronize saved state', retryable: !error.status || [429, 503].includes(error.status) } };
}
module.exports = { problems, create, list, join, start, save, submit, snapshot, submissions, closeDue, time, fields, errorDto };
