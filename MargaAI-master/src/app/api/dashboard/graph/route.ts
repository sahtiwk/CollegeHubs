import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { skillNode, learnerNodeState } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    const domain = req.nextUrl.searchParams.get('domain');

    let globalNodes = [];
    if (domain) {
      globalNodes = await db.select().from(skillNode).where(eq(skillNode.domain, domain));
    } else {
      globalNodes = await db.select().from(skillNode);
    }
    let userStates: any[] = [];
    
    if (userId) {
      userStates = await db.select().from(learnerNodeState).where(eq(learnerNodeState.learnerId, userId));
    }

    // Map states for O(1) lookup
    const stateMap = new Map(userStates.map(s => [s.nodeId, s]));

    const nodes = globalNodes.map(node => {
      const state = stateMap.get(node.id);
      return {
        id: node.id,
        label: node.label,
        domain: node.domain,
        category: node.category,
        difficulty: node.difficulty,
        linkedContentIds: node.linkedContentIds || [],
        status: (state?.status || 'locked').replace('_', '-'),
        testOutEligible: state?.testOutEligible || false,
        testOutAttempted: state?.testOutAttempted || false,
      };
    });

    const links: any[] = [];
    
    // Construct links natively for force-graph
    for (const node of globalNodes) {
      const state = stateMap.get(node.id);
      
      // Use personalized prerequisites if they exist, otherwise fallback to global prerequisites
      const prereqs = (state?.personalizedPrerequisiteIds && state.personalizedPrerequisiteIds.length > 0) 
        ? state.personalizedPrerequisiteIds 
        : (node.prerequisiteIds || []);
      
      for (const reqId of prereqs) {
        // Ensure source exists to prevent d3-force crashing
        if (globalNodes.some(n => n.id === reqId)) {
          links.push({
            source: reqId,
            target: node.id
          });
        }
      }
    }

    return NextResponse.json({ success: true, graphData: { nodes, links } });

  } catch (error: any) {
    console.error('Graph API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
