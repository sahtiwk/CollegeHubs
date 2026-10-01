import { NextResponse } from 'next/server';
import { LearnerStateService } from '@/services/learnerStateService';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    
    const body = await req.json();
    const { domain } = body;
    
    if (!domain) {
      return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
    }

    const result = await LearnerStateService.initializeLearnerGraph(userId, domain);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Init Graph Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to initialize graph' }, { status: 500 });
  }
}
