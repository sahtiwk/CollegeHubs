import { NextRequest, NextResponse } from 'next/server';
import { sessionStore, cookieOptions, privateHeaders } from '@/lib/coreSession';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  let response: NextResponse;
  try {
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded' || Number(request.headers.get('content-length') || 0) > 2048) throw new Error('Invalid callback');
    const reader = request.body?.getReader(); if (!reader) throw new Error('Missing form');
    let length = 0; const chunks: Uint8Array[] = [];
    for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 2048) { await reader.cancel(); throw new Error('Oversize'); } chunks.push(part.value); }
    const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    if ([...form.keys()].sort().join(',') !== 'grant,module,state') throw new Error('Invalid fields');
    const { store, config } = sessionStore();
    const session = await store.callback({ origin: request.headers.get('origin'), cookieState: request.cookies.get('ch_learn_state')?.value, state: form.get('state'), grant: form.get('grant'), module: form.get('module') });
    response = NextResponse.redirect(new URL('/learn/session-check', config.origin), 303);
    response.cookies.set('ch_learn_session', session.handle, { ...cookieOptions, expires: session.expiresAt });
  } catch (error) {
    response = new NextResponse('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Restart Learn handoff</title><body><h1>Learn sign-in could not finish</h1><p>Your Core sign-in is unchanged. Start a new handoff to try again.</p><a href="/learn/auth/start">Restart handoff</a> <a href="/">Back to Core</a></body></html>', { status: (error as {status?: number}).status || 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  response.cookies.set('ch_learn_state', '', { ...cookieOptions, maxAge: 0 });
  Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value)); return response;
}
