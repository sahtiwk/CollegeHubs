const Message = require('../models/Message');
const messages = require('./messageService');
const native = require('./nativeFactService');
const { accessError } = require('./hubAccess');
const hidden = () => accessError(404, 'QUESTION_NOT_FOUND', 'Question or answer unavailable');
async function questionFor(claims, questionId) {
  const context = await messages.authorize(claims);
  if (typeof questionId !== 'string' || !/^[a-f0-9]{24}$/.test(questionId)) throw hidden();
  const question = await Message.findOne({ _id: questionId, hubId: context.hubId, type: 'question' }).lean();
  if (!question) throw hidden();
  await messages.channelFor(context, String(question.channelId));
  return { context, question };
}
async function thread(claims, questionId, query) {
  const { question } = await questionFor(claims, questionId);
  messages.fields(query, ['afterSeq', 'beforeSeq', 'limit']);
  const page = await messages.history(claims, String(question.channelId), { ...query, questionId });
  const accepted = question.acceptedAnswerId ? await Message.findOne({ _id: question.acceptedAnswerId, hubId: question.hubId, channelId: question.channelId, questionId, type: 'answer' }).lean() : null;
  return { ...page, question: messages.dto(question), acceptedAnswer: accepted ? messages.dto(accepted) : null };
}
async function accept(claims, questionId, input, { applyNativeFact = null } = {}) {
  messages.fields(input, ['answerId']);
  const { context, question } = await questionFor(claims, questionId);
  if (String(question.authorId) !== context.userId) throw accessError(403, 'QUESTION_OWNER_REQUIRED', 'Only the question author can accept an answer');
  if (typeof input.answerId !== 'string' || !/^[a-f0-9]{24}$/.test(input.answerId)) throw hidden();
  return native.transaction(async session => {
    const answer = await Message.findOne({ _id: input.answerId, hubId: context.hubId, channelId: question.channelId, questionId, type: 'answer' }).session(session);
    if (!answer) throw hidden();
    if (String(answer.authorId) === context.userId) throw accessError(403, 'SELF_ACCEPTANCE_FORBIDDEN', 'Choose an answer from another person');
    const current = await Message.findOne({ _id: questionId, hubId: context.hubId, authorId: context.userId, type: 'question' }).session(session);
    if (!current) throw hidden();
    if (current.acceptedAnswerId) {
      if (String(current.acceptedAnswerId) !== answer.id) throw accessError(409, 'ANSWER_ALREADY_ACCEPTED', 'An accepted answer cannot be changed');
      return { question: messages.dto(current), duplicate: true };
    }
    current.acceptedAnswerId = answer._id; current.acceptedAt = new Date();
    await current.save({ session });
    await native.record({ message: answer, type: 'answer.accepted', occurredAt: current.acceptedAt }, session, applyNativeFact);
    return { question: messages.dto(current), duplicate: false };
  });
}
module.exports = { thread, accept };
