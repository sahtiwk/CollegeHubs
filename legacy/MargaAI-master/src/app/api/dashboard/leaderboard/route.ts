import { db } from '@/db';
import { learner } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const topLearners = await db.select().from(learner).orderBy(desc(learner.auraPoints)).limit(50);
    
    // Fetch Clerk users in parallel if we have learners
    let clerkUsers: any[] = [];
    if (topLearners.length > 0) {
      const userIds = topLearners.map(l => l.id);
      
      // Clerk allows fetching multiple users by passing an array of userIds
      try {
        const client = await clerkClient();
        const userList = await client.users.getUserList({ userId: userIds });
        clerkUsers = userList.data || [];
      } catch (clerkError) {
        console.error("Failed to fetch Clerk users:", clerkError);
      }
    }
    
    const userMap = new Map();
    for (const u of clerkUsers) {
      userMap.set(u.id, u);
    }
    
    const leaderboard = topLearners.map((l, index) => {
      const u = userMap.get(l.id);
      let name = 'Anonymous Learner';
      
      if (u) {
        const first = u.firstName || '';
        const last = u.lastName || '';
        
        if (first) {
          name = `${first} ${last ? last.charAt(0) + '.' : ''}`;
        } else if (u.username) {
          name = u.username;
        } else if (u.emailAddresses && u.emailAddresses.length > 0) {
          const email = u.emailAddresses[0].emailAddress;
          name = email.split('@')[0];
        }
      }
      
      return {
        id: l.id,
        rank: index + 1,
        name,
        points: l.auraPoints,
        tier: l.auraTier,
        streak: l.streakDays
      };
    });
    
    return Response.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return Response.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
