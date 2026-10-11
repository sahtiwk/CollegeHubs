import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import api from '../api';
import ModuleStatusCard from './ModuleStatusCard';
export default function LearnProgressCard() {
  const { user } = useAuth();
  const scope = [user._id, user.hubId, user.membershipVersion].join(':');
  const [result, setResult] = useState(null), [busy, setBusy] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; const controller = new AbortController();
    setBusy(true); setResult(null);
    api.get('/me/module-progress', { signal: controller.signal }).then(({ data }) => { if (active) setResult({ scope, data }); })
      .catch(() => { if (active) setResult({ scope, data: { modules: {} } }); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; controller.abort(); };
  }, [scope, attempt]);
  const modules = result?.scope === scope ? result.data.modules : {};
  return <section className="card stack module-progress" aria-label="Your module progress" aria-busy={busy}>
    <div className="section-heading"><div><p className="eyebrow">Keep moving forward</p><h2>Your progress</h2></div><button aria-disabled={busy} onClick={() => { if (!busy) setAttempt(value => value + 1); }}>Refresh progress</button></div>
    <p className="muted">Snapshots refresh at most once a minute. Aura and your shared daily streak are counted separately in Your Aura.</p>
    <div className="module-progress-grid">
      <ModuleStatusCard name="learn" title="Learn" data={modules.learn} loading={busy}><dl><div><dt>Paths enrolled</dt><dd>{modules.learn?.enrollments}</dd></div><div><dt>Nodes mastered</dt><dd>{modules.learn?.completedNodes}</dd></div><div><dt>Quizzes completed</dt><dd>{modules.learn?.completedQuizzes}</dd></div></dl></ModuleStatusCard>
      <ModuleStatusCard name="arcade" title="Arcade" data={modules.arcade} loading={busy}><dl><div><dt>Games completed</dt><dd>{modules.arcade?.completedGames}</dd></div><div><dt>Wins</dt><dd>{modules.arcade?.wins}</dd></div></dl></ModuleStatusCard>
      <ModuleStatusCard name="interview" title="Interview" data={modules.interview} loading={busy}><dl><div><dt>Interviews completed</dt><dd>{modules.interview?.completedInterviews}</dd></div></dl></ModuleStatusCard>
    </div>
  </section>;
}
