// Adapted from MargaAI AssessmentService: answer keys and grading remain server-only.
import type { Question } from './plannerAgent.ts';
export type Mode = 'checkpoint' | 'test-out';
export type SavedAnswer = { optionId: string; requestId: string };
export function gradeAttempt(mode: Mode, questions: Pick<Question, 'id' | 'correct'>[], answers: Record<string, { optionId: string }>) {
  const total = mode === 'checkpoint' ? 5 : mode === 'test-out' ? 10 : 0;
  if (!total || questions.length !== total || questions.some(q => !answers[q.id])) throw Error('Incomplete assessment');
  const correctCount = questions.filter(q => answers[q.id].optionId === q.correct).length;
  const ratio = correctCount / total, threshold = mode === 'checkpoint' ? 0.6 : 0.8;
  return { correctCount, itemCount: total, ratio, threshold, passed: ratio >= threshold, theta: Math.round((6 * ratio - 3) * 100) / 100 };
}
