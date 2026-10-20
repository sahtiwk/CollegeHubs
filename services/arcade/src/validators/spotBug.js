const { randomInt, randomUUID } = require('node:crypto');
const { fail } = require('../errors');
const { ordered } = require('./ordered');
const bank = require('../data/bug-puzzles.v1.json');

function validateBank(content) {
  const bounded = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  if (content.version !== 'bug-puzzles-v1' || content.license !== 'CC0-1.0' || !bounded(content.provenance, 1000) || !bounded(content.review?.method, 1000) || !bounded(content.review?.reviewer, 100) || !/^\d{4}-\d{2}-\d{2}$/.test(content.review?.date) || !Array.isArray(content.puzzles) || content.puzzles.length < 5 || content.puzzles.length > 100) throw Error('Invalid bug puzzle metadata');
  const ids = new Set(), snippets = new Set();
  for (const q of content.puzzles) {
    if (!bounded(q.id, 64) || ids.has(q.id) || snippets.has(q.code) || q.version !== 1 || q.language !== 'javascript' || !['beginner','intermediate'].includes(q.difficulty) || !bounded(q.prompt, 500) || !bounded(q.code, 2000) || !bounded(q.explanation, 1000) || !Array.isArray(q.choices) || q.choices.length !== 3 || new Set(q.choices.map(c => c.id)).size !== 3 || new Set(q.choices.map(c => c.text)).size !== 3 || q.choices.some(c => !/^[a-c]$/.test(c.id) || !bounded(c.text, 300)) || !q.choices.some(c => c.id === q.answer)) throw Error('Invalid bug puzzle: ' + q.id);
    ids.add(q.id); snippets.add(q.code);
  }
  return true;
}
validateBank(bank);
function challenge(integer = randomInt, id = randomUUID) {
  const questions = structuredClone(bank.puzzles);
  for (let i = questions.length - 1; i > 0; i--) { const j = integer(i + 1); [questions[i], questions[j]] = [questions[j], questions[i]]; }
  return { contentVersion: bank.version, passThreshold: 4, questions: questions.slice(0, 5).map(q => ({ ...q, id: id() })) };
}
function transition(game, input, now) {
  const replay = ordered(game, input, ['questionId','choice'], 5, now);
  if (replay) return replay;
  const q = game.challenge.questions[game.actions.length];
  if (input.questionId !== q.id || !q.choices.some(c => c.id === input.choice)) throw fail(400, 'INVALID_CHOICE', 'Choose an option from the current question.');
  const correct = input.choice === q.answer;
  const count = game.actions.filter(a => a.correct).length + Number(correct);
  const status = input.seq === game.challenge.questions.length ? count >= game.challenge.passThreshold ? 'won' : 'lost' : 'active';
  return { step: { ...input, correct, status } };
}
function publicState(game, now) {
  const questions = game.challenge?.questions;
  const q = game.status === 'active' && +game.expiresAt > +now ? questions?.[game.actions.length] : null;
  return { total: questions?.length ?? 5, passThreshold: game.challenge?.passThreshold ?? 4, correctCount: game.actions.filter(a => a.correct).length,
    currentQuestion: q ? { id: q.id, prompt: q.prompt, code: q.code, language: q.language, choices: q.choices.map(c => ({ id: c.id, text: c.text })) } : null,
    feedback: questions ? game.actions.map(a => ({ seq: a.seq, correct: a.correct, explanation: questions[a.seq - 1].explanation })) : [] };
}
module.exports = { validateBank, challenge, transition, publicState };
