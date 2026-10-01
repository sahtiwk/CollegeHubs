import 'dotenv/config';
import { db } from '../src/db/index';
import { quizItem } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function fixDb() {
  console.log('Cleaning up invalid quiz items...');
  
  const allItems = await db.select().from(quizItem);
  let invalidIds = [];
  
  for (const item of allItems) {
    if (item.answerType !== 'mcq') {
      invalidIds.push(item.id);
      continue;
    }
    const rubric = item.correctAnswerOrRubric as any;
    if (!rubric || !rubric.options || !Array.isArray(rubric.options) || rubric.options.length === 0) {
      invalidIds.push(item.id);
    }
  }
  
  if (invalidIds.length > 0) {
    console.log(`Found ${invalidIds.length} invalid items. Deleting...`);
    await db.delete(quizItem).where(
      sql`${quizItem.id} IN (${sql.join(invalidIds.map(id => sql`${id}`), sql`, `)})`
    );
    console.log('Deleted invalid items.');
  } else {
    console.log('No invalid items found.');
  }
}

fixDb().catch(console.error).finally(() => process.exit(0));
