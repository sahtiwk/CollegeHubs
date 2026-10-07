import { randomInt, randomUUID } from 'node:crypto';
import type { Question } from './plannerAgent.ts';
export function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
// Freeze fresh opaque question/option IDs. The public DTO never includes correct/explanation.
export function snapshotQuestions(items: Question[]) {
  return shuffled(items).map(q => {
    let correct = '';
    const options = shuffled(q.options).map(o => { const id = randomUUID(); if (o.id === q.correct) correct = id; return { id, text: o.text }; });
    return { ...q, seedId: q.id, id: randomUUID(), options, correct };
  });
}
