import { db } from '../db';
import { learnerNodeState, skillNode } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { LearnerStateService } from './learnerStateService';
import { PlannerAgent } from './plannerAgent';
import { AuraEngine } from './auraEngine';

export interface AttemptEventData {
  type: 'checkpoint' | 'test_out';
  passed: boolean;
  pointsEarned: number;
  totalPoints: number;
}

export class ProgressAgent {
  /**
   * Central orchestrator for all progression logic following a quiz attempt.
   */
  static async handleNodeAttemptEvent(learnerId: string, nodeId: string, eventData: AttemptEventData) {
    const { type, passed, pointsEarned, totalPoints } = eventData;

    return await db.transaction(async (tx) => {
      // 1. Fetch current state
      const [state] = await tx.select().from(learnerNodeState)
        .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
      
      if (!state) throw new Error(`State not found for learner ${learnerId}, node ${nodeId}`);

      // Track attempt stats safely
      const newAttempts = state.attempts + 1;
      await tx.update(learnerNodeState)
        .set({ attempts: newAttempts })
        .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));

      // 2. Progression Update
      let awardedAura = 0;
      if (passed) {
        // Mark as completed
        await LearnerStateService.updateNodeStatus(learnerId, nodeId, 'completed', tx);
        
        // Centralized Graph Unblocking
        await LearnerStateService.unlockEligibleDownstreamNodes(learnerId, tx);

        // Phase 5.3 Gamification
        const attemptResult = await AuraEngine.awardAttemptAP(learnerId, nodeId, pointsEarned, type, newAttempts, tx);
        awardedAura += attemptResult.finalAP;
        const milestoneResult = await AuraEngine.awardMilestoneAP(learnerId, nodeId, tx);
        awardedAura += milestoneResult.finalAP;
        
        const [node] = await tx.select().from(skillNode).where(eq(skillNode.id, nodeId));
        
        // Gap 5: Fix Test-Out Mastery Desync
        if (type === 'test_out' && node) {
          const currentTheta = state.thetaEstimate || 0;
          if (currentTheta < node.difficulty) {
             await tx.update(learnerNodeState)
               .set({ thetaEstimate: node.difficulty })
               .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
          }
        }

        if (node) {
          await AuraEngine.evaluatePathCompletion(learnerId, node.domain, tx);
        }
      } else {
        // If failed, remain in_progress (or unlocked if it was a test_out)
        if (state.status === 'locked' || state.status === 'unlocked') {
          if (type !== 'test_out') {
             await LearnerStateService.updateNodeStatus(learnerId, nodeId, 'in_progress', tx);
          }
        }
        
        // Phase 5.2 Remedial Replanning
        if (newAttempts >= 2 && type !== 'test_out') {
          await PlannerAgent.insertRemedialNode(learnerId, nodeId, tx);
          console.log(`[ProgressAgent] Inserted remedial node for failed node ${nodeId} after ${newAttempts} attempts.`);
        }
      }

      return {
        success: true,
        nodeId,
        passed,
        newAttempts,
        awardedAura,
      };
    });
  }
}
