const { randomUUID } = require('node:crypto');
const { fail, exact } = require('../errors');
const TYPES = ['technical', 'behavioral', 'situational', 'system-design', 'coding'];
const RUBRIC = 'interview-five-v1';
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
function validateQuestions(value, types) {
  const invalid = () => { throw fail(503, 'AI_INVALID_RESPONSE'); };
  if (!exact(value, ['questions']) || !Array.isArray(value.questions) || value.questions.length !== 5) invalid();
  const questions = value.questions.map((q, i) => {
    if (!exact(q, ['questionText', 'category', 'difficulty', 'expectedKeywords']) || !text(q.questionText, 1000) || q.category !== types[i % types.length] || !['easy', 'medium', 'hard'].includes(q.difficulty) || !Array.isArray(q.expectedKeywords) || q.expectedKeywords.length < 1 || q.expectedKeywords.length > 5 || q.expectedKeywords.some(k => !text(k, 80))) invalid();
    return { id: randomUUID(), questionText: q.questionText.trim(), category: q.category, difficulty: q.difficulty, expectedKeywords: q.expectedKeywords.map(k => k.trim()) };
  });
  if (new Set(questions.map(q => q.questionText.toLowerCase())).size !== 5) invalid();
  return questions;
}
function evaluateReport(value, questions, answers) {
  const invalid = () => { throw fail(503, 'AI_INVALID_RESPONSE'); };
  if (questions.length !== 5 || answers.length !== 5 || !exact(value, ['summary', 'answers']) || !text(value.summary, 1500) || !Array.isArray(value.answers) || value.answers.length !== 5) invalid();
  const ids = new Set();
  for (const a of value.answers) { if (!exact(a, ['questionId', 'score', 'feedback']) || !questions.some(q => q.id === a.questionId) || ids.has(a.questionId) || !Number.isInteger(a.score) || a.score < 0 || a.score > 10 || !text(a.feedback, 1000)) invalid(); ids.add(a.questionId); }
  let answeredCount = 0;
  const graded = questions.map(q => {
    const a = answers.find(a => a.questionId === q.id), result = value.answers.find(a => a.questionId === q.id);
    if (!a) invalid();
    const answered = !a.skipped && Boolean(a.answer?.trim()); if (answered) answeredCount++;
    return { questionId: q.id, score: answered ? result.score : 0, feedback: answered ? result.feedback.trim() : 'Skipped or unanswered. Scored zero.' };
  });
  return { summary: value.summary.trim(), answers: graded, score: Math.round(100 * graded.reduce((sum, a) => sum + a.score, 0) / 50), answeredCount, rubricVersion: RUBRIC };
}
module.exports = { TYPES, RUBRIC, validateQuestions, evaluateReport };
