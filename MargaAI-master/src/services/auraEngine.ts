import { db } from '../db';
import { learner, auraEvent, skillNode, learnerNodeState } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export class AuraEngine {
  
  static getTierForPoints(points: number): 'Spark' | 'Ember' | 'Flame' | 'Blaze' | 'Aurora' {
    if (points >= 50000) return 'Aurora';
    if (points >= 15000) return 'Blaze';
    if (points >= 5000) return 'Flame';
    if (points >= 1000) return 'Ember';
    return 'Spark';
  }
  
  static async awardPoints(
    learnerId: string,
    type: 'checkpoint_pass' | 'milestone_complete' | 'path_complete' | 'test_out_pass' | 'streak_bonus',
    nodeId: string | null,
    breakdown: any,
    txContext: any = db
  ) {
    const [l] = await txContext.select().from(learner).where(eq(learner.id, learnerId));
    if (!l) return;

    let finalAP = 0;
    if (type === 'streak_bonus') {
      const streak = breakdown.streakDays || 1;
      if (streak === 3) finalAP = 50;
      else if (streak === 7) finalAP = 150;
      else if (streak % 30 === 0) finalAP = 1000;
      breakdown.final = finalAP;
    }

    if (finalAP <= 0) return;

    const execute = async (tx: any) => {
      await tx.insert(auraEvent).values({
        id: crypto.randomUUID(),
        learnerId,
        nodeId: nodeId || null,
        type,
        pointsAwarded: finalAP,
        breakdown
      });

      const newPoints = l.auraPoints + finalAP;
      const newTier = this.getTierForPoints(newPoints);

      await tx.update(learner)
        .set({ auraPoints: newPoints, auraTier: newTier })
        .where(eq(learner.id, learnerId));

      if (newTier !== l.auraTier) {
        console.log(`[AuraEngine] Learner ${learnerId} upgraded to tier ${newTier}! (Bonus)`);
      }
      return { finalAP, tierUpgraded: newTier !== l.auraTier ? newTier : false };
    };

    if (txContext === db) {
      return await db.transaction(execute);
    } else {
      return await execute(txContext);
    }
  }
  
  static async awardAttemptAP(
    learnerId: string, 
    nodeId: string, 
    rawScore: number, 
    type: 'checkpoint' | 'test_out', 
    attempts: number,
    txContext: any = db
  ) {
    const [l] = await txContext.select().from(learner).where(eq(learner.id, learnerId));
    if (!l) throw new Error('Learner not found');

    const streakDays = l.streakDays || 0;
    const streakBonus = 1 + 0.05 * Math.min(streakDays, 10); // Capped at x1.5

    let multiplier = 10;
    let baseAP = rawScore * multiplier;
    
    let isFirstTryBonus = 1.0;
    let typeModifier = 1.0;

    if (type === 'checkpoint') {
      isFirstTryBonus = attempts === 1 ? 1.2 : 1.0;
    } else if (type === 'test_out') {
      typeModifier = 0.7; // Single attempt by definition, 0.7 handicap
    }

    const finalAP = Math.round(baseAP * typeModifier * isFirstTryBonus * streakBonus);

    const breakdown = {
      base: baseAP,
      typeModifier,
      firstTryBonus: isFirstTryBonus,
      streakBonus,
      final: finalAP
    };

    const eventType = type === 'checkpoint' ? 'checkpoint_pass' : 'test_out_pass';

    const execute = async (tx: any) => {
      await tx.insert(auraEvent).values({
        id: crypto.randomUUID(),
        learnerId,
        nodeId,
        type: eventType,
        pointsAwarded: finalAP,
        breakdown
      });

      const newPoints = l.auraPoints + finalAP;
      const newTier = this.getTierForPoints(newPoints);

      await tx.update(learner)
        .set({ auraPoints: newPoints, auraTier: newTier })
        .where(eq(learner.id, learnerId));

      if (newTier !== l.auraTier) {
        console.log(`[AuraEngine] Learner ${learnerId} upgraded to tier ${newTier}! (Attempt)`);
      }

      return { finalAP, tierUpgraded: newTier !== l.auraTier ? newTier : false };
    };

    if (txContext === db) {
      return await db.transaction(execute);
    } else {
      return await execute(txContext);
    }
  }

  static async awardMilestoneAP(learnerId: string, nodeId: string, txContext: any = db) {
    const [l] = await txContext.select().from(learner).where(eq(learner.id, learnerId));
    if (!l) return { finalAP: 0, tierUpgraded: false as const };

    const depth = await this.calculateNodeDepth(nodeId, txContext);
    // Depth weight = 1 + 0.2 * (depth - 1), capped at x3
    const depthWeight = Math.min(3.0, 1 + 0.2 * (Math.max(1, depth) - 1));
    const finalAP = Math.round(50 * depthWeight);

    const breakdown = {
      base: 50,
      depth,
      depthWeight,
      final: finalAP
    };

    const execute = async (tx: any) => {
      await tx.insert(auraEvent).values({
        id: crypto.randomUUID(),
        learnerId,
        nodeId,
        type: 'milestone_complete',
        pointsAwarded: finalAP,
        breakdown
      });

      const newPoints = l.auraPoints + finalAP;
      const newTier = this.getTierForPoints(newPoints);

      await tx.update(learner)
        .set({ auraPoints: newPoints, auraTier: newTier })
        .where(eq(learner.id, learnerId));

      if (newTier !== l.auraTier) {
        console.log(`[AuraEngine] Learner ${learnerId} upgraded to tier ${newTier}! (Milestone)`);
      }

      return { finalAP, tierUpgraded: newTier !== l.auraTier ? newTier : false };
    };

    if (txContext === db) {
      return await db.transaction(execute);
    } else {
      return await execute(txContext);
    }
  }

  static async evaluatePathCompletion(learnerId: string, domain: string, txContext: any = db) {
    const [l] = await txContext.select().from(learner).where(eq(learner.id, learnerId));
    if (!l) return;

    const allDomainNodes = await txContext.select().from(skillNode).where(eq(skillNode.domain, domain as any));
    const nodeIds = allDomainNodes.map((n: any) => n.id);

    if (nodeIds.length === 0) return;

    const allStates = await txContext.select().from(learnerNodeState)
      .where(eq(learnerNodeState.learnerId, learnerId));
    
    const completedSet = new Set(allStates.filter((s: any) => s.status === 'completed').map((s: any) => s.nodeId));

    const allCompleted = nodeIds.every((id: string) => completedSet.has(id));

    if (allCompleted) {
      const pastEvents = await txContext.select().from(auraEvent)
        .where(and(eq(auraEvent.learnerId, learnerId), eq(auraEvent.type, 'path_complete')));
      
      const alreadyAwarded = pastEvents.some((e: any) => (e.breakdown as any)?.domain === domain);
      
      if (!alreadyAwarded) {
        const execute = async (tx: any) => {
          const finalAP = Math.round(500 * (nodeIds.length / 10));
          await tx.insert(auraEvent).values({
            id: crypto.randomUUID(),
            learnerId,
            type: 'path_complete',
            pointsAwarded: finalAP,
            breakdown: {
              domain,
              totalNodes: nodeIds.length,
              base: 500,
              multiplier: nodeIds.length / 10,
              final: finalAP
            }
          });

          const newPoints = l.auraPoints + finalAP;
          const newTier = this.getTierForPoints(newPoints);

          await tx.update(learner)
            .set({ auraPoints: newPoints, auraTier: newTier })
            .where(eq(learner.id, learnerId));

          if (newTier !== l.auraTier) {
            console.log(`[AuraEngine] Learner ${learnerId} upgraded to tier ${newTier}! (Path Complete)`);
          }
        };

        if (txContext === db) {
          await db.transaction(execute);
        } else {
          await execute(txContext);
        }
      }
    }
  }

  static async calculateNodeDepth(nodeId: string, txContext: any = db): Promise<number> {
    const [node] = await txContext.select().from(skillNode).where(eq(skillNode.id, nodeId));
    if (!node || !node.prerequisiteIds || node.prerequisiteIds.length === 0) return 1;

    let maxPrereqDepth = 0;
    for (const pId of node.prerequisiteIds) {
      const d = await this.calculateNodeDepth(pId, txContext);
      if (d > maxPrereqDepth) {
        maxPrereqDepth = d;
      }
    }

    return maxPrereqDepth + 1;
  }
}
