import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Context, message } from './InterviewState';

function HistoryList({ setups = false }: { setups?: boolean }) {
  const { request } = useContext(Context), path = setups ? '/interviews' : '/sessions';
  const [items, setItems] = useState<any[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const alive = useRef(true);
  async function load(after?: string) {
    setBusy(true); setError('');
    try {
      const data = await request(path + (after ? '?cursor=' + after : ''));
      if (!alive.current) return;
      setItems(old => after ? [...old, ...data.items.filter((r: any) => !old.some(x => x.id === r.id))] : data.items);
      setCursor(data.nextCursor);
    } catch (e) { if (alive.current) setError(message(e)); }
    finally { if (alive.current) setBusy(false); }
  }
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, []);
  return <section className="stack" aria-label={setups ? 'Interview setups' : 'Saved sessions'}>
    <div className="section-heading"><h2>{setups ? 'Your setups' : 'Saved sessions'}</h2><button disabled={busy} onClick={() => load()}>Refresh {setups ? 'setups' : 'sessions'}</button></div>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Opening saved practice…</p>}
    {!busy && !error && !items.length && <p className="card">A fresh page. {setups ? 'Prepare for a role to save your first setup.' : 'Start a practice session when you are ready.'}</p>}
    <div className="interview-history-grid">{items.map(row => <article className="card stack" key={row.id}>
      <p className="eyebrow">{new Date(row.createdAt).toLocaleDateString()} / {row.status.replaceAll('_', ' ')}</p>
      <h3>{row.jobTitle}</h3>
      {!setups && <p className="interview-history-score">{row.ungraded ? 'Self-review' : row.score !== null ? `${row.score}/100` : 'No report yet'}</p>}
      <Link to={'/interview/' + (setups ? 'interviews/' : row.status === 'completed' ? 'results/' : 'sessions/') + row.id}>
        {setups ? 'Open setup →' : row.status === 'completed' ? 'Read your review →' : 'Continue saved session →'}
      </Link>
      {setups && !row.questions.length && row.status !== 'generating' && <button disabled={busy} onClick={async () => {
        setBusy(true); try { await request('/interviews/' + row.id, 'DELETE'); setItems(old => old.filter(r => r.id !== row.id)); }
        catch (e) { setError(message(e)); } finally { setBusy(false); }
      }}>Delete unused setup</button>}
    </article>)}</div>
    {cursor && <button disabled={busy} onClick={() => load(cursor)}>Load older {setups ? 'setups' : 'sessions'}</button>}
    {error && <button disabled={busy} onClick={() => load(cursor || undefined)}>Retry loading {setups ? 'setups' : 'sessions'}</button>}
  </section>;
}
export function SessionHistoryPage() {
  const { request } = useContext(Context), navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div className="stack">
    <header><p className="eyebrow">The practice journal / Interview</p><h1>A little practice.<br/><em>A clearer answer.</em></h1><p>Your saved work, ready whenever you are.</p></header>
    <section className="interview-start-grid">
      <article className="card stack"><p className="eyebrow">01 / Start with what you know</p><h2>Just you and five questions.</h2><p>No resume or provider needed. Save your answers and finish with an ungraded self-review. No score or Aura.</p>
        <button className="primary" disabled={busy} onClick={async () => {
          setBusy(true); setError(''); try { const result = await request('/practice', 'POST', {}); navigate('/interview/sessions/' + result.session.id); }
          catch (e) { setError(message(e)); } finally { setBusy(false); }
        }}>{busy ? 'Opening practice…' : 'Start ungraded practice'}</button>{error && <p role="alert">{error}</p>}
      </article>
      <article className="card stack"><p className="eyebrow">02 / Make it specific</p><h2>A role worth preparing for.</h2><p>Choose your resume, role and question types. Review the provider before sending your text.</p><Link to="/interview/new">Prepare a tailored interview →</Link></article>
    </section>
    <HistoryList /><HistoryList setups />
  </div>;
}
