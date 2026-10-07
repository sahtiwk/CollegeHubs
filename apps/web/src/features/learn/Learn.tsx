import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { clearModuleSession, ensureLearnSession, learnRequest } from '../../auth/moduleSession';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import NodePage from './pages/NodePage';
import PreferencesPage from './pages/PreferencesPage';
import QuizPage, {HistoryPage} from './pages/QuizPage';
import './learn.css';

export type RequestLearn = (path: string, method?: string, body?: unknown, signal?: AbortSignal) => Promise<any>;
const Access = createContext<{ request: RequestLearn }>(null!);
export const learningError = (e: any) => e.status === 401 ? 'Your Learn session expired. Reconnect to continue.' : e.message || 'Learn could not finish this request. Please retry.';
function LearnAccess({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('Opening Learn…'), [attempt, setAttempt] = useState(0);
  const session = useRef<any>(null), lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const abort = new AbortController(); lifetime.current = abort;
    let timer: ReturnType<typeof setTimeout>;
    setReady(false); setError(''); session.current = null;
    ensureLearnSession(user, (message: string) => { if (!abort.signal.aborted) setProgress(message); }).then(dto => {
      if (abort.signal.aborted) return;
      session.current = dto; setReady(true);
      timer = setTimeout(() => { abort.abort(); clearModuleSession(); session.current = null; setReady(false); setError('Your Learn session expired. Reconnect to continue.'); }, Math.max(0, Date.parse(dto.expiresAt) - Date.now()));
    }).catch(e => { if (!abort.signal.aborted) setError(learningError(e)); });
    return () => { abort.abort(); clearTimeout(timer); session.current = null; };
  }, [user._id, user.hubId, user.membershipVersion, attempt]);
  const request = useCallback<RequestLearn>(async (path, method = 'GET', body, signal) => {
    const active = lifetime.current!, dto = session.current;
    const combined = signal ? AbortSignal.any([signal, active.signal]) : active.signal;
    combined.throwIfAborted();
    if (!dto || Date.parse(dto.expiresAt) <= Date.now()) throw Object.assign(new Error('Learn session expired.'), { status: 401 });
    try {
      const result = await learnRequest(path, { method, body, csrf: dto.csrfToken, signal: combined });
      combined.throwIfAborted(); return result;
    } catch (e: any) {
      if (e.status === 401 && !active.signal.aborted) { active.abort(); clearModuleSession(); session.current = null; setReady(false); setError(learningError(e)); }
      throw e;
    }
  }, []);
  return ready ? <Access.Provider value={{ request }}>{children}</Access.Provider> : <section className="panel stack">{error ? <><h2>Let’s reconnect.</h2><p role="alert">{error}</p><button onClick={() => { clearModuleSession(); setAttempt(n => n + 1); }}>Reconnect Learn</button><p className="muted">Your college feed and navigation are still available.</p></> : <p role="status">{progress}</p>}</section>;
}
export function useLearnLoad(path: string) {
  const { request } = useContext(Access);
  const [data, setData] = useState<any>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError('');
    request(path, 'GET', undefined, abort.signal).then(value => { if (!abort.signal.aborted) setData(value); }).catch(e => { if (!abort.signal.aborted) setError(learningError(e)); });
    return () => abort.abort();
  }, [path, revision, request]);
  return { data, setData, error, refresh: () => setRevision(n => n + 1) };
}
export function useLearnAction() {
  const { request } = useContext(Access), current = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => () => current.current?.abort(), []);
  async function run(work: (call: RequestLearn) => Promise<void>) {
    if (current.current && !current.current.signal.aborted) return;
    const abort = new AbortController(); current.current = abort; setBusy(true); setError('');
    try { await work((path, method, body) => request(path, method, body, abort.signal)); }
    catch (e) { if (!abort.signal.aborted) setError(learningError(e)); }
    finally { if (!abort.signal.aborted) setBusy(false); abort.abort(); }
  }
  return { run, busy, error };
}
export function LoadState({ load }: { load: ReturnType<typeof useLearnLoad> }) {
  return load.error ? <section className="panel stack"><p role="alert">{load.error}</p><button onClick={load.refresh}>Retry</button></section> : <p role="status">Loading your learning path…</p>;
}
export default function Learn() {
  const { user } = useAuth();
  return <div className="learn-page stack">
    <nav className="learn-nav" aria-label="Learn navigation"><NavLink to="/learn" end>My learning</NavLink><NavLink to="/learn/onboarding">Explore paths</NavLink><NavLink to="/learn/history">Assessments</NavLink><NavLink to="/learn/preferences">Learning preferences</NavLink></nav>
    <LearnAccess key={[user._id, user.hubId, user.membershipVersion].join(':')}><Routes>
      <Route index element={<DashboardPage />} /><Route path="onboarding" element={<OnboardingPage />} />
      <Route path="nodes/:id" element={<NodePage />} /><Route path="preferences" element={<PreferencesPage />} />
      <Route path="quiz/:id" element={<QuizPage />} /><Route path="history" element={<HistoryPage />} />
      <Route path="*" element={<p className="panel">This Learn page is unavailable. <Link to="/learn">Return to your learning.</Link></p>} />
    </Routes></LearnAccess>
  </div>;
}
