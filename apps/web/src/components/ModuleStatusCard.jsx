import React from 'react';
import { Link } from 'react-router-dom';
export default function ModuleStatusCard({ name, title, data, loading, children }) {
  const available = data?.status === 'ok' || data?.status === 'stale';
  return <article className="module-status-card stack" aria-label={title + ' progress'}>
    <div className="section-heading"><h3>{title}</h3><span className="pill">{loading ? 'Loading' : data?.status === 'ok' ? 'Updated' : data?.status === 'stale' ? 'Saved snapshot' : 'Unavailable'}</span></div>
    {loading ? <p>Loading your progress…</p> : available ? <>{children}{data.pending > 0 && <p>{data.pending} result{data.pending === 1 ? '' : 's'} awaiting Aura processing.</p>}<small className="muted">{data.status === 'stale' ? 'Last available update: ' : 'As of '}<time dateTime={data.asOf}>{new Date(data.asOf).toLocaleString()}</time></small></> : <p className="muted">Progress is unavailable. This service may be waking up. Your saved work is unaffected.</p>}
    <Link to={'/' + name}>Open {title} →</Link>
  </article>;
}
