import React, { useEffect, useRef, useState } from 'react';
import { useStudyRemaining } from './StudyTimer';
export default function StudyEditor({ room, saved, clock, action, sync }) {
  const [source, setSource] = useState(saved.source), [language, setLanguage] = useState(saved.revision ? saved.language : room.problem.allowedLanguages[0]);
  const [baseline, setBaseline] = useState(saved);
  const [base, setBase] = useState(saved.revision), [pending, setPending] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false);
  const remaining = useStudyRemaining(room.endAt, clock);
  const dirty = source !== baseline.source || (source !== '' && language !== baseline.language);
  const frozen = room.status !== 'active' || !!saved.submittedAt || remaining === 0;
  const latest = useRef({ source, language, dirty }); latest.current = { source, language, dirty };
  useEffect(() => {
    if (saved.revision === base) return;
    if (!latest.current.dirty || (saved.source === latest.current.source && saved.language === latest.current.language)) {
      setSource(saved.source); setLanguage(saved.revision ? saved.language : room.problem.allowedLanguages[0]); setBase(saved.revision); setBaseline(saved); setPending(null); setConflict(false); setError('');
    } else { setConflict(true); setPending(null); }
  }, [saved.revision, saved.source, saved.language, base, room.problem.allowedLanguages]);
  useEffect(() => { const warn = event => { if (dirty || pending) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty, pending]);
  async function save() {
    const body = pending || { expectedRevision: base, revision: base + 1, source, language };
    if (new TextEncoder().encode(body.source).length > 32768) { setError('Source exceeds 32 KiB. Shorten it before saving.'); return; }
    setPending(body); setBusy(true); setError('');
    try {
      const data = await action('draft', body), acknowledged = data.ownSolution;
      setPending(null);
      // Another tab can advance the revision between our commit and its returned snapshot.
      if (acknowledged.revision !== body.revision || acknowledged.source !== body.source || acknowledged.language !== body.language) setConflict(true);
      else { setBase(acknowledged.revision); setBaseline(acknowledged); setConflict(false); }
    }
    catch (failure) {
      const status = failure.response?.status;
      setError(failure.response?.data?.error?.message || 'Save not confirmed. Retry the same draft or synchronize before continuing.');
      if ([400, 403, 404, 409, 413].includes(status)) { setPending(null); if (status === 409) setConflict(true); await sync(); }
    } finally { setBusy(false); }
  }
  async function submit() {
    setBusy(true); setError('');
    try { await action('submit', { draftRevision: saved.revision }); }
    catch (failure) { setError(failure.response?.data?.error?.message || 'Submission not confirmed. Synchronize or retry.'); await sync(); }
    finally { setBusy(false); }
  }
  function useSaved() { setSource(saved.source); setLanguage(saved.revision ? saved.language : room.problem.allowedLanguages[0]); setBase(saved.revision); setBaseline(saved); setConflict(false); setPending(null); setError(''); }
  return <section className="card stack study-editor" aria-label="Your individual solution"><div className="section-heading"><h2>Your workspace</h2><span className="badge">{room.status === 'review' ? 'Sealed draft' : 'Private until close'}</span></div>
    <p className="muted">Save your work explicitly. Only acknowledged drafts survive a reload or disconnect. Submitting freezes your saved draft.</p>
    <label>Language<select value={language} onChange={event => setLanguage(event.target.value)} disabled={frozen || busy || !!pending || conflict}>{room.problem.allowedLanguages.map(item => <option key={item}>{item}</option>)}</select></label>
    <label>Your solution<textarea aria-label="Your solution" rows={14} spellCheck={false} value={source} readOnly={frozen || busy || !!pending || conflict} onChange={event => setSource(event.target.value)} /></label>
    <p role="status">{busy ? 'Waiting for confirmation...' : pending ? 'Save unconfirmed. Your text is still in this tab.' : dirty ? 'Unsaved changes. Your latest saved revision is ' + saved.revision + '.' : saved.submittedAt ? 'Submitted and frozen.' : saved.revision ? 'Saved revision ' + saved.revision + '.' : 'No saved draft yet.'}</p>
    {error && <p role="alert">{error}</p>}
    {conflict && <div className="study-conflict" role="alert"><p>A newer or frozen saved state conflicts with this draft. Your local text is preserved above.</p><div className="study-actions"><button onClick={useSaved}>Use saved draft</button>{!frozen && <button onClick={() => { setBase(saved.revision); setBaseline(saved); setConflict(false); setError(''); }}>Keep local text for next save</button>}<button onClick={sync}>Refresh saved state</button></div></div>}
    {!frozen && <div className="study-actions"><button className="primary" disabled={busy || conflict || (!dirty && !pending)} onClick={save}>{pending ? 'Retry same save' : 'Save draft'}</button><button disabled={busy || dirty || !!pending || conflict || !saved.revision || !saved.source.trim()} onClick={submit}>Submit and freeze</button><button disabled={busy} onClick={sync}>Synchronize</button></div>}
    {frozen && <p className="muted">{room.status === 'waiting' ? 'The host will start once everyone is ready.' : room.status === 'review' && !dirty ? 'Your sealed draft is available for comparison below.' : saved.submittedAt ? 'Your submission is frozen. Peer solutions unlock when the room closes.' : 'Editing has ended. Any unsaved text remains here for you to copy; it cannot replace the sealed draft.'}</p>}
  </section>;
}
