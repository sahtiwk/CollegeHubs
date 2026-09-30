import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db';
import { skillNode, contentItem, quizItem } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import crypto from 'crypto';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class QuizAgent {
  /**
   * Generates a bank of adaptive quiz items for a given skill node.
   * Grounded in the node's linked content.
   */
  static async generateItemBank(nodeId: string, count: number = 5, mode: 'checkpoint' | 'test_out' = 'checkpoint') {
    // 1. Fetch node
    const [node] = await db.select().from(skillNode).where(eq(skillNode.id, nodeId));
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // 2. Fetch linked content for grounding
    let contextText = 'No specific linked content provided. Generate based on general knowledge of the topic.';
    if (node.linkedContentIds && node.linkedContentIds.length > 0) {
      const contents = await db.select().from(contentItem).where(inArray(contentItem.id, node.linkedContentIds));
      if (contents.length > 0) {
        contextText = contents.map(c => `Title: ${c.title}\nSummary: ${c.resourceSummary || c.description}`).join('\n\n');
      }
    }

    // 3. Prepare Prompt
    const prompt = `
You are an expert technical curriculum designer. Generate a bank of ${count} quiz items for a skill node.
Node Topic: ${node.label}
Base Difficulty: ${node.difficulty} (Scale is roughly 1 to 5)

Content Context for grounding:
${contextText}

Instructions:
1. Generate strictly 'mcq' (Multiple Choice) questions. NEVER generate short answer, essay, or text-based questions.
${mode === 'test_out' ? '2. This is a TEST-OUT challenge. Generate harder questions strictly ABOVE the base difficulty (e.g., base + 0.5 to base + 2.0).' : '2. Vary the difficulty (irtDifficultyB) around the base difficulty (e.g., from base - 1.0 to base + 1.0).'}
3. Ensure questions are directly relevant to the Node Topic and grounded in the Content Context if provided.
4. For 'mcq', correctAnswerOrRubric MUST be an object: { "correct": "exact string matching one of the options", "explanation": "Detailed explanation of why the correct option is correct.", "options": ["option 1", "option 2", "option 3", "option 4"] }.

Return an array of objects matching the specified schema.
    `;

    // 4. Call LLM with Exponential Backoff
    let responseText = '';
    let retries = 3;
    let delay = 2000;

    for (let i = 0; i < retries; i++) {
      try {
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
                  prompt: { type: Type.STRING },
                  answerType: { type: Type.STRING, enum: ['mcq'] },
                  correctAnswerOrRubric: { 
                    type: Type.OBJECT,
                    properties: {
                      correct: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ['correct', 'explanation', 'options']
                  },
                  irtDifficultyB: { type: Type.NUMBER }
                },
                required: ['prompt', 'answerType', 'correctAnswerOrRubric', 'irtDifficultyB']
              }
            }
          }
        });

        if (!response.text) {
          throw new Error('LLM returned empty response.');
        }

        responseText = response.text;
        break; // Success, exit loop
      } catch (err: any) {
        console.error(`Gemini generation failed on attempt ${i + 1}:`, err.message);
        if (i === retries - 1) {
          throw new Error(`Failed to generate quiz items after ${retries} attempts: ${err.message}`);
        }
        // Only retry on rate limit (429) or server errors (500, 503)
        if (err.message && (err.message.includes('429') || err.message.includes('503') || err.message.includes('quota'))) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw err; // For other errors (like validation), fail immediately
        }
      }
    }

    const generatedItems = JSON.parse(responseText);

    // 5. Process and insert
    const inserts = generatedItems.map((item: any) => {
      const id = crypto.randomUUID();
      // Monotonic point scaling based on irtDifficultyB
      // Assuming irtDifficultyB ranges roughly -3 to +5. 
      // Example: base diff is 2, irt is 2.5 -> pointValue = Math.round((2.5 + 3) * 5) = 28
      const pointValue = Math.max(1, Math.round((item.irtDifficultyB + 3) * 5));

      return {
        id,
        nodeId,
        mode,
        prompt: item.prompt,
        answerType: item.answerType as 'mcq' | 'short_answer',
        correctAnswerOrRubric: item.correctAnswerOrRubric,
        irtDifficultyB: item.irtDifficultyB,
        pointValue
      };
    });

    // Bulk insert items safely without locking global node
    await db.insert(quizItem).values(inserts);

    return { success: true, count: inserts.length, items: inserts };
  }
}
