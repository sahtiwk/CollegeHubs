import { db } from '../db';
import { skillNode, learnerNodeState, learner } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export class LearnerStateService {
  
  /**
   * Initializes the graph for a learner.
   * Root nodes are unlocked, all others are locked.
   */
  static async initializeLearnerGraph(learnerId: string, domain: string, txContext: any = db) {
    // 1. Ensure learner exists
    const [existingLearner] = await txContext.select().from(learner).where(eq(learner.id, learnerId));
    if (!existingLearner) {
      await txContext.insert(learner).values({ id: learnerId });
    }

    // 2. Fetch all nodes in the global skill graph for this domain
    const nodes = await txContext.select().from(skillNode).where(eq(skillNode.domain, domain));
    
    if (nodes.length === 0) return { success: false, message: `No nodes found in the global skill graph for domain: ${domain}` };

    const stateInserts = nodes.map((node: any) => {
      // If prereqs array is null or empty, it's a root node
      const isRoot = !node.prerequisiteIds || node.prerequisiteIds.length === 0;
      
      return {
        learnerId,
        nodeId: node.id,
        status: isRoot ? 'unlocked' : 'locked',
        testOutEligible: false, // We will evaluate this on read or after init
        testOutAttempted: false,
        attempts: 0
      } as const;
    });

    // Bulk insert learner states
    await txContext.insert(learnerNodeState).values(stateInserts).onConflictDoNothing();

    // 3. Evaluate test-out eligibility for the newly unlocked root nodes
    const rootNodes = stateInserts.filter((s: any) => s.status === 'unlocked');
    for (const rn of rootNodes) {
      const isEligible = await this.evaluateTestOutEligibility(learnerId, rn.nodeId, txContext);
      if (isEligible) {
        await txContext.update(learnerNodeState)
          .set({ testOutEligible: true })
          .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, rn.nodeId)));
      }
    }

    return { success: true, nodesInitialized: stateInserts.length };
  }

  /**
   * Updates a node status. (Downstream unlocking is now managed by ProgressAgent).
   */
  static async updateNodeStatus(learnerId: string, nodeId: string, status: 'locked' | 'unlocked' | 'in_progress' | 'completed', txContext: any = db) {
    await txContext.update(learnerNodeState)
      .set({ status })
      .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
  }

  /**
   * Evaluates if a node is eligible for test-out.
   */
  static async evaluateTestOutEligibility(learnerId: string, nodeId: string, txContext: any = db): Promise<boolean> {
    const [state] = await txContext.select().from(learnerNodeState)
      .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
    
    if (!state || state.status !== 'unlocked' || state.testOutAttempted) {
      return false;
    }

    const [node] = await txContext.select().from(skillNode).where(eq(skillNode.id, nodeId));
    if (!node) return false;

    let aggregateTheta = 0;

    if (!node.prerequisiteIds || node.prerequisiteIds.length === 0) {
      // Root node: fallback to learner's initial seed self-rating (skillVector)
      const [l] = await txContext.select().from(learner).where(eq(learner.id, learnerId));
      if (l && l.skillVector) {
        const theta = (l.skillVector as Record<string, number>)[node.domain] || 0;
        aggregateTheta = theta;
      }
    } else {
      // Normal node: average of prerequisite thetas
      const prereqStates = await txContext.select().from(learnerNodeState)
        .where(
          and(
            eq(learnerNodeState.learnerId, learnerId),
            inArray(learnerNodeState.nodeId, node.prerequisiteIds)
          )
        );
      
      const totalTheta = prereqStates.reduce((sum: number, s: any) => sum + (s.thetaEstimate || 0), 0);
      aggregateTheta = prereqStates.length > 0 ? totalTheta / prereqStates.length : 0;
    }

    // Eligibility condition: theta is >= node difficulty minus 0.5
    return aggregateTheta >= (node.difficulty - 0.5);
  }

  /**
   * Routine to sweep the graph and unlock nodes whose prereqs are all complete.
   */
  static async unlockEligibleDownstreamNodes(learnerId: string, txContext: any = db) {
    const allStates = await txContext.select().from(learnerNodeState).where(eq(learnerNodeState.learnerId, learnerId));
    const allNodes = await txContext.select().from(skillNode);

    const completedNodeIds = new Set(allStates.filter((s: any) => s.status === 'completed').map((s: any) => s.nodeId));
    const stateMap = new Map<string, any>(allStates.map((s: any) => [s.nodeId, s]));

    for (const node of allNodes) {
      const state = stateMap.get(node.id);
      if (state && state.status === 'locked') {
        const prereqs = state.personalizedPrerequisiteIds || node.prerequisiteIds || [];
        const allPrereqsCompleted = prereqs.every((p: string) => completedNodeIds.has(p));
        
        if (allPrereqsCompleted) {
          // Unlock it
          await txContext.update(learnerNodeState)
            .set({ status: 'unlocked' })
            .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, node.id)));

          // Evaluate test-out immediately upon unlock
          const isEligible = await this.evaluateTestOutEligibility(learnerId, node.id, txContext);
          if (isEligible) {
            await txContext.update(learnerNodeState)
              .set({ testOutEligible: true })
              .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, node.id)));
          }
        }
      }
    }
  }
}
