import { db } from '../db';
import { learner, learnerNodeState, skillNode, contentItem, llmCache } from '../db/schema';
import { eq, and, inArray, sql, asc } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { LLMProcessor } from './llmProcessor';
import crypto from 'crypto';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class TutorAgent {
  /**
   * Generates a fast, template-based explanation for a recommendation without LLM latency.
   */
  static async getFastPathExplanation(learnerId: string, nodeId: string, contentId: string) {
    // 1. Fetch current node
    const [node] = await db.select().from(skillNode).where(eq(skillNode.id, nodeId));
    if (!node) throw new Error(`Node ${nodeId} not found`);

    // 2. Fetch recommended content
    const [content] = await db.select().from(contentItem).where(eq(contentItem.id, contentId));
    if (!content) throw new Error(`Content ${contentId} not found`);

    // 3. Fetch learner's state/theta
    const [state] = await db.select().from(learnerNodeState)
      .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
    
    let currentTheta = state?.thetaEstimate;
    if (currentTheta == null) {
      const [l] = await db.select().from(learner).where(eq(learner.id, learnerId));
      currentTheta = (l?.skillVector as Record<string, number>)?.[node.domain] || 0;
    }

    // Determine difficulty string
    const diffMatch = Math.abs(currentTheta - (content.estimatedDifficulty || 3)) < 1.0 
      ? 'a perfect difficulty match for your current level'
      : 'a good challenge based on your current level';

    // 4. Graph Grounding (Prerequisites)
    let explanation = '';
    
    if (!node.prerequisiteIds || node.prerequisiteIds.length === 0) {
      // Root Node
      explanation = `This is a foundational topic in the ${node.domain} domain. Because it has no prerequisites, it's the perfect starting point. We selected this specific resource because it is ${diffMatch}.`;
    } else {
      // Dependent Node
      const prereqs = await db.select().from(skillNode).where(inArray(skillNode.id, node.prerequisiteIds));
      const prereqLabels = prereqs.map(p => p.label).join(' and ');
      
      explanation = `This module builds directly upon your knowledge of ${prereqLabels}. We selected this specific resource because it is ${diffMatch}.`;
    }

    return {
      success: true,
      explanation,
      metadata: {
        theta: currentTheta,
        itemDifficulty: content.estimatedDifficulty
      }
    };
  }

  /**
   * Generates a grounded, open-ended answer for a learner's query using LLM and vector search.
   * Employs a strict distance-based guardrail against hallucination and a caching layer.
   */
  static async getSlowPathAnswer(learnerId: string, nodeId: string | null | undefined, query: string) {
    // 1. Fetch current node (if provided)
    let nodeLabel = '';
    if (nodeId) {
      const [node] = await db.select().from(skillNode).where(eq(skillNode.id, nodeId));
      if (!node) throw new Error(`Node ${nodeId} not found`);
      nodeLabel = node.label;
    }

    // 2. Vector Retrieval (Requires LLM call for embedding - fallback applied)
    let targetVector: number[] | undefined | null = null;
    try {
        targetVector = await LLMProcessor.generateEmbedding(query);
    } catch (e) {
        console.error('LLM embedding fallback triggered due to error:', e);
        return {
            success: true,
            answer: "Our AI systems are currently under heavy load and cannot process this specific question right now. Please try again later.",
            groundingFound: false
        };
    }

    if (!targetVector) {
      throw new Error('Failed to generate embedding for query');
    }
    const vectorString = `[${targetVector.join(',')}]`;

    // Fetch top 3 closest items across the DB based on the user's query
    const distanceSql = sql`${contentItem.embedding} <=> ${vectorString}::vector`;
    const candidates = await db.select({
        item: contentItem,
        distance: distanceSql
      })
      .from(contentItem)
      .orderBy(asc(distanceSql))
      .limit(3);

    // 3. Hard Guardrail (Distance Threshold)
    const REFUSAL_THRESHOLD = 0.35;
    
    if (candidates.length === 0 || (candidates[0].distance as number) > REFUSAL_THRESHOLD) {
      // Short-circuit: The query is too far from any known grounded content.
      console.warn(`Slow path guardrail triggered: best distance ${(candidates[0]?.distance as number) || 'N/A'} > ${REFUSAL_THRESHOLD}`);
      return {
        success: true,
        answer: "I do not have enough grounded information to answer this accurately based on our curriculum resources.",
        groundingFound: false
      };
    }

    // 4. LLM Generation
    const contextText = candidates.map(c => 
      `Title: ${c.item.title}\nSummary: ${c.item.resourceSummary || c.item.description}`
    ).join('\n---\n');

    const prompt = `
You are an expert tutor helping a learner${nodeLabel ? ` who is currently studying the topic: "${nodeLabel}"` : ''}.
The learner has asked the following question: "${query}"

Below are summaries of the most relevant curriculum resources we have. 
You MUST answer the learner's question STRICTLY based on the provided context. 
If the context does not contain the answer, you must state that you don't know based on the provided materials. Do NOT invent facts.

Context:
${contextText}
    `;

    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
    const [cached] = await db.select().from(llmCache).where(eq(llmCache.promptHash, promptHash));
    if (cached) {
        return {
            success: true,
            answer: cached.response,
            groundingFound: true,
            references: candidates.map(c => c.item.title),
            cached: true
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt
        });

        const answerText = response.text || '';
        
        if (answerText) {
            await db.insert(llmCache).values({
                id: crypto.randomUUID(),
                promptHash,
                response: answerText
            });
        }

        return {
            success: true,
            answer: answerText,
            groundingFound: true,
            references: candidates.map(c => c.item.title)
        };
    } catch (e) {
        console.error('LLM generation fallback triggered due to error:', e);
        return {
            success: true,
            answer: "Our AI systems are currently under heavy load. I've found some relevant resources for you, but cannot generate a conversational summary right now. Please review the recommended materials.",
            groundingFound: true,
            references: candidates.map(c => c.item.title)
        };
    }
  }
}
