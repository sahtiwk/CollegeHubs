const { normalizeMessage } = require('@collegehubs/contracts/channel.cjs');
const native = require('./nativeFactService');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const User = require('../models/User');
const { verifyToken } = require('../config/auth');
const { requireHubAccess, accessError } = require('./hubAccess');
const fail = (status, code, message) => { throw accessError(status, code, message); };
const buckets = new Map();
function rateLimit(context) {
  const now = Date.now(), key = context.userId;
  for (const [id, value] of buckets) if (value.until <= now) buckets.delete(id);
  const value = buckets.get(key) || { count: 0, until: now + 60000 };
  if (value.count >= 30 || (!buckets.has(key) && buckets.size >= 10000)) fail(429, 'CHAT_RATE_LIMIT', 'Please wait a minute before sending more messages');
  value.count++; buckets.set(key, value);
}
async function authorize(claims) {
  if (!claims || claims.exp * 1000 <= Date.now()) fail(401, 'AUTH_EXPIRED', 'Sign in again');
  const context = await requireHubAccess(claims);
  if (context.hubId !== claims.hubId || context.membershipVersion !== claims.membershipVersion) fail(401, 'MEMBERSHIP_CHANGED', 'Sign in again');
  return context;
}
async function authenticateSocket(token) {
  let claims;
  try { claims = verifyToken(token); } catch { fail(401, 'AUTH_INVALID', 'Invalid or expired sign-in'); }
  await authorize(claims); return claims;
}
function fields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) fail(400, 'INVALID_INPUT', 'Unexpected message fields');
}
async function channelFor(context, channelId) {
  if (typeof channelId !== 'string' || !/^[a-f0-9]{24}$/i.test(channelId)) fail(404, 'CHANNEL_NOT_FOUND', 'Channel unavailable');
  const channel = await Channel.findOne({ _id: channelId, hubId: context.hubId, archivedAt: null }).lean();
  if (!channel) fail(404, 'CHANNEL_NOT_FOUND', 'Channel unavailable');
  return channel;
}
function dto(row) {
  return { _id: String(row._id), hubId: String(row.hubId), channelId: String(row.channelId), authorId: String(row.authorId), authorName: row.authorName, clientMessageId: row.clientMessageId, seq: row.seq, type: row.type, text: row.text, language: row.language, title: row.title, url: row.url, questionId: row.questionId ? String(row.questionId) : null, acceptedAnswerId: row.acceptedAnswerId ? String(row.acceptedAnswerId) : null, acceptedAt: row.acceptedAt ? new Date(row.acceptedAt).toISOString() : null, createdAt: new Date(row.createdAt).toISOString() };
}
async function send(claims, channelId, input, { applyNativeFact = null } = {}) {
  const context = await authorize(claims);
  await channelFor(context, channelId);
  const content = normalizeMessage(input);
  const key = { hubId: context.hubId, authorId: context.userId, clientMessageId: input.clientMessageId };
  function replay(row) {
    if (String(row.channelId) !== channelId || Object.entries(content).some(([key, value]) => String(row[key]) !== value)) fail(409, 'MESSAGE_CONFLICT', 'This send ID already belongs to a different message');
    return { message: dto(row), duplicate: true };
  }
  const existing = await Message.findOne(key).lean();
  if (existing) return replay(existing);
  rateLimit(context);
  const author = await User.findById(context.userId).select('username').lean();
  let result;
  try {
    await native.transaction(async session => {
      const prior = await Message.findOne(key).session(session).lean();
      if (prior) { result = replay(prior); return; }
      if (content.type === 'answer' && !await Message.exists({ _id: content.questionId, type: 'question', hubId: context.hubId, channelId }).session(session)) fail(404, 'QUESTION_NOT_FOUND', 'Question unavailable');
      const channel = await Channel.findOneAndUpdate({ _id: channelId, hubId: context.hubId, archivedAt: null, nextMessageSeq: { $lt: Number.MAX_SAFE_INTEGER } }, { $inc: { nextMessageSeq: 1 } }, { new: true, session });
      if (!channel) fail(404, 'CHANNEL_NOT_FOUND', 'Channel unavailable');
      const [row] = await Message.create([{ ...key, channelId, authorName: author.username, seq: channel.nextMessageSeq, ...content }], { session });
      if (['code', 'resource'].includes(content.type)) await native.record({ message: row, type: content.type + '.shared' }, session, applyNativeFact);
      result = { message: dto(row), duplicate: false };
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const committed = await Message.findOne(key).lean();
    if (!committed) throw error;
    return replay(committed);
  }
  return result;
}
function integer(value, fallback, max) {
  if (value === undefined) return fallback;
  if (!['number', 'string'].includes(typeof value) || !/^(0|[1-9][0-9]*)$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > max) fail(400, 'INVALID_CURSOR', 'Invalid history sequence or limit');
  return Number(value);
}
async function history(claims, channelId, query = {}) {
  const context = await authorize(claims), channel = await channelFor(context, channelId);
  fields(query, ['afterSeq', 'beforeSeq', 'limit', 'q', 'questionId']);
  const limit = integer(query.limit, 50, 50);
  if (!limit || (query.afterSeq !== undefined && query.beforeSeq !== undefined)) fail(400, 'INVALID_CURSOR', 'Use one history direction');
  const after = integer(query.afterSeq, null, Number.MAX_SAFE_INTEGER), before = integer(query.beforeSeq, null, Number.MAX_SAFE_INTEGER);
  const filter = { hubId: context.hubId, channelId, seq: { $lte: channel.nextMessageSeq, ...(after !== null ? { $gt: after } : {}), ...(before !== null ? { $lt: before } : {}) } };
  if (query.q !== undefined) {
    if (typeof query.q !== 'string' || !query.q.trim() || Buffer.byteLength(query.q, 'utf8') > 120) fail(400, 'INVALID_SEARCH', 'Search must be 1-120 UTF-8 bytes');
    const literal = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['text', 'title', 'url'].map(field => ({ [field]: { $regex: literal, $options: 'i' } }));
  }
  if (query.questionId !== undefined) {
    if (typeof query.questionId !== 'string' || !/^[a-f0-9]{24}$/.test(query.questionId)) fail(400, 'INVALID_THREAD', 'Invalid question ID');
    filter.questionId = query.questionId; filter.type = 'answer';
  }
  const rows = await Message.find(filter).maxTimeMS(2000).sort({ seq: after !== null ? 1 : -1 }).limit(limit + 1).lean();
  const hasMore = rows.length > limit, items = rows.slice(0, limit);
  if (after === null) items.reverse();
  return { hubId: context.hubId, channelId, title: channel.title, items: items.map(dto), latestSeq: channel.nextMessageSeq, hasMore };
}
function errorDto(error) {
  return { error: { code: error.status ? error.code : 'CHAT_UNAVAILABLE', message: error.status ? error.message : 'Messages unavailable; retry with the same send ID', retryable: !error.status || [429, 503].includes(error.status) } };
}
module.exports = { authorize, authenticateSocket, channelFor, send, history, errorDto, fields, dto };
