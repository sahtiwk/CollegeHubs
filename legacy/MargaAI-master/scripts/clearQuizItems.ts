import { db } from '../src/db/index';
import { quizItem, learnerNodeState } from '../src/db/schema';

async function main() {
  console.log('Deleting all quiz items...');
  await db.delete(quizItem);
  console.log('✓ Quiz items cleared');

  console.log('Resetting seenQuizItemIds for all learner states...');
  await db.update(learnerNodeState).set({ seenQuizItemIds: [] });
  console.log('✓ seenQuizItemIds reset');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
