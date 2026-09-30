import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learner, learnerNodeState, skillNode } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ success: false, message: 'Domain is required' }, { status: 400 });
    }

    // 1. Fetch all node IDs for this domain
    const nodesInDomain = await db.select({ id: skillNode.id }).from(skillNode).where(eq(skillNode.domain, domain));
    const nodeIds = nodesInDomain.map(n => n.id);

    // 2. Delete all learnerNodeState entries for this user and domain
    if (nodeIds.length > 0) {
      await db.delete(learnerNodeState)
        .where(and(
          eq(learnerNodeState.learnerId, userId),
          inArray(learnerNodeState.nodeId, nodeIds)
        ));
    }

    // 3. Remove the domain from the learner's skillVector
    const [existingLearner] = await db.select().from(learner).where(eq(learner.id, userId));
    if (existingLearner && existingLearner.skillVector) {
      const currentSkillVector = existingLearner.skillVector as Record<string, number>;
      
      if (domain in currentSkillVector) {
        delete currentSkillVector[domain];
        
        await db.update(learner)
          .set({ skillVector: currentSkillVector })
          .where(eq(learner.id, userId));
      }
    }

    return NextResponse.json({ success: true, message: `Path ${domain} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting path:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
