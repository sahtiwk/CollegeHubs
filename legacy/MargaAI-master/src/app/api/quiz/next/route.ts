import { NextRequest, NextResponse } from 'next/server';
import { AssessmentService } from '@/services/assessmentService';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { nodeId, mode, previousResult, isFinal } = body;

    if (!nodeId) {
      return NextResponse.json({ success: false, message: 'nodeId is required' }, { status: 400 });
    }

    const result = await AssessmentService.getNextQuizItem(userId, nodeId, mode || 'checkpoint', previousResult, isFinal);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching next quiz item:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
