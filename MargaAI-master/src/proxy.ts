import { NextRequest, NextResponse } from 'next/server';
// Route gate only. Page/API authorization is repeated in the session store.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/_next/') || path === '/favicon.ico') return NextResponse.next();
  if (!['/auth/start', '/auth/callback', '/session-check', '/api/session'].includes(path))
    return NextResponse.json({ error: 'Learn route unavailable during the session spike' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const response = NextResponse.next(); response.headers.set('Cache-Control', 'no-store'); return response;
}
