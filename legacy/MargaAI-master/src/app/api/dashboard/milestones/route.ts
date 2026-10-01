import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auraEvent, skillNode } from '@/db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const domain = req.nextUrl.searchParams.get('domain');
    if (!domain) {
      return NextResponse.json({ success: false, message: 'Domain parameter is required' }, { status: 400 });
    }

    // Fetch recent aura events for this user that relate to completing a node (checkpoint_pass, test_out_pass, milestone_complete)
    // and join with skillNode to get the label, filter by the active domain
    const recentEvents = await db.select({
      id: auraEvent.id,
      nodeId: auraEvent.nodeId,
      type: auraEvent.type,
      pointsAwarded: auraEvent.pointsAwarded,
      createdAt: auraEvent.createdAt,
      nodeLabel: skillNode.label,
      nodeDifficulty: skillNode.difficulty
    })
      .from(auraEvent)
      .innerJoin(skillNode, eq(auraEvent.nodeId, skillNode.id))
      .where(
        and(
          eq(auraEvent.learnerId, userId),
          eq(skillNode.domain, domain),
          inArray(auraEvent.type, ['checkpoint_pass', 'test_out_pass', 'milestone_complete'])
        )
      )
      .orderBy(desc(auraEvent.createdAt))
      .limit(5);

    // Deduplicate by nodeId (in case they passed multiple things on the same node)
    const uniqueMilestones = [];
    const seenNodes = new Set();
    for (const event of recentEvents) {
      if (event.nodeId && !seenNodes.has(event.nodeId)) {
        seenNodes.add(event.nodeId);
        uniqueMilestones.push(event);
      }
    }

    // If no events found, fallback to checking learnerNodeState for completed nodes
    if (uniqueMilestones.length === 0) {
      // In a real scenario we'd do a complex query, but for now we'll just return empty or 
      // the frontend will handle empty state.
    }

    return NextResponse.json({ success: true, milestones: uniqueMilestones.slice(0, 3) });

  } catch (error: any) {
    console.error('Milestones API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
