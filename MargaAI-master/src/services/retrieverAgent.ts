import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db';
import { learner, learnerNodeState, skillNode, contentItem } from '../db/schema';
import { eq, and, inArray, sql, asc } from 'drizzle-orm';
import { LLMProcessor } from './llmProcessor';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class RetrieverAgent {
  static async getRecommendation(learnerId: string, nodeId: string) {
    // 1. Fetch node and learner state
    const [node] = await db.select().from(skillNode).where(eq(skillNode.id, nodeId));
    if (!node) throw new Error(`Node ${nodeId} not found`);

    if (!node.linkedContentIds || node.linkedContentIds.length === 0) {
      return { success: false, message: 'No content linked to this node.' };
    }

    const [state] = await db.select().from(learnerNodeState)
      .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, nodeId)));
    
    let currentTheta = state?.thetaEstimate;
    if (currentTheta == null) {
      const [l] = await db.select().from(learner).where(eq(learner.id, learnerId));
      currentTheta = (l?.skillVector as Record<string, number>)?.[node.domain] || 0;
    }

    // 2. Vector Search (Sub-phase 4.1)
    // If there is only 1 linked content, skip LLM re-ranking
    if (node.linkedContentIds.length === 1) {
      const [item] = await db.select().from(contentItem).where(eq(contentItem.id, node.linkedContentIds[0]));
      return { success: true, recommendedItem: item, reasoning: 'Direct match - only one resource available.' };
    }

    // Generate embedding for the node label to find the most conceptually relevant items
    const targetVector = await LLMProcessor.generateEmbedding(node.label);
    if (!targetVector) {
      throw new Error(`Failed to generate embedding for node ${node.label}`);
    }
    const vectorString = `[${targetVector.join(',')}]`;

    // Fetch and sort by cosine distance (using Drizzle's sql template for pgvector <=> operator)
    const candidates = await db.select()
      .from(contentItem)
      .where(inArray(contentItem.id, node.linkedContentIds))
      .orderBy(asc(sql`${contentItem.embedding} <=> ${vectorString}::vector`))
      .limit(3);

    // 3. LLM Re-ranking & Guardrail
    const prompt = `
You are an expert tutor. I have a learner with a skill level (theta) of ${currentTheta} on a scale of roughly -3 to +3.
They need to learn about: "${node.label}"

Here are the candidate resources:
${candidates.map(c => `ID: ${c.id}\nTitle: ${c.title}\nDifficulty (1-5): ${c.estimatedDifficulty || 3}\nSummary: ${c.resourceSummary || c.description}\n---\n`).join('')}

Select the SINGLE BEST resource ID for this learner. The difficulty of the resource should ideally align with their skill level.
Return a JSON object with:
"recommended_content_id": the exact string ID of the chosen resource.
"reasoning": a short explanation of why this is the best fit for their current skill level.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommended_content_id: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ['recommended_content_id', 'reasoning']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const chosenId = parsed.recommended_content_id;

    // 4. Hallucination Guardrail Enforcement (Sub-phase 4.2)
    if (!node.linkedContentIds.includes(chosenId)) {
      console.warn(`Guardrail caught hallucinated ID: ${chosenId}. Falling back to top vector match.`);
      return { 
        success: true, 
        recommendedItem: candidates[0], 
        reasoning: 'Fallback - top relevance match.' 
      };
    }

    const chosenItem = candidates.find(c => c.id === chosenId);
    return { 
      success: true, 
      recommendedItem: chosenItem, 
      reasoning: parsed.reasoning 
    };
  }
}
