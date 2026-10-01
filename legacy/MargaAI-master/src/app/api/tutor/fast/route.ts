import { NextRequest, NextResponse } from 'next/server';
import { TutorAgent } from '@/services/tutorAgent';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { nodeId, contentId } = body;

    if (!nodeId || !contentId) {
      return NextResponse.json({ success: false, message: 'nodeId and contentId are required' }, { status: 400 });
    }

    const result = await TutorAgent.getFastPathExplanation(userId, nodeId, contentId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in tutor fast path:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
