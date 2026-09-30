import { NextResponse } from 'next/server';
import { LLMProcessor } from '@/services/llmProcessor';

export async function POST(req: Request) {
  try {
    const result = await LLMProcessor.batchProcessItems();
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("LLM Processing Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to process items' }, { status: 500 });
  }
}
