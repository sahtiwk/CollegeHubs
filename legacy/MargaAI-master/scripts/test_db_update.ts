import 'dotenv/config';
import { db } from '../src/db/index';
import { learnerNodeState } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function test() {
  try {
    const learnerId = 'user_3IaSs4htHqtKuT16lTFMuiv5JKH';
    const nodeId = 'rust-basics-ownership';
    
    const [state] = await db.select().from(learnerNodeState)
      .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
      
    console.log('Current seen ids:', state.seenQuizItemIds);
    
    const newSeenIds = [...(state.seenQuizItemIds || []), 'new-item-id-8'];
    
    console.log('Updating DB...');
    await db.update(learnerNodeState)
      .set({ 
        thetaEstimate: 3.5,
        seenQuizItemIds: newSeenIds 
      })
      .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
      
    console.log('Update success!');
  } catch (error) {
    console.error('FAILED!');
    console.error(error);
  } finally {
    process.exit(0);
  }
}

test();
