const { randomInt, randomUUID } = require('node:crypto');
const { fail } = require('../errors');
const { ordered } = require('./ordered');
function challenge() {
  const questions = Array.from({ length: 40 }, () => {
    const operation = ['+', '-', '*', '/'][randomInt(4)];
    let num1, num2, answer;
    if (operation === '+') { num1 = randomInt(100); num2 = randomInt(100); answer = num1 + num2; }
    if (operation === '-') { num1 = randomInt(100); num2 = randomInt(num1 + 1); answer = num1 - num2; }
    if (operation === '*') { num1 = randomInt(12); num2 = randomInt(12); answer = num1 * num2; }
    if (operation === '/') { num2 = randomInt(1, 12); answer = randomInt(10); num1 = num2 * answer; }
    return { id: randomUUID(), num1, num2, operation, answer };
  });
  return { questions };
}
function transition(game, input, now) {
  if (typeof input?.questionId !== 'string' || input.questionId.length > 64 || !Number.isSafeInteger(input.answer) || input.answer < -1000 || input.answer > 1000) throw fail(400, 'INVALID_ANSWER', 'Enter a whole-number answer.');
  const replay = ordered(game, input, ['questionId', 'answer'], 120, now);
  if (replay) return replay;
  const question = game.challenge.questions[game.mathState.questionIndex];
  if (!question || input.questionId !== question.id) throw fail(409, 'QUESTION_MISMATCH', 'Answer the currently issued question.');
  const correct = input.answer === question.answer;
  const attempts = game.actions.filter(row => row.questionId === question.id).length + 1;
  const advance = correct || attempts >= 3;
  return {
    step: { ...input, correct, hint: correct ? 'correct' : advance ? 'skipped' : 'try_again', status: 'active' },
    mathState: { questionIndex: game.mathState.questionIndex + (advance ? 1 : 0), correctCount: game.mathState.correctCount + (correct ? 1 : 0) },
  };
}
function finish(game, now) {
  if (game.status !== 'active') return game.status;
  if (+now - +game.createdAt < 30000) throw fail(409, 'MINIMUM_DURATION', 'Play for at least 30 seconds before finishing.');
  return game.mathState.correctCount >= 5 ? 'won' : 'lost';
}
module.exports = { challenge, transition, finish };
