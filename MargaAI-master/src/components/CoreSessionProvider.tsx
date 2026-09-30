'use client';
import { createContext, useContext, useState } from 'react';
export type CoreSession = { userId: string; hubId: string; username: string; college: string; expiresAt: string; csrfToken: string; theme: { tokens: Record<string, string> } };
const Context = createContext<CoreSession | null>(null);
export function CoreSessionProvider({ session, children }: { session: CoreSession; children: React.ReactNode }) {
  return <Context.Provider value={session}>{children}</Context.Provider>;
}
export function SessionControls() {
  const session = useContext(Context)!;
  const [error, setError] = useState('');
  return <><button onClick={async () => {
    try { const result = await fetch('/learn/api/session', { method: 'DELETE', headers: { 'X-CSRF-Token': session.csrfToken } });
      if (!result.ok) throw new Error(); window.location.assign('/learn/session-check');
    } catch { setError('Could not end this Learn session. Please try again.'); }
  }}>End Learn session</button>{error && <p role="alert">{error}</p>}</>;
}
