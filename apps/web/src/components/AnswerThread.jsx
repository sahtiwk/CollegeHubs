import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import MessageComposer from './MessageComposer';
export default function AnswerThread({ questionId, channelId, hubId, userId, send, onClose, revision }) {
  const [thread, setThread] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const [beforeSeq, setBeforeSeq] = useState(null);
  const current = useRef(true);
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { current.current = true; return () => { current.current = false; }; }, []);
  useEffect(() => {
    const abort = new AbortController();
    async function read() {
      try {
        const { data } = await api.get('/messages/' + questionId + '/thread', { signal: abort.signal, params: beforeSeq ? { beforeSeq } : {} });
        if (data.hubId !== hubId || data.channelId !== channelId) throw new Error('Thread binding mismatch');
        if (!abort.signal.aborted) { setThread(data); setError(''); }
      } catch (failure) { if (!abort.signal.aborted) setError(failure.response?.data?.error?.message || 'Thread unavailable. Retry shortly.'); }
    }
    void read(); const timer = setInterval(() => { if (document.visibilityState === 'visible') void read(); }, 15000);
    return () => { abort.abort(); clearInterval(timer); };
  }, [questionId, channelId, hubId, tick, revision, beforeSeq]);
  async function accept(answerId) {
    setBusy(true); setError('');
    try { await api.post('/messages/' + questionId + '/accepted-answer', { answerId }); if (current.current) setTick(value => value + 1); }
    catch (failure) { if (current.current) { setError(failure.response?.data?.error?.message || 'Acceptance unconfirmed. Retry the same answer.'); setTick(value => value + 1); } }
    finally { if (current.current) setBusy(false); }
  }
  const answers = thread ? [...(thread.acceptedAnswer && !thread.items.some(row => row._id === thread.acceptedAnswer._id) ? [thread.acceptedAnswer] : []), ...thread.items] : [];
  return <section className="stack answer-thread card" aria-label="Question thread"><div className="section-heading"><h2 ref={heading} tabIndex={-1}>Question thread</h2><button onClick={onClose}>Close thread</button></div>
    {error && <p role="alert">{error} <button onClick={() => setTick(value => value + 1)}>Retry thread</button></p>}
    {!thread && !error && <p role="status">Loading thread...</p>}
    {thread && <><p className="message-prose"><strong>{thread.question.authorName} asks:</strong><br />{thread.question.text}</p>
      <p className="muted">{thread.question.acceptedAnswerId ? 'An answer has been accepted. This choice is permanent.' : 'The question author may permanently accept one answer from another person. Aura scoring is not active yet.'}</p>
      {thread.hasMore && <button disabled={busy} onClick={() => setBeforeSeq(thread.items[0]?.seq)}>Older replies</button>}
      {beforeSeq && <button onClick={() => setBeforeSeq(null)}>Latest replies</button>}
      <ol className="channel-messages" aria-label="Answers">{answers.map(answer => <li key={answer._id}><strong>{answer.authorName}</strong><p className="message-prose">{answer.text}</p>
        {answer._id === thread.question.acceptedAnswerId ? <p className="accepted-answer">Accepted answer</p> : !thread.question.acceptedAnswerId && thread.question.authorId === userId && answer.authorId !== userId && <button disabled={busy} onClick={() => accept(answer._id)}>Accept this answer permanently</button>}
      </li>)}</ol>
      {!answers.length && <p>No answers yet.</p>}
      <MessageComposer questionId={questionId} send={send} onSaved={() => { setBeforeSeq(null); setTick(value => value + 1); }} disabled={!!error} />
    </>}
  </section>;
}
