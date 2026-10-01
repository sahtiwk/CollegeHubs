import { NextRequest, NextResponse } from 'next/server';
import { ProfilerAgent } from '@/services/profilerAgent';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { domainRatings } = body;

    if (!domainRatings) {
      return NextResponse.json({ success: false, message: 'domainRatings is required' }, { status: 400 });
    }

    const result = await ProfilerAgent.processSelfRating(userId, domainRatings);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error processing self rating:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
