import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import CodeBlock from './CodeBlock';
import PeerReviewPanel from './PeerReviewPanel';
export default function SubmissionComparison({ room, userId, refreshId }) {
  const [state, setState] = useState({ items: [], reviews: [], error: '', loading: true }), [version, setVersion] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const abort = new AbortController(), current = ++generation.current;
    Promise.all([api.get('/study-rooms/' + room._id + '/submissions', { signal: abort.signal }), api.get('/study-rooms/' + room._id + '/reviews', { signal: abort.signal })]).then(([solutions, reviews]) => {
      if (abort.signal.aborted || current !== generation.current) return;
      if (solutions.data.room._id !== room._id || solutions.data.room.hubId !== room.hubId || reviews.data.hubId !== room.hubId || reviews.data.roomId !== room._id) throw new Error('Scope mismatch');
      setState({ items: solutions.data.items, reviews: reviews.data.items, loading: false, error: '' });
    }).catch(failure => { if (!abort.signal.aborted) setState(old => ({ ...old, loading: false, error: failure.response?.data?.error?.message || 'Comparison unavailable. Retry shortly.' })); });
    return () => abort.abort();
  }, [room._id, room.hubId, refreshId, version]);
  const names = Object.fromEntries((room.participants || []).map(person => [person.userId, person.name]));
  async function send(body) { await api.post('/study-rooms/' + room._id + '/reviews', body); setVersion(value => value + 1); }
  return <section className="stack"><div><p className="eyebrow">Learn from each other</p><h2>Compare &amp; review</h2></div><p className="muted">These are the sealed, acknowledged drafts. No automatic judging or correctness score is applied.</p>
    {state.loading && <p role="status">Loading sealed solutions...</p>}{state.error && <p role="alert">{state.error} <button onClick={() => setVersion(value => value + 1)}>Retry comparison</button></p>}
    <div className="study-comparison">{state.items.map(solution => <article className="card stack" key={solution._id}><h3>{names[solution.userId] || 'Participant'}{solution.userId === userId ? ' (you)' : ''}</h3><p className="muted">Revision {solution.revision} &middot; {solution.outcome === 'empty' ? 'No nonempty saved solution' : 'Sealed solution'}</p>
      {solution.source ? <CodeBlock text={solution.source} language={solution.language} /> : <p>No source was saved.</p>}
      <p className="study-award">{solution.awardStatus === 'settled' ? 'Completion recorded.' : solution.awardStatus === 'pending' ? 'Solution saved; completion record pending.' : solution.awardStatus === 'rules_inactive' ? 'Completion recorded before scoring activation; no retroactive Aura.' : 'No completion award: a nonempty saved solution is required.'}</p>
      <PeerReviewPanel solution={solution} reviews={state.reviews.filter(row => row.solutionId === solution._id)} userId={userId} names={names} send={send} />
    </article>)}</div></section>;
}
