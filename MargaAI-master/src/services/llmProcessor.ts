import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db';
import { contentItem } from '../db/schema';
import { isNull, eq } from 'drizzle-orm';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class LLMProcessor {
  static async processItem(item: any) {
    const prompt = `
      You are an expert curriculum designer. Given the following learning resource, estimate its difficulty on a scale from 1 (beginner) to 5 (advanced) and confirm its domain (backend, frontend, data_science, dsa, devops).
      
      Title: ${item.title}
      Description: ${item.description || item.title}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimated_difficulty: { type: Type.INTEGER },
            domain: { type: Type.STRING }
          },
          required: ['estimated_difficulty', 'domain']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return {
      estimatedDifficulty: data.estimated_difficulty,
      domain: data.domain
    };
  }

  static async generateEmbedding(text: string) {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text
    });
    return response.embeddings?.[0]?.values;
  }

  static async batchProcessItems() {
    const items = await db.select().from(contentItem).where(isNull(contentItem.estimatedDifficulty)).limit(10);
    
    let count = 0;
    for (const item of items) {
      console.log(`Processing item: ${item.title}`);
      
      const tags = await this.processItem(item);
      const textToEmbed = `${item.title}. ${item.description || ''}`;
      const embedding = await this.generateEmbedding(textToEmbed);
      
      await db.update(contentItem)
        .set({
          estimatedDifficulty: tags.estimatedDifficulty,
          // @ts-ignore
          domain: tags.domain,
          embedding: embedding
        })
        .where(eq(contentItem.id, item.id));
        
      count++;
    }
    
    return { processed: count };
  }
}
