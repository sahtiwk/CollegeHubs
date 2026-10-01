import { db } from '../db';
import { learner } from '../db/schema';
import { eq } from 'drizzle-orm';

export class ProfilerAgent {
  /**
   * Maps qualitative string ratings to numerical seed theta values.
   */
  static ratingToTheta(rating: string): number {
    switch (rating.toLowerCase()) {
      case 'new': return -1.5;
      case 'some': return -0.5;
      case 'comfortable': return 0.5;
      case 'advanced': return 1.5;
      default: return -1.5; // Default to new if invalid
    }
  }

  /**
   * Processes a learner's onboarding self-ratings and updates their skill vector.
   * domainRatings is a map of domain names to rating strings.
   * E.g., { 'frontend': 'some', 'backend': 'new' }
   */
  static async processSelfRating(learnerId: string, domainRatings: Record<string, string>) {
    // 1. Fetch learner (ensure they exist, or create them)
    let [existingLearner] = await db.select().from(learner).where(eq(learner.id, learnerId));
    
    if (!existingLearner) {
      await db.insert(learner).values({ id: learnerId });
      [existingLearner] = await db.select().from(learner).where(eq(learner.id, learnerId));
    }

    // 2. Prepare updated skill vector
    const currentVector: Record<string, number> = (existingLearner.skillVector as Record<string, number>) || {};
    
    for (const [domain, rating] of Object.entries(domainRatings)) {
      currentVector[domain] = this.ratingToTheta(rating);
    }

    // 3. Update learner
    await db.update(learner)
      .set({ skillVector: currentVector })
      .where(eq(learner.id, learnerId));

    return { success: true, updatedSkillVector: currentVector };
  }
}
