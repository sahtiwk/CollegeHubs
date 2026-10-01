import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learnerNodeState, skillNode } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch distinct domains the user has active states in
    // Since Drizzle might not support selectDistinct perfectly out of the box for joins in some older versions,
    // we'll just fetch the nodes the user has states for and extract domains.
    const userStates = await db.select({ domain: skillNode.domain })
      .from(learnerNodeState)
      .innerJoin(skillNode, eq(learnerNodeState.nodeId, skillNode.id))
      .where(eq(learnerNodeState.learnerId, userId));

    const domains = Array.from(new Set(userStates.map(s => s.domain)));

    return NextResponse.json({ success: true, domains });
  } catch (error: any) {
    console.error('Domains API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
