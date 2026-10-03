import React from 'react';
import { Link } from 'react-router-dom';
import { useSchedule, scheduleTime } from '../hooks/useSchedule';
export default function ContestSchedule({ compact = false }) {
  const { data, error, busy, retry } = useSchedule('/contests');
  return <section className="card stack" aria-label="Contest schedules">
    <div className="section-heading"><h2>Coding contests</h2><button disabled={busy} onClick={retry}>Check schedules</button></div>
    {busy && <p role="status">Loading cached schedules…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {data && <>
      <p className="muted">Source: <a href={data.sourceUrl} target="_blank" rel="noreferrer">{data.provider}</a>. Times in India time (IST).</p>
      {data.provenance === 'recorded_fixture' && <p className="schedule-notice">Recorded test fixture — these are sample dates, not a live schedule.</p>}
      {data.fetchedAt && <p className="muted">Last successful fetch: <time dateTime={data.fetchedAt}>{scheduleTime(data.fetchedAt)}</time>. {data.stale ? 'Stale cache — confirm dates with the provider.' : 'Cached schedule.'}</p>}
      {data.status === 'unavailable' && <p role="status">Schedules are unavailable. No successful fetch has been saved yet.</p>}
      {!data.refreshEnabled ? <p className="muted">Provider refresh is disabled. Saved schedules remain available.</p> : <p className="muted">Updates run in the background when due. Check again shortly; repeated checks do not bypass the cooldown.</p>}
      <ul className="schedule-list">{data.items.slice(0, compact ? 3 : 100).map(item => <li key={item.providerId}>
        <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
        <p><time dateTime={item.startsAt}>{scheduleTime(item.startsAt)}</time></p><small className="muted">Ends {scheduleTime(item.endsAt)} IST</small>
      </li>)}</ul>
      {data.status !== 'unavailable' && !data.items.length && <p>No upcoming or running contests in the saved schedule.</p>}
      {compact && <Link to="/contests">All schedules →</Link>}
    </>}
  </section>;
}
