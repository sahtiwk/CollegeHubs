import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { clearModuleSession, ensureLearnSession, learnRequest } from '../../../auth/moduleSession';
import RoadmapView from '../RoadmapView';
import type { GraphData, RoadmapNode } from '../RoadmapView';
import '../learn.css';

export default function SessionCheck() {
  const { user } = useAuth();
  const [attempt, retry] = useState(0);
  const [message, setMessage] = useState('Opening Learn...');
  const [error, setError] = useState('');
  const [data, setData] = useState<{ session: any; graph: GraphData } | null>(null);
  const [selected, select] = useState<RoadmapNode | null>(null);
  useEffect(() => {
    let active = true; let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController(); setData(null); select(null); setError('');
    (async () => {
      const session = await ensureLearnSession(user, (value: string) => { if (active) setMessage(value); });
      const result = await learnRequest('/spike/graph', { signal: abort.signal });
      if (result.userId !== user._id || result.hubId !== user.hubId || !result.synthetic) throw new Error('Learn identity changed. Please reconnect.');
      if (active) {
        setData({ session, graph: result.graph });
        timer = setTimeout(() => { clearModuleSession(); setData(null); setError('Your Learn session expired. Reconnect to continue.'); }, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
      }
    })().catch(error => { if (active && error.name !== 'AbortError') setError(error.status === 401 ? 'Your Learn session expired. Reconnect to continue.' : error.message || 'Learn is unavailable. Your Hub is still available.'); });
    return () => { active = false; clearTimeout(timer); abort.abort(); };
  }, [user._id, user.hubId, user.membershipVersion, attempt]);
  return <div className="learn-page stack">
    <header className="learn-heading"><p className="eyebrow">Learn / integration preview</p><h1>A little curiosity.<br />A clear next step.</h1><p>Explore a connected roadmap, right here in your college Hub.</p></header>
    <div className="learn-preview-note"><strong>Synthetic learning preview</strong><p>This sample proves the shared experience. Course progress, quizzes and rewards arrive in a later phase.</p></div>
    {error ? <section className="panel stack" role="alert"><h2>Let's reconnect.</h2><p>{error}</p><button className="primary" onClick={() => { clearModuleSession(); retry(value => value + 1); }}>Reconnect Learn</button><p className="muted">You can continue using your feed and college navigation.</p></section> : !data ? <section className="panel" role="status">{message}</section> : <>
      <section className="learn-session" aria-label="Learn identity"><span className="learn-ready">Connected</span><span>@{data.session.username} · {data.session.college}</span><span className="muted">Your college session is shared.</span></section>
      <RoadmapView graphData={data.graph} onNodeClick={select} />
      {selected && <section className="panel stack" role="status"><h2>{selected.label}</h2><p>{selected.description}</p><p className="muted">Preview only — selecting a topic does not update progress or award Aura.</p><button onClick={() => select(null)}>Close topic details</button></section>}
    </>}
  </div>;
}
