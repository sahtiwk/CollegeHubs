import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import api from '../api';
import AuraTicker, { auraLabels } from './AuraTicker';
export default function AuraCard() {
  const { user } = useAuth();
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setBusy(true); setError(''); setData(null);
    api.get('/me/aura', { signal: controller.signal }).then(({ data: summary }) => { if (active) setData(summary); })
      .catch(err => { if (active) setError(err.response?.data?.error?.message || 'Aura could not be loaded. Please retry.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; controller.abort(); };
  }, [user._id, user.hubId, attempt]);
  return <section className="card aura-card stack" aria-label="Your Aura">
    <div className="section-heading"><div><p className="eyebrow">Your contributions, counted</p><h2>Your Aura</h2></div><button disabled={busy} onClick={() => setAttempt(value => value + 1)}>Refresh Aura</button></div>
    {busy && <p role="status">Loading your Aura…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {data && <>
      <dl className="aura-stats"><div><dt>Total Aura</dt><dd>{data.total}</dd></div><div><dt>Engagement</dt><dd>{data.engagement}</dd></div><div><dt>External bonus</dt><dd>{data.externalBonus}</dd></div><div><dt>Current streak</dt><dd>{data.streak.currentStreak} <small>{data.streak.currentStreak === 1 ? 'day' : 'days'}</small></dd></div></dl>
      <p className="muted">{data.streak.activeToday ? 'You have contributed today.' : 'No qualifying contribution today yet.'} One shared activity day across sources, using India time. External bonuses are not enabled.</p>
      {!!data.pending && <p role="status">{data.pending} saved study completion{data.pending === 1 ? '' : 's'} pending. Refresh after processing.</p>}
      {!!data.inactive && <p className="muted">{data.inactive} earlier contribution{data.inactive === 1 ? '' : 's'} recorded without scoring. Previous activity is not awarded retroactively.</p>}
      <details><summary>How Aura is counted</summary>{data.scoring.status === 'active' ? <><ul>{Object.entries(data.scoring.types).map(([type, rule]) => <li key={type}>{auraLabels[type] || type}: {rule.weight} Aura, up to {rule.countCap} per day.</li>)}</ul><p className="muted">Native contribution daily limit: {data.scoring.dailyCap}. Duplicate contributions do not earn again. Eligible activity still counts toward your streak after reaching a cap.</p></> : <p>Scoring is not active. Contributions remain saved.</p>}</details>
      <AuraTicker receipts={data.recent} />
      <Link to="/leaderboard">See your college ranking →</Link>
    </>}
  </section>;
}
