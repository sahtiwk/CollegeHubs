import 'dotenv/config';
import { db } from '../src/db/index';
import { learner, learnerNodeState } from '../src/db/schema';
import { eq, notInArray } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

async function cleanup() {
  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList({});
  const validIds = clerkUsers.data.map(u => u.id);
  
  if (validIds.length === 0) {
    console.log("No valid users found in clerk, skipping deletion.");
    return;
  }
  
  console.log("Valid Clerk User IDs:", validIds);
  
  // First delete learner_node_state for invalid users to satisfy foreign keys
  await db.delete(learnerNodeState).where(notInArray(learnerNodeState.learnerId, validIds));
  
  // Now delete the learners
  const res = await db.delete(learner).where(notInArray(learner.id, validIds)).returning();
  
  console.log(`Deleted ${res.length} fake learners from DB:`, res.map(r => r.id));
}

cleanup().catch(console.error).finally(() => process.exit(0));
