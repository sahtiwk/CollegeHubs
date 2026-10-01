import { NextResponse } from 'next/server';
import { RoadmapAdapter } from '@/services/roadmapAdapter';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    // Optionally protect this route so only authenticated users or admins can trigger it
    // await auth.protect();

    const body = await req.json();
    const { slug } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 });
    }

    const result = await RoadmapAdapter.getTrajectory(slug);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Roadmap Ingestion Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to ingest roadmap' }, { status: 500 });
  }
}
