import type { CSSProperties } from 'react';
import { getCoreSession } from '@/lib/coreSession';
import { CoreSessionProvider, SessionControls } from '@/components/CoreSessionProvider';
import { moduleUrl } from '@/lib/moduleUrls';
export const dynamic = 'force-dynamic';
export default async function SessionCheck() {
  let session;
  try { session = await getCoreSession(); }
  catch { return <main className="session-card"><p className="eyebrow">COLLEGEHUBS / LEARN</p><h1>Continue from your Hub.</h1><p>A current Core handoff is required to open Learn. If a service is unavailable, return to Core and try again.</p><a className="button" href="/learn/auth/start">Continue with Core</a> <a href="/">Back to Core</a></main>; }
  const style = Object.fromEntries(Object.entries(session.theme.tokens).map(([key, value]) => ['--hub-' + key, value])) as CSSProperties;
  return <CoreSessionProvider session={session}><div className="learn-shell" style={style}><main className="session-card">
    <p className="eyebrow">COLLEGEHUBS / LEARN</p><span className="badge">Core session connected</span>
    <h1>Welcome, {session.username}.</h1><p>You are connected to <strong>{session.college}</strong> through your college Hub.</p>
    <dl><dt>Core subject</dt><dd>{session.userId}</dd><dt>Hub</dt><dd>{session.hubId}</dd><dt>Session expires (UTC)</dt><dd>{session.expiresAt}</dd></dl>
    <p>This session check is the first Learn integration slice. Learning activities are not available yet.</p>
    <nav><a href="/">Back to Core</a><a href={moduleUrl('/api/session')}>View session identity</a><SessionControls /></nav>
  </main></div></CoreSessionProvider>;
}
