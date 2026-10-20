import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import CodeBlock from './CodeBlock';
import PeerReviewPanel from './PeerReviewPanel';
export default function SubmissionComparison({ room, userId, refreshId }) {
  const [state, setState] = useState({ items: [], reviews: [], error: '', loading: true }), [version, setVersion] = useState(0);
  const generation = useRef(0);
  const [selected, setSelected] = useState('');
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
  const current = state.items.some(item => item._id === selected) ? selected : state.items.find(item => item.userId === userId)?._id || state.items[0]?._id;
  return <section className="stack study-review"><div><p className="eyebrow">SAME CHALLENGE / DIFFERENT IDEAS</p><h2>See how others thought it through.</h2></div><p className="muted">These are the final saved solutions. Look for an approach you can learn from, then leave a useful note. Code is not executed or automatically graded.</p>
    {state.loading && <p role="status">Loading sealed solutions...</p>}{state.error && <p role="alert">{state.error} <button onClick={() => setVersion(value => value + 1)}>Retry comparison</button></p>}
    {state.items.length > 0 && <label className="study-solution-picker">Solution to read<select value={current} onChange={event => setSelected(event.target.value)}>{state.items.map(solution => <option key={solution._id} value={solution._id}>{names[solution.userId] || 'Participant'}{solution.userId === userId ? ' (you)' : ''}</option>)}</select><small>On a small screen, read one solution at a time.</small></label>}
    <div className="study-comparison">{state.items.map(solution => <article className={'card stack study-solution' + (solution._id === current ? ' is-selected' : '')} key={solution._id}><h3>{names[solution.userId] || 'Participant'}{solution.userId === userId ? ' (you)' : ''}</h3><p className="muted">{solution.outcome === 'empty' ? 'No nonempty saved solution' : 'Final saved solution'}</p>
      {solution.source ? <CodeBlock text={solution.source} language={solution.language} /> : <p>No source was saved.</p>}
      <details className="study-save-details"><summary>Saved version details</summary><p>Revision {solution.revision}</p><p>Sealed {solution.sealedAt ? new Date(solution.sealedAt).toLocaleString() : 'at room close'}</p>{solution.sourceHash && <p className="study-hash">Source fingerprint: {solution.sourceHash}</p>}</details>
      <p className="study-award">{solution.awardStatus === 'settled' ? 'Completion recorded.' : solution.awardStatus === 'pending' ? 'Solution saved; completion record pending.' : solution.awardStatus === 'rules_inactive' ? 'Completion recorded before scoring activation; no retroactive Aura.' : 'No completion award: a nonempty saved solution is required.'}</p>
      <PeerReviewPanel solution={solution} reviews={state.reviews.filter(row => row.solutionId === solution._id)} userId={userId} names={names} send={send} />
    </article>)}</div></section>;
}
