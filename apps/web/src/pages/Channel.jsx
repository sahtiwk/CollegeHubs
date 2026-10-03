import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useChannel } from '../hooks/useChannel';
import api from '../api';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import AcademicCalendar from '../components/AcademicCalendar';
import AnswerThread from '../components/AnswerThread';
function Conversation({ channelId, user }) {
  const channel = useChannel(channelId, user.hubId);
  const [questionId, setQuestionId] = useState(null), [query, setQuery] = useState(''), [filter, setFilter] = useState(null), [page, setPage] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!filter) { setPage(null); setError(''); return; }
    const abort = new AbortController(); setLoading(true); setError(''); setPage(null);
    api.get('/channels/' + channelId + '/messages', { params: filter, signal: abort.signal }).then(({ data }) => {
      if (!abort.signal.aborted && data.hubId === user.hubId && data.channelId === channelId) setPage(data);
    }).catch(failure => { if (!abort.signal.aborted) setError(failure.response?.data?.error?.message || 'History search unavailable.'); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [filter, channelId, user.hubId]);
  function search(event) { event.preventDefault(); setFilter(query.trim() ? { q: query.trim() } : null); }
  return <section className="stack channel-conversation"><Link to="/">Back to campus</Link><div><p className="eyebrow">Learn together</p><h1>{channel.title || 'Subject conversation'}</h1></div>
    <p className="muted" role="status">{channel.live ? 'Live updates connected' : 'Live updates disconnected; saved history checks every 15 seconds.'}</p>
    {channel.error && <p role="alert">{channel.error} <button onClick={channel.retry}>Retry history</button></p>}
    <Link className="study-entry" to={"/channels/" + channelId + "/study"}>Open study rooms <span>Work through a challenge with your peers</span></Link>
    <details className="channel-calendar"><summary>Subject calendar</summary><AcademicCalendar channelId={channelId} /></details>
    <MessageComposer send={channel.send} disabled={channel.loading || !!channel.error} />
    <form className="channel-search" onSubmit={search}><label>Search saved messages<input value={query} maxLength={120} onChange={event => setQuery(event.target.value)} placeholder="Literal text, code, title or URL" /></label><button disabled={loading}>Search</button>{filter && <button type="button" onClick={() => { setFilter(null); setQuery(''); }}>Back to live messages</button>}</form>
    {loading || channel.loading ? <p role="status">Loading messages...</p> : null}
    {error && <p role="alert">{error} <button onClick={() => setFilter({ ...filter })}>Retry search</button></p>}
    {filter && <p className="muted">Saved history view. New messages appear when you search again or return to live messages.</p>}
    <MessageList items={filter ? page?.items || [] : channel.items} onQuestion={setQuestionId} />
    {!loading && !channel.loading && !(filter ? page?.items.length : channel.items.length) && <p>{filter ? 'No matching messages.' : 'No messages yet. Start the conversation.'}</p>}
    {(filter ? page?.hasMore : channel.items.length >= 50) && <button onClick={() => { const items = filter ? page.items : channel.items; setFilter({ ...(filter?.q ? { q: filter.q } : {}), beforeSeq: items[0].seq }); }}>Older messages</button>}
    {questionId && <AnswerThread key={questionId} questionId={questionId} channelId={channelId} hubId={user.hubId} userId={user._id} send={channel.send} onClose={() => setQuestionId(null)} revision={channel.revision} />}
  </section>;
}
export default function Channel() { const { id } = useParams(), { user } = useAuth(); return <Conversation key={id} channelId={id} user={user} />; }
