import 'dotenv/config';
import { db } from '../src/db/index';
import { learnerNodeState } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function test() {
  try {
    const learnerId = 'user_2kI0L2mZ2Qo5Z8rO9J5R5H4Y8W7'; // Need to fetch an actual user ID, but the screenshot has one. Wait, the screenshot says user_3IaSs4htHqtKuTl6lTFMuiV5JKH 
    // BUT the text is actually user_3IaSs4htHqtKuTl6lTFMuiV5JKH? Wait, I will just query the first learner in the DB and use their ID.
    
    console.log('Fetching state for node rust-basics-ownership...');
    const result = await db.select().from(learnerNodeState).where(eq(learnerNodeState.nodeId, 'rust-basics-ownership'));
    console.log('Success:', result);
  } catch (error) {
    console.error('FAILED!');
    console.error(error);
  } finally {
    process.exit(0);
  }
}

test();
