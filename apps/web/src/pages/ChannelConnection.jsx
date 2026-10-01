import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useChannel } from '../hooks/useChannel';

// P4.1's small text surface exercises persistence; rich collaboration belongs to P4.2.
function Conversation({ channelId, hubId }) {
  const channel = useChannel(channelId, hubId);
  const [draft, setDraft] = useState(''), [pending, setPending] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const body = pending || { clientMessageId: crypto.randomUUID(), type: 'text', text: draft };
    setPending(body); setBusy(true); setError('');
    try { await channel.send(body); setPending(null); setDraft(''); }
    catch (failure) { setError(failure.response?.data?.error?.message || 'Delivery is unconfirmed. Retry this message to check or save it once.'); }
    finally { setBusy(false); }
  }
  return <section className="stack channel-conversation">
    <Link to="/">Back to campus</Link><h1>{channel.title || 'Subject conversation'}</h1>
    <p className="muted" role="status">{channel.live ? 'Live updates connected' : 'Live updates disconnected; saved history checks every 15 seconds.'}</p>
    {channel.loading && <p role="status">Loading saved messages...</p>}
    {channel.error && <p role="alert">{channel.error} <button onClick={channel.retry}>Retry history</button></p>}
    <ol className="channel-messages" aria-label="Saved messages">{channel.items.map(message => <li key={message._id}>
      <strong>{message.authorName}</strong> <small className="muted">#{message.seq} &middot; {new Date(message.createdAt).toLocaleString()}</small>
      <p>{message.text}</p>
    </li>)}</ol>
    {!channel.loading && !channel.error && !channel.items.length && <p>No messages yet. Start the conversation.</p>}
    <p className="muted">Showing the latest saved messages (up to 500 this visit). Text only for now.</p>
    <form className="stack" onSubmit={submit}>
      <label htmlFor="channel-draft">Message</label>
      <textarea id="channel-draft" value={draft} maxLength={8192} disabled={busy || !!pending} onChange={event => setDraft(event.target.value)} rows={4} required />
      <small className="muted">Up to 8 KiB. Drafts stay in this tab and are lost on reload until saved.</small>
      {error && <p role="alert">{error}</p>}
      <button className="primary" disabled={busy || !draft.trim() || channel.loading || !!channel.error}>{busy ? 'Saving...' : pending ? 'Retry same message' : 'Send message'}</button>
      {pending && !busy && <button type="button" onClick={() => { setPending(null); setError(''); }}>Discard uncertain send and edit draft</button>}
    </form>
  </section>;
}
export default function ChannelConnection() {
  const { id } = useParams(), { user } = useAuth();
  return <Conversation key={id} channelId={id} hubId={user.hubId} />;
}
