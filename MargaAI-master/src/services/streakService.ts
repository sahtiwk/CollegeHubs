import { db } from '../db';
import { learner } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuraEngine } from './auraEngine';

export class StreakService {
  /**
   * Records that the learner was active today.
   * Updates streakDays based on lastActive date.
   * Awards aura points for streak milestones.
   * 
   * @param learnerId 
   * @param txContext Optional transaction context if called from within a transaction
   */
  static async recordActivity(learnerId: string, txContext?: any) {
    const dbContext = txContext || db;
    
    // 1. Fetch current learner state
    const [l] = await dbContext.select().from(learner).where(eq(learner.id, learnerId));
    if (!l) return;

    const now = new Date();
    const lastActive = l.lastActive ? new Date(l.lastActive) : null;
    let newStreak = l.streakDays;
    let shouldUpdate = false;

    // Remove time components for pure day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (!lastActive) {
      // First time activity
      newStreak = 1;
      shouldUpdate = true;
    } else {
      const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
      
      const diffTime = Math.abs(today.getTime() - lastActiveDay.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Active yesterday, increment streak
        newStreak += 1;
        shouldUpdate = true;
      } else if (diffDays > 1) {
        // Streak broken
        newStreak = 1;
        shouldUpdate = true;
      } else {
        // Already active today, just update lastActive timestamp without touching streak
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      await dbContext.update(learner)
        .set({ 
          lastActive: now,
          streakDays: newStreak
        })
        .where(eq(learner.id, learnerId));
        
      // Award bonuses for milestones if streak increased
      if (newStreak > l.streakDays) {
        if (newStreak === 3) {
          await AuraEngine.awardPoints(learnerId, 'streak_bonus', null, { streakDays: newStreak }, txContext);
        } else if (newStreak === 7) {
          await AuraEngine.awardPoints(learnerId, 'streak_bonus', null, { streakDays: newStreak }, txContext);
        } else if (newStreak % 30 === 0) {
          await AuraEngine.awardPoints(learnerId, 'streak_bonus', null, { streakDays: newStreak }, txContext);
        }
      }
    }
  }
}
