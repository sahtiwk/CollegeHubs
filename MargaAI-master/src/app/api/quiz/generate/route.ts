import { NextRequest, NextResponse } from 'next/server';
import { QuizAgent } from '@/services/quizAgent';
import { db } from '@/db';
import { skillNode } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodeId, count } = body;

    if (!nodeId) {
      return NextResponse.json({ success: false, message: 'nodeId is required' }, { status: 400 });
    }

    // Verify node exists
    const [node] = await db.select().from(skillNode).where(eq(skillNode.id, nodeId));
    if (!node) {
      return NextResponse.json({ success: false, message: `Node ${nodeId} not found` }, { status: 404 });
    }

    const result = await QuizAgent.generateItemBank(nodeId, count || 5);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in quiz generation:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
