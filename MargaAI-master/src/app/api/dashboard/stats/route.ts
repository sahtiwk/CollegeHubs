import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learner, auraEvent } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await db.select().from(learner).where(eq(learner.id, userId)).limit(1);
    
    if (userProfile.length === 0) {
      return NextResponse.json({ success: false, message: 'Learner not found' }, { status: 404 });
    }

    const [activityCount] = await db.select({ count: count() }).from(auraEvent).where(eq(auraEvent.learnerId, userId));

    return NextResponse.json({ 
      success: true, 
      stats: {
        auraPoints: userProfile[0].auraPoints,
        streakDays: userProfile[0].streakDays,
        auraTier: userProfile[0].auraTier,
        activitiesDone: activityCount.count,
        createdAt: userProfile[0].createdAt
      }
    });

  } catch (error: any) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
