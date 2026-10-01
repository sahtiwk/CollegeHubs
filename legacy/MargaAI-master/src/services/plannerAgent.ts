import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db';
import { contentItem, skillNode, learnerNodeState } from '../db/schema';
import { arrayContains, eq, and, sql, asc } from 'drizzle-orm';
import { LLMProcessor } from './llmProcessor';
import crypto from 'crypto';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class PlannerAgent {
  static async generateDAG(slug: string) {
    // 1. Fetch content items for this trajectory
    const items = await db.select().from(contentItem).where(arrayContains(contentItem.topicTags, [slug]));
    
    if (items.length === 0) {
      throw new Error(`No content items found for trajectory: ${slug}`);
    }

    // Prepare context for LLM
    const topicContext = items.map(i => ({
      id: i.id,
      title: i.title,
      description: i.description,
      domain: i.domain,
      difficulty: i.estimatedDifficulty
    }));

    const prompt = `
      You are an expert curriculum designer. Given the following learning topics, propose a logical prerequisite graph (Directed Acyclic Graph).
      Return an array of node objects. Each node must represent one of the provided topics and must include:
      - 'id': A new unique string identifier (e.g., lowercase-kebab-name).
      - 'label': The topic title.
      - 'domain': The domain of the topic (e.g., 'frontend').
      - 'difficulty': The estimated difficulty.
      - 'linkedContentIds': An array containing exactly the provided original content ID for this topic.
      - 'prerequisiteIds': An array of 'id' strings referencing other nodes in this array that MUST be learned before this one.

      Topics:
      ${JSON.stringify(topicContext, null, 2)}
    `;

    // 2. Generate DAG via LLM
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              domain: { type: Type.STRING },
              difficulty: { type: Type.NUMBER },
              linkedContentIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              prerequisiteIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['id', 'label', 'domain', 'difficulty', 'linkedContentIds', 'prerequisiteIds']
          }
        }
      }
    });

    let nodes = JSON.parse(response.text || '[]');

    // 3. Simple Cycle Detection and Edge Dropping
    nodes = this.removeCycles(nodes);

    // 4. Insert into database
    await db.transaction(async (tx) => {
      // @ts-ignore
      await tx.insert(skillNode).values(nodes.map(n => ({
        id: n.id,
        domain: n.domain,
        label: n.label,
        difficulty: n.difficulty,
        prerequisiteIds: n.prerequisiteIds,
        linkedContentIds: n.linkedContentIds,
        checkpointItemBank: []
      })));
    });

    return { success: true, nodesGenerated: nodes.length, nodes };
  }

  static async generateArbitraryDAG(domain: string, seedTopics: string[]) {
    // Check if we already have nodes for this domain
    const existing = await db.select().from(skillNode).where(eq(skillNode.domain, domain));
    if (existing.length > 0) {
      return { success: true, nodesGenerated: 0, nodes: existing };
    }

    const prompt = `
      You are an expert curriculum designer. A learner wants to study the trajectory: "${domain}".
      They have self-rated their knowledge on these fundamental topics: ${seedTopics.join(', ')}.
      Propose a logical prerequisite graph (Directed Acyclic Graph) of about 10-15 key skills/topics they need to master for this trajectory.
      Return an array of node objects. Each node must include:
      - 'id': A new unique string identifier (e.g., lowercase-kebab-name).
      - 'label': The topic title.
      - 'domain': Exactly "${domain}".
      - 'difficulty': The estimated difficulty (1.0 to 5.0).
      - 'linkedContentIds': An empty array [].
      - 'prerequisiteIds': An array of 'id' strings referencing other nodes in this array that MUST be learned before this one.

      Ensure the graph flows logically from basics to advanced.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              domain: { type: Type.STRING },
              difficulty: { type: Type.NUMBER },
              linkedContentIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              prerequisiteIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['id', 'label', 'domain', 'difficulty', 'linkedContentIds', 'prerequisiteIds']
          }
        }
      }
    });

    let nodes = JSON.parse(response.text || '[]');
    nodes = this.removeCycles(nodes);

    await db.transaction(async (tx) => {
      // @ts-ignore
      await tx.insert(skillNode).values(nodes.map(n => ({
        id: n.id,
        domain: n.domain,
        label: n.label,
        difficulty: n.difficulty,
        prerequisiteIds: n.prerequisiteIds,
        linkedContentIds: n.linkedContentIds,
        checkpointItemBank: []
      })));
    });

    return { success: true, nodesGenerated: nodes.length, nodes };
  }

  /**
   * Scoped Incremental Replanning:
   * Inserts a fundamental remedial node precisely behind a failed node without regenerating the graph.
   */
  static async insertRemedialNode(learnerId: string, failedNodeId: string, txContext: any = db) {
    // 1. Fetch failed node
    const [failedNode] = await txContext.select().from(skillNode).where(eq(skillNode.id, failedNodeId));
    if (!failedNode) throw new Error('Failed node not found');

    // 2. Generate Remedial Node via LLM
    const prompt = `
      The learner is struggling with the topic: "${failedNode.label}" (Difficulty: ${failedNode.difficulty}, Domain: ${failedNode.domain}).
      Generate ONE fundamental, remedial topic that serves as a necessary prerequisite to understanding this.
      The difficulty MUST be lower than ${failedNode.difficulty}.
      Return JSON:
      {
        "label": "Fundamentals of ...",
        "difficulty": number,
        "domain": "${failedNode.domain}"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            difficulty: { type: Type.NUMBER },
            domain: { type: Type.STRING }
          },
          required: ['label', 'difficulty', 'domain']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    // Enforce lower difficulty mathematically
    const remedialDiff = Math.min(data.difficulty, failedNode.difficulty - 0.5);
    const remedialId = `${failedNodeId}_remedial_${Date.now()}`;

    // Gap 2: Fix Empty Remedial Node Trap
    let linkedContentIds: string[] = [];
    try {
      const targetVector = await LLMProcessor.generateEmbedding(data.label || '');
      if (targetVector) {
        const vectorString = `[${targetVector.join(',')}]`;
        const distanceSql = sql`${contentItem.embedding} <=> ${vectorString}::vector`;
        const candidates = await txContext.select({ id: contentItem.id }).from(contentItem).orderBy(asc(distanceSql)).limit(1);
        linkedContentIds = candidates.map((c: any) => c.id);
      }
    } catch (e) {
      console.warn("Failed to retrieve content for remedial node:", e);
    }

    // 3. Insert new node globally (Prototype scoping)
    // @ts-ignore
    await txContext.insert(skillNode).values({
      id: remedialId,
      domain: failedNode.domain,
      label: data.label,
      difficulty: Math.max(1.0, remedialDiff),
      prerequisiteIds: failedNode.prerequisiteIds || [], // Inherit original prereqs
      linkedContentIds: linkedContentIds,
      checkpointItemBank: []
    });

    // 4. Update the failed node's PERSONALIZED prerequisites (Gap 1)
    const updatedPrereqs = [...(failedNode.prerequisiteIds || []), remedialId];
    
    await txContext.update(learnerNodeState)
      .set({ 
        personalizedPrerequisiteIds: updatedPrereqs,
        status: 'locked' // Re-lock it because they now have a new unmet prereq
      })
      .where(and(eq(learnerNodeState.learnerId, learnerId), eq(learnerNodeState.nodeId, failedNodeId)));

    // 5. State re-evaluation for this learner
    await txContext.insert(learnerNodeState).values({
      learnerId,
      nodeId: remedialId,
      status: 'unlocked',
      attempts: 0,
      testOutEligible: false,
      testOutAttempted: false
    });

    return {
      success: true,
      remedialNodeId: remedialId,
      label: data.label
    };
  }

  private static removeCycles(nodes: any[]) {
    // Robust cycle and hallucination detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const safeEdges = new Map<string, string[]>();

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const safePrereqs: string[] = [];
      const prereqs = nodeMap.get(nodeId)?.prerequisiteIds || [];

      for (const prereqId of prereqs) {
        // 1. Guardrail: Drop self-loops
        if (prereqId === nodeId) {
          console.warn(`Self-loop detected on ${nodeId}. Dropping edge.`);
          continue;
        }

        // 2. Guardrail: Drop hallucinated node IDs
        if (!nodeMap.has(prereqId)) {
          console.warn(`Hallucinated prereq ${prereqId} on ${nodeId}. Dropping edge.`);
          continue;
        }

        // 3. Guardrail: Cycle detection (Back-edges)
        if (!visited.has(prereqId)) {
          dfs(prereqId);
          safePrereqs.push(prereqId);
        } else if (recursionStack.has(prereqId)) {
          console.warn(`Cycle detected from ${nodeId} to ${prereqId}. Dropping edge.`);
        } else {
          // Already visited and safe (Cross-edge / Forward-edge)
          safePrereqs.push(prereqId);
        }
      }

      safeEdges.set(nodeId, safePrereqs);
      recursionStack.delete(nodeId);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    // Apply safe edges
    for (const node of nodes) {
      node.prerequisiteIds = safeEdges.get(node.id) || [];
    }

    return nodes;
  }
}
