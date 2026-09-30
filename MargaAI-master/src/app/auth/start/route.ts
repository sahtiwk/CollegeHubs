import { NextRequest, NextResponse } from 'next/server';
import { sessionStore, cookieOptions, privateHeaders } from '@/lib/coreSession';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    if ([...request.nextUrl.searchParams].length) return NextResponse.json({ error: 'Unsupported handoff parameters' }, { status: 400, headers: privateHeaders });
    const { store, config } = sessionStore(); const state = await store.start();
    const url = new URL('/module-handoff', config.origin);
    url.searchParams.set('module', 'learn'); url.searchParams.set('state', state); url.searchParams.set('returnPath', '/learn');
    const response = NextResponse.redirect(url, 303);
    response.cookies.set('ch_learn_state', state, { ...cookieOptions, maxAge: 60 });
    Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value)); return response;
  } catch { return NextResponse.json({ error: 'Learn handoff unavailable. Return to Core and try again.' }, { status: 503, headers: privateHeaders }); }
}
