import React, { useEffect, useState } from 'react';
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
  async function load(next = null) {
    setBusy(true); setError('');
    try {
      const { data } = await api.get('/users/leaderboard', { params: { limit: 50, ...(next ? { cursor: next } : {}) } });
      setItems(previous => next ? [...previous, ...data.items.filter(row => !previous.some(item => item._id === row._id))] : data.items);
      setOwn(data.ownRank); setCursor(data.nextCursor);
    } catch (err) { setError(err.response?.data?.error || 'Rankings are unavailable. Please retry.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);
  return <section className="stack">
    <p className="eyebrow">{hub?.name || 'Your college'}</p><h1>A little friendly<br />competition.</h1>
    <p className="muted">College standings based on stored Aura. New reward scoring is not available yet.</p>
    {own && <div className="rank-summary"><span>Your college rank <strong>#{own.rank}</strong></span><span>{own.auraPoints} Aura</span></div>}
    {error && <p className="error" role="alert">{error} <button onClick={() => load(cursor)} disabled={busy}>Retry rankings</button></p>}
    <div className="card ranking-table"><table><caption className="sr-only">College leaderboard</caption><thead><tr><th scope="col">Rank</th><th scope="col">Member</th><th scope="col">Aura</th></tr></thead>
      <tbody>{items.map(row => <tr key={row._id} className={row._id === user._id ? 'own-row' : ''}><td>{row.rank}</td><td>{row.fullName || row.username}{row._id === user._id && <small> (you)</small>}<small className="muted">@{row.username}</small></td><td>{row.auraPoints}</td></tr>)}</tbody></table></div>
    {busy && <p role="status">Loading rankings...</p>}
    {!busy && !error && !items.length && <p>No rankings yet.</p>}
    {cursor && <button onClick={() => load(cursor)} disabled={busy}>Load more members</button>}
  </section>;
}
