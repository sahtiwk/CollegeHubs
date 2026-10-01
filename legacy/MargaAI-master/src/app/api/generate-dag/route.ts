import { NextResponse } from 'next/server';
import { PlannerAgent } from '@/services/plannerAgent';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 });
    }

    const result = await PlannerAgent.generateDAG(slug);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("DAG Generation Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to generate DAG' }, { status: 500 });
  }
}
