import React, { useEffect, useState } from 'react';
import { readDraft, writeDraft } from '../auth/drafts';
export default function PeerReviewPanel({ solution, reviews, userId, names, send }) {
  const key = [userId, 'study-review', solution._id].join(':');
  const [recovered] = useState(() => readDraft(key));
  const own = reviews.find(row => row.reviewerId === userId), [body, setBody] = useState(recovered?.body || ''), [pending, setPending] = useState(recovered?.pending || null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { writeDraft(key, own ? null : body || pending ? {body, pending} : null); }, [key, body, pending, own]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const request = pending || { solutionId: solution._id, body };
    setPending(request); writeDraft(key, {body, pending: request});
    try { await send(request); setBody(''); setPending(null); writeDraft(key, null); }
    catch (failure) { setError(failure.response?.data?.error?.message || 'Review not confirmed. Retry the same text.'); if ([400,403,404,409,413].includes(failure.response?.status)) setPending(null); }
    finally { setBusy(false); }
  }
  return <section className="peer-review stack" aria-label={'Reviews for ' + (names[solution.userId] || 'participant')}><h3>Peer notes</h3>
    {reviews.length ? reviews.map(row => <blockquote key={row._id}><strong>{names[row.reviewerId] || 'Participant'}</strong><p className="message-prose">{row.body}</p></blockquote>) : <p className="muted">No reviews yet.</p>}
    {solution.userId !== userId && !own && <form className="stack" onSubmit={submit}><label>Review this solution<textarea value={body} onChange={event => setBody(event.target.value)} rows={3} required readOnly={busy || !!pending} placeholder="What works well? What could make the approach clearer?" /></label><p className="muted">One permanent review per peer. Explain what works and one useful improvement.</p>{pending && <p role="status">Your note is preserved while its save is unconfirmed.</p>}{error && <p role="alert">{error}</p>}<button disabled={busy || !body.trim() || new TextEncoder().encode(body).length > 8192}>{busy ? 'Saving review...' : pending ? 'Retry same review' : 'Publish review'}</button></form>}
    {own && <p role="status">Your review is saved.</p>}
  </section>;
}
