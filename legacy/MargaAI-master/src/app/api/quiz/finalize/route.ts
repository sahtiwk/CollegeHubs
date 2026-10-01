import { NextRequest, NextResponse } from 'next/server';
import { AssessmentService } from '@/services/assessmentService';
import { StreakService } from '@/services/streakService';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { nodeId, earnedPoints, totalPoints, mode } = body;

    if (!nodeId || earnedPoints === undefined || totalPoints === undefined) {
      return NextResponse.json({ success: false, message: 'nodeId, earnedPoints, and totalPoints are required' }, { status: 400 });
    }

    const result = await AssessmentService.evaluateCheckpoint(userId, nodeId, earnedPoints, totalPoints, mode || 'checkpoint');
    
    // Record activity asynchronously (fire and forget)
    StreakService.recordActivity(userId).catch(console.error);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error evaluating checkpoint:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
