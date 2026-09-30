import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learner, skillNode, learnerNodeState } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { LearnerStateService } from '@/services/learnerStateService';
import { PlannerAgent } from '@/services/plannerAgent';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { domain, ratings, careerGoal } = await req.json();
    
    if (!domain || !ratings) {
      return NextResponse.json({ success: false, message: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Generate arbitrary DAG if it doesn't exist for this domain
    const seedTopics = Object.keys(ratings);
    await PlannerAgent.generateArbitraryDAG(domain, seedTopics);

    // 2. Initialize the global graph for this learner (scoped to domain)
    await LearnerStateService.initializeLearnerGraph(userId, domain);

    // 2. Translate seed ratings into a starting Theta estimate for the domain
    let baseTheta = 1.0; // Default: Newbie
    const scores = Object.values(ratings);
    const expertCount = scores.filter(s => s === 'Expert').length;
    const familiarCount = scores.filter(s => s === 'Familiar').length;
    
    if (expertCount > 0) {
      baseTheta = 3.5;
    } else if (familiarCount > 0) {
      baseTheta = 2.0;
    }

    // 4. Update the learner's skill vector
    const [existingLearner] = await db.select().from(learner).where(eq(learner.id, userId));
    
    let skillVector = (existingLearner?.skillVector as Record<string, number>) || {};
    skillVector[domain] = baseTheta;

    await db.update(learner)
      .set({ skillVector, careerGoal })
      .where(eq(learner.id, userId));

    // 5. Re-evaluate test-out eligibility across the graph based on the new seed theta
    // We already do this in initializeLearnerGraph, but since we updated the skillVector 
    // AFTER init, we need to run it again.
    const nodes = await db.select().from(skillNode).where(eq(skillNode.domain, domain));
    for (const node of nodes) {
      const isEligible = await LearnerStateService.evaluateTestOutEligibility(userId, node.id);
      if (isEligible) {
        await db.update(learnerNodeState)
          .set({ testOutEligible: true })
          .where(and(eq(learnerNodeState.learnerId, userId), eq(learnerNodeState.nodeId, node.id)));
      }
    }

    return NextResponse.json({ success: true, baseTheta, domain, redirectUrl: '/dashboard' });
  } catch (error: any) {
    console.error('Onboarding Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
