import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useParams } from 'react-router-dom';
import { readDraft, writeDraft } from '../auth/drafts';
import channelContract from '@collegehubs/contracts/channel.cjs';
export default function MessageComposer({ send, disabled = false, questionId = null, onSaved }) {
  const { user } = useAuth(), { id } = useParams();
  const key = [user._id, user.hubId, 'message', id, questionId || 'main'].join(':');
  const [recovered] = useState(() => readDraft(key));
  const [type, setType] = useState(recovered?.type || (questionId ? 'answer' : 'text'));
  const [text, setText] = useState(recovered?.text || ''), [language, setLanguage] = useState(recovered?.language || 'javascript'), [title, setTitle] = useState(recovered?.title || ''), [url, setUrl] = useState(recovered?.url || '');
  const [pending, setPending] = useState(recovered?.pending || null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => { writeDraft(key, text || title || url || pending ? { type, text, language, title, url, pending } : null); }, [key, type, text, language, title, url, pending]);
  const locked = busy || !!pending;
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const body = pending || { clientMessageId: crypto.randomUUID(), type, text, ...(type === 'code' ? { language } : type === 'resource' ? { title, url } : type === 'answer' ? { questionId } : {}) };
    try { channelContract.normalizeMessage(body); } catch (failure) { setError(failure.message); return; }
    writeDraft(key, { type, text, language, title, url, pending: body });
    setPending(body); setBusy(true); setError(''); setNotice('');
    try { const result = await send(body); writeDraft(key, null); setPending(null); setText(''); setTitle(''); setUrl(''); setNotice('Saved to your channel.'); onSaved?.(result.message); }
    catch (failure) {
      const status = failure.response?.status;
      if ([400, 403, 404, 409, 413].includes(status)) setPending(null);
      setError(failure.response?.data?.error?.message || 'Delivery is unconfirmed. Retry with the same send ID to avoid duplicates.');
    } finally { setBusy(false); }
  }
  return <form className="stack message-composer card" onSubmit={submit} aria-label={questionId ? 'Write an answer' : 'Write a message'}>
    <div><p className="eyebrow">CONTRIBUTE SOMETHING USEFUL</p><h2>{questionId ? 'Your perspective matters.' : 'Put your idea out there.'}</h2></div>
    {!questionId && <label>Message type<select value={type} disabled={locked} onChange={event => { setType(event.target.value); setError(''); setNotice(''); }}><option value="text">Text</option><option value="code">Code</option><option value="resource">Resource</option><option value="question">Question</option></select></label>}
    {type === 'code' && <label>Code language<select value={language} disabled={locked} onChange={event => { setLanguage(event.target.value); setNotice(''); }}>{channelContract.languages.map(value => <option key={value} value={value}>{value}</option>)}</select></label>}
    {type === 'resource' && <><label>Resource title<input value={title} disabled={locked} maxLength={160} onChange={event => { setTitle(event.target.value); setNotice(''); }} required /></label><label>HTTPS resource URL<input type="url" value={url} disabled={locked} maxLength={2048} onChange={event => { setUrl(event.target.value); setNotice(''); }} placeholder="https://" required /></label></>}
    <label>{type === 'code' ? 'Code source' : type === 'resource' ? 'Notes (optional)' : questionId ? 'Answer text' : 'Message'}<textarea value={text} disabled={locked} maxLength={type === 'code' ? 32768 : 8192} spellCheck={type !== 'code'} onChange={event => { setText(event.target.value); setNotice(''); }} rows={type === 'code' ? 7 : 3} required={type !== 'resource'} /></label>
    <small className="muted">{type === 'code' ? 'Code: 32 KiB maximum. Pasted code is displayed, never run.' : 'Text: 8 KiB maximum.'} Drafts can be recovered in this tab for 24 hours after sign-in.</small>
    {!notice && !pending && (text || title || url) && <small className="muted">Unsaved draft</small>}
    {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button className="primary" disabled={busy || disabled}>{busy ? 'Saving...' : pending ? 'Retry same message' : questionId ? 'Post answer' : 'Send message'}</button>
    {pending && !busy && <><p className="muted">The first attempt may already be saved. Retry before starting a different send.</p><button type="button" onClick={() => { setPending(null); setError(''); }}>Cancel retry and edit draft</button></>}
  </form>;
}
