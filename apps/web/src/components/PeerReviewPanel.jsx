import React, { useState } from 'react';
export default function PeerReviewPanel({ solution, reviews, userId, names, send }) {
  const own = reviews.find(row => row.reviewerId === userId), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await send({ solutionId: solution._id, body }); setBody(''); }
    catch (failure) { setError(failure.response?.data?.error?.message || 'Review not confirmed. Retry the same text.'); }
    finally { setBusy(false); }
  }
  return <section className="peer-review stack" aria-label={'Reviews for ' + (names[solution.userId] || 'participant')}><h3>Peer notes</h3>
    {reviews.length ? reviews.map(row => <blockquote key={row._id}><strong>{names[row.reviewerId] || 'Participant'}</strong><p className="message-prose">{row.body}</p></blockquote>) : <p className="muted">No reviews yet.</p>}
    {solution.userId !== userId && !own && <form className="stack" onSubmit={submit}><label>Review this solution<textarea value={body} onChange={event => setBody(event.target.value)} rows={3} required disabled={busy} /></label><p className="muted">One permanent review per peer. Explain what works and one useful improvement.</p>{error && <p role="alert">{error}</p>}<button disabled={busy || !body.trim() || new TextEncoder().encode(body).length > 8192}>{busy ? 'Saving review...' : 'Publish review'}</button></form>}
    {own && <p role="status">Your review is saved.</p>}
  </section>;
}
