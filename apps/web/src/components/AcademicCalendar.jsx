import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useSchedule, scheduleTime } from '../hooks/useSchedule';
export default function AcademicCalendar({ channelId: fixedChannel }) {
  const { user } = useAuth(); const [selection, setSelection] = useState('');
  const channels = useSchedule(fixedChannel ? null : '/hubs/' + user.hubId + '/channels');
  const choices = channels.data?.items || [];
  const channelId = fixedChannel || (choices.some(row => row._id === selection) ? selection : choices.find(row => row.slug === 'dsa')?._id || choices[0]?._id);
  const calendar = useSchedule(channelId ? '/hubs/' + user.hubId + '/calendar?channelId=' + channelId : null);
  return <section className="card stack" aria-label="Academic calendar"><h2>Academic calendar</h2>
    <p className="schedule-notice">Sample academic events for demonstration. These are not official college announcements. Times in India time (IST).</p>
    {!fixedChannel && <label>Subject channel<select value={channelId || ''} onChange={event => setSelection(event.target.value)} disabled={!choices.length}><option value="" disabled>Select a subject</option>{choices.map(row => <option value={row._id} key={row._id}>{row.title}</option>)}</select></label>}
    {(channels.busy || calendar.busy) && <p role="status">Loading calendar…</p>}
    {(channels.error || calendar.error) && <p className="error" role="alert">{channels.error || calendar.error}</p>}
    <button disabled={channels.busy || calendar.busy} onClick={() => { if (channels.error) channels.retry(); calendar.retry(); }}>Refresh calendar</button>
    {calendar.data && <><ul className="schedule-list">{calendar.data.items.map(item => <li key={item._id}><h3>{item.title}</h3><p><time dateTime={item.startsAt}>{scheduleTime(item.startsAt)}</time></p><small className="muted">Ends {scheduleTime(item.endsAt)} IST · Sample event</small></li>)}</ul>
      {!calendar.data.items.length && <p>No academic events have been seeded for this channel.</p>}
      {calendar.data.hasMore && <p className="muted">Showing the first 100 seeded events.</p>}</>}
  </section>;
}
