const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
const NativeFact = require('../models/NativeFact');
const hash = value => createHash('sha256').update(value).digest('hex');
const day = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
async function transaction(work) {
  // First-insert semantic-key races retry the whole domain transaction.
  for (let attempt = 0; attempt < 5; attempt++) {
    try { return await mongoose.connection.transaction(work, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 }); }
    catch (error) { if (error.code !== 11000 || attempt === 4) throw error; }
  }
}
async function record({ message, type, userId = message.authorId, occurredAt = message.createdAt }, session, applyNativeFact = null) {
  if (!session?.inTransaction()) throw new Error('Native facts require the domain transaction');
  const at = new Date(occurredAt), dayKey = day(at);
  let source = String(message._id);
  if (type === 'code.shared') source = message.text.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (type === 'resource.shared') { const url = new URL(message.url); url.hash = ''; url.searchParams.sort(); source = url.href; }
  const normalizedSourceHash = hash(source);
  const businessKey = hash(JSON.stringify([String(message.hubId), String(userId), type, ...(type === 'answer.accepted' ? [] : [dayKey]), normalizedSourceHash]));
  const existing = await NativeFact.findOne({ businessKey }).session(session);
  if (existing) return existing;
  const [fact] = await NativeFact.create([{ eventId: `core:${type}:${message._id}:v1`, businessKey, hubId: message.hubId, userId, sourceId: message._id, type, occurredAt: at, dayKey, normalizedSourceHash }], { session });
  // Internal server composition only. P6 supplies canonical scoring here; no browser/env switch.
  // The scorer must use this session, never an independent transaction or external side effect.
  if (applyNativeFact) {
    const receipt = await applyNativeFact(fact.toObject(), session);
    if (!receipt || receipt.eventId !== fact.eventId) throw new Error('Native scorer must return the matching durable receipt');
    fact.status = 'settled'; fact.receipt = receipt; await fact.save({ session });
  }
  return fact;
}
module.exports = { record, transaction };
