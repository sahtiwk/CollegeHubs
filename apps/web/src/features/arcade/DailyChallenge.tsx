import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { arcadeRequest, ArcadeError, type DailyInfo, type GameProps } from './api';
import { gameComponent, gameRoute } from './gameRegistry';
export default function DailyChallenge(props: GameProps) {
  const { id } = useParams(), navigate = useNavigate();
  const [info, setInfo] = useState<DailyInfo | null>(null), [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(true), [enabled, setEnabled] = useState(false), [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError('');
    arcadeRequest(id ? '/sessions/' + id : '/daily', { signal: controller.signal }).then(data => {
      if (id && !data.game?.daily) throw new Error('This round is not a daily challenge.');
      setInfo(id ? data.game.daily : data.challenge); setSaved(data.game?.id || null); setEnabled(data.enabled === true);
    }).catch(err => { if (!controller.signal.aborted) { if (err instanceof ArcadeError && err.status === 401) props.onExpired(); else setError(err.message); } }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [id, props.session.csrfToken, revision]);
  async function start() {
    if (!info || busy) return; setBusy(true); setError('');
    try { const data = await arcadeRequest('/daily', { method: 'POST', body: { challengeId: info.challengeId }, csrf: props.session.csrfToken }); navigate('/arcade/daily/' + data.game.id); }
    catch (err) { if (err instanceof ArcadeError && err.status === 401) props.onExpired(); else setError(err instanceof Error ? err.message : 'Unable to open daily challenge. Retry to recover your saved attempt.'); }
    finally { setBusy(false); }
  }
  const Component = info ? gameComponent(info.gameId) : null;
  if (id && Component && !error) return <Component {...props} daily />;
  return <section className="stack arcade-game"><p className="eyebrow">One day. One attempt.</p><h1>The daily challenge.</h1>
    {busy && <p role="status">Opening today’s challenge…</p>}{error && <p role="alert">{error}</p>}
    {info && <article className="arcade-daily card stack"><span className="pill">{info.challengeDay} · India time</span><h2>{gameRoute(info.gameId)?.title}</h2><p>Qualify for up to 15 Aura. This replaces the ordinary reward for this round and shares Arcade’s 30-Aura daily cap.</p><p>You have one saved attempt, up to ten minutes. It closes at midnight IST even if time remains. Opening another tab resumes the same round.</p>
      {saved ? <Link className="arcade-play" to={'/arcade/daily/' + saved}>Open your daily attempt</Link> : <button className="primary" disabled={busy || !enabled} onClick={() => void start()}>Start daily challenge</button>}
      {!enabled && !saved && !busy && <p>New rounds are currently unavailable.</p>}
    </article>}
    <button disabled={busy} onClick={() => setRevision(n => n + 1)}>Refresh daily challenge</button><Link to="/arcade">Back to Arcade</Link>
  </section>;
}
