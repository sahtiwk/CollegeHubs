import { NextResponse } from 'next/server';
import { db } from '@/db';
import { learner, learnerNodeState, auraEvent } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const authObj = await auth();
    const learnerId = authObj.userId;
    
    if (!learnerId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Wrap deletions in a transaction to ensure integrity
    await db.transaction(async (tx) => {
      // 1. Delete all aura events
      await tx.delete(auraEvent).where(eq(auraEvent.learnerId, learnerId));
      
      // 2. Delete all learner node states
      await tx.delete(learnerNodeState).where(eq(learnerNodeState.learnerId, learnerId));
      
      // 3. Delete the learner record itself
      await tx.delete(learner).where(eq(learner.id, learnerId));
    });

    return NextResponse.json({ success: true, message: 'Roadmap deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete roadmap:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
