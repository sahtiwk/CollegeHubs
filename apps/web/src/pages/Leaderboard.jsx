import React, { useEffect, useRef, useState } from 'react';
import { useHubTheme } from '../theme/HubThemeProvider';
import { useAuth } from '../auth/AuthProvider';
import api from '../api';
export default function Leaderboard() {
  const { hub } = useHubTheme();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [own, setOwn] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  async function load(next = null) {
    const id = ++request.current;
    setBusy(true); setError('');
    try {
      const { data } = await api.get('/hubs/' + user.hubId + '/leaderboard', { params: { limit: 50, ...(next ? { cursor: next } : {}) } });
      if (id !== request.current) return;
      setItems(previous => next ? [...previous, ...data.items.filter(row => !previous.some(item => item._id === row._id))] : data.items);
      setOwn(data.ownRank); setCursor(data.nextCursor);
    } catch (err) { if (id === request.current) setError(err.response?.data?.error?.message || 'Rankings are unavailable. Please retry.'); }
    finally { if (id === request.current) setBusy(false); }
  }
  useEffect(() => { setItems([]); setOwn(null); setCursor(null); load(); return () => { request.current++; }; }, [user._id, user.hubId]);
  return <section className="stack">
    <p className="eyebrow">{hub?.name || 'Your college'}</p><h1>A little friendly<br />competition.</h1>
    <p className="muted">College standings based on recorded Aura. Equal totals are ordered consistently by member ID.</p>
    <button disabled={busy} onClick={() => load()}>Refresh rankings</button>
    {own && <div className="rank-summary"><span>Your college rank <strong>#{own.rank}</strong></span><span>{own.title} / {own.auraPoints} Aura</span></div>}
    {error && <p className="error" role="alert">{error} <button onClick={() => load(cursor)} disabled={busy}>Retry rankings</button></p>}
    <div className="card ranking-table"><table><caption className="sr-only">College leaderboard</caption><thead><tr><th scope="col">Rank</th><th scope="col">Member</th><th scope="col">Aura</th></tr></thead>
      <tbody>{items.map(row => <tr key={row._id} className={row._id === user._id ? 'own-row' : ''}><td>{row.rank}</td><td>{row.fullName || row.username}{row._id === user._id && <small> (you)</small>}<small className="muted">@{row.username}</small></td><td>{row.auraPoints}<small>{row.title}</small></td></tr>)}</tbody></table></div>
    {busy && <p role="status">Loading rankings...</p>}
    {!busy && !error && !items.length && <p>No rankings yet.</p>}
    {cursor && <button onClick={() => load(cursor)} disabled={busy}>Load more members</button>}
  </section>;
}
