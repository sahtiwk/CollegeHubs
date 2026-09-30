import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { auth } from '@clerk/nextjs/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const authObj = await auth();
    if (!authObj.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { goal } = await req.json();

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json({ success: false, message: 'Goal is required' }, { status: 400 });
    }

    const prompt = `
      The user has stated their learning goal: "${goal}".
      Normalize this into a short, hyphenated domain slug (e.g. "rust-backend", "machine-learning").
      Then, generate exactly 3 fundamental "seed topics" (e.g. "Basic Syntax", "Linear Algebra") that the user should rate their existing knowledge on to start this trajectory.
      Return JSON: { "domain": string, "seedTopics": string[] }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            domain: { type: Type.STRING },
            seedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['domain', 'seedTopics']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return NextResponse.json({ success: true, domain: data.domain, seedTopics: data.seedTopics });
  } catch (error: any) {
    console.error('Profiler Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
