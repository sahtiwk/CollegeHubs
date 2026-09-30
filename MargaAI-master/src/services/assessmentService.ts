import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db';
import { learner, learnerNodeState, quizItem, skillNode } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { QuizAgent } from './quizAgent';
import { ProgressAgent } from './progressAgent';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class AssessmentService {
  /**
   * Fetches the next optimal quiz item based on the learner's current theta.
   * Optionally updates the state with the result of the previous item.
   */
  static async getNextQuizItem(
    learnerId: string, 
    nodeId: string, 
    mode: 'checkpoint' | 'test_out' = 'checkpoint',
    previousResult?: { quizItemId: string, actualScore: number, newTheta: number },
    isFinal: boolean = false
  ) {
    // 1. Get learner state and node
    const [state] = await db.select().from(learnerNodeState)
      .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
    
    if (!state) {
      throw new Error(`Learner state not found for node ${nodeId}`);
    }

    const [node] = await db.select().from(skillNode).where(eq(skillNode.id, nodeId));
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Process previous result if provided
    let updatedSeenIds = state.seenQuizItemIds || [];
    let updatedTheta = state.thetaEstimate;
    
    if (previousResult) {
      updatedSeenIds = [...updatedSeenIds, previousResult.quizItemId];
      updatedTheta = Math.max(1.0, Math.min(5.0, previousResult.newTheta)); // Clamp theta
      
      await db.update(learnerNodeState)
        .set({ 
          thetaEstimate: updatedTheta,
          seenQuizItemIds: updatedSeenIds 
        })
        .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
    }

    if (isFinal) {
      return { success: true, isFinal: true, currentTheta: updatedTheta };
    }


    // 2. Determine current theta
    let currentTheta = updatedTheta;
    if (currentTheta === null) {
      // Fallback to domain seed
      const [l] = await db.select().from(learner).where(eq(learner.id, learnerId));
      if (l && l.skillVector) {
        currentTheta = (l.skillVector as Record<string, number>)[node.domain] || 0;
      } else {
        currentTheta = 0;
      }
    }

    // 3. Fetch available items from the bank
    let itemsQuery = db.select().from(quizItem).where(eq(quizItem.nodeId, nodeId));
    
    let allItems = await itemsQuery;
    let availableItems = allItems.filter(item => !updatedSeenIds.includes(item.id) && item.mode === mode);

    if (availableItems.length === 0) {
      // Replenish bank automatically
      await QuizAgent.generateItemBank(nodeId, 5, mode);
      allItems = await db.select().from(quizItem).where(eq(quizItem.nodeId, nodeId));
      availableItems = allItems.filter(item => !updatedSeenIds.includes(item.id) && item.mode === mode);

      if (availableItems.length === 0) {
        return { success: false, message: 'No more items available in the bank for this node.' };
      }
    }

    // 4. Find the item with difficulty closest to currentTheta
    availableItems.sort((a, b) => {
      const diffA = Math.abs(a.irtDifficultyB - currentTheta!);
      const diffB = Math.abs(b.irtDifficultyB - currentTheta!);
      return diffA - diffB;
    });

    const nextItem = availableItems[0];

    // Client evaluation mode: send correct option and explanation
    const rubric = nextItem.correctAnswerOrRubric as any;
    const clientItem = {
      id: nextItem.id,
      prompt: nextItem.prompt,
      answerType: nextItem.answerType,
      options: nextItem.answerType === 'mcq' ? (rubric?.options || []) : undefined,
      correctOption: nextItem.answerType === 'mcq' ? rubric?.correct : undefined,
      explanation: nextItem.answerType === 'mcq' ? rubric?.explanation : undefined,
      pointValue: nextItem.pointValue,
      irtDifficultyB: nextItem.irtDifficultyB // Need this on client to compute new theta
    };

    return { success: true, item: clientItem, currentTheta };
  }



  /**
   * Finalizes an attempt by evaluating the overall score.
   */
  static async evaluateCheckpoint(learnerId: string, nodeId: string, earnedPoints: number, totalPoints: number, mode: 'checkpoint' | 'test_out' = 'checkpoint') {
    const threshold = mode === 'test_out' ? 0.75 : 0.60;
    const safeTotalPoints = Math.max(1, totalPoints); // Prevent division by zero
    const scoreRatio = earnedPoints / safeTotalPoints;
    const passed = scoreRatio >= threshold;

    if (mode === 'test_out') {
      await db.update(learnerNodeState)
        .set({ testOutAttempted: true })
        .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
    }

    // Delegate to ProgressAgent for centralized side-effects
    const progressResult = await ProgressAgent.handleNodeAttemptEvent(learnerId, nodeId, {
      type: mode,
      passed,
      pointsEarned: earnedPoints,
      totalPoints
    });

    // Return the actual aura awarded so the UI can show the toast
    return { success: true, passed, scoreRatio, threshold, awardedAura: progressResult.awardedAura || 0 };
  }
}
