import { NextRequest, NextResponse } from 'next/server';
import { getCoreSession, sessionStore, cookieOptions, privateHeaders } from '@/lib/coreSession';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    if ([...request.nextUrl.searchParams].length) return NextResponse.json({ error: 'Session identity cannot be selected by request parameters' }, { status: 400, headers: privateHeaders });
    return NextResponse.json(await getCoreSession(), { headers: privateHeaders });
  } catch (error) { return NextResponse.json({ error: 'Learn session unavailable. Start a new Core handoff.' }, { status: (error as {status?: number}).status || 503, headers: privateHeaders }); }
}
export async function DELETE(request: NextRequest) {
  try {
    await sessionStore().store.logout(request.cookies.get('ch_learn_session')?.value, request.headers.get('origin'), request.headers.get('x-csrf-token'));
    const response = new NextResponse(null, { status: 204, headers: privateHeaders });
    response.cookies.set('ch_learn_session', '', { ...cookieOptions, maxAge: 0 }); return response;
  } catch (error) { return NextResponse.json({ error: 'Session deletion denied' }, { status: (error as {status?: number}).status || 503, headers: privateHeaders }); }
}
