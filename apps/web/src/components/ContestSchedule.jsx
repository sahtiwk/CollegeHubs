import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchedule, scheduleTime } from '../hooks/useSchedule';
import ScheduleMonth, { indiaDay, onDay, monthRange } from './ScheduleMonth';
import '../styles/schedules.css';
export default function ContestSchedule({ compact = false }) {
  const [source,setSource]=useState('codeforces');
  const { data, error, busy, retry } = useSchedule(source==='clist'?'/contests?provider=clist':'/contests');
  const [view,setView]=useState('list'),[month,setMonth]=useState(()=>indiaDay(new Date()).slice(0,7)),[selected,setSelected]=useState('');
  const range=monthRange(month),monthItems=(data?.items||[]).filter(i=>new Date(i.startsAt)<new Date(range.to+'T00:00:00+05:30')&&new Date(i.endsAt)>new Date(range.from+'T00:00:00+05:30'));
  const visible=view==='calendar'&&!compact?(selected?monthItems.filter(i=>onDay(i,selected)):monthItems):(data?.items||[]);
  return <section className="card stack contest-calendar" aria-label="Contest schedules">
    <p className="eyebrow">Practice / beyond campus</p><div className="schedule-heading"><h2>Coding contests</h2><button disabled={busy} onClick={retry}>Check schedules</button></div>
    {!compact&&<p className="muted">Choose Codeforces, or Clist coverage for LeetCode, AtCoder and CodeChef. Clist shows up to 100 upcoming or running contests; confirm details at the source.</p>}
    <label>Schedule source<select value={source} onChange={e=>{setSource(e.target.value);setSelected('');}}><option value="codeforces">Codeforces</option><option value="clist">Clist � LeetCode, AtCoder, CodeChef</option></select></label>
    {!compact&&<div className="schedule-toolbar"><div className="schedule-switch"><button aria-pressed={view==='list'} onClick={()=>setView('list')}>List</button><button aria-pressed={view==='calendar'} onClick={()=>setView('calendar')}>Calendar</button></div>{view==='calendar'&&<label>Contest month<input type="month" value={month} onChange={e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){setMonth(e.target.value);setSelected('');}}}/></label>}</div>}
    {busy && <p role="status">Loading cached schedules…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {data && <>
      <p className="muted">Source: <a href={data.sourceUrl} target="_blank" rel="noreferrer">{data.provider}</a>. Times in India time (IST).</p>
      {data.provenance === 'recorded_fixture' && <p className="schedule-notice">Recorded test fixture — these are sample dates, not a live schedule.</p>}
      {data.fetchedAt && <p className="muted">Last successful fetch: <time dateTime={data.fetchedAt}>{scheduleTime(data.fetchedAt)}</time>. {data.stale ? 'Stale cache — confirm dates with the provider.' : 'Cached schedule.'}</p>}
      {data.status === 'unavailable' && <p role="status">Schedules are unavailable. No successful fetch has been saved yet.</p>}
      {!data.refreshEnabled ? <p className="muted">Provider refresh is disabled. Saved schedules remain available.</p> : <p className="muted">Updates run in the background when due. Check again shortly; repeated checks do not bypass the cooldown.</p>}
      {!compact&&view==='calendar'&&<ScheduleMonth month={month} items={monthItems} selected={selected} onSelect={setSelected}/>}
      <ul className="schedule-list">{visible.slice(0, compact ? 3 : 100).map(item => <li key={item.providerId}>
        <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
        <p><time dateTime={item.startsAt}>{scheduleTime(item.startsAt)}</time></p><small className="muted">Ends {scheduleTime(item.endsAt)} IST</small>
      </li>)}</ul>
      {data.status !== 'unavailable' && !visible.length && <p>No upcoming or running contests in this selection of the saved schedule.</p>}
      {compact && <Link to="/contests">All schedules →</Link>}
    </>}
  </section>;
}
