import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useSchedule, scheduleTime } from '../hooks/useSchedule';
import api from '../api';
import ScheduleMonth,{indiaDay,monthRange,onDay} from './ScheduleMonth';
import '../styles/schedules.css';
export default function AcademicCalendar({channelId:fixedChannel}) {
  const {user}=useAuth(),[selection,setSelection]=useState(''),[month,setMonth]=useState(()=>indiaDay(new Date()).slice(0,7));
  const channels=useSchedule(fixedChannel?null:'/hubs/'+user.hubId+'/channels'),choices=channels.data?.items||[];
  const channelId=fixedChannel||(choices.some(r=>r._id===selection)?selection:choices.find(r=>r.slug==='dsa')?._id||choices[0]?._id);
  return <section className="card stack academic-calendar" aria-label="Academic calendar">
    <header><p className="eyebrow">Campus / your subject</p><h2>Academic calendar</h2><p className="muted">Make room for what matters. All dates below use India time (IST).</p></header>
    <div className="schedule-toolbar">{!fixedChannel&&<label>Subject channel<select value={channelId||''} onChange={e=>setSelection(e.target.value)} disabled={!choices.length}><option value="" disabled>Select a subject</option>{choices.map(c=><option key={c._id} value={c._id}>{c.title}</option>)}</select></label>}
      <label>Calendar month<input type="month" value={month} min="1900-01" max="2100-12" onChange={e=>{if(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value))setMonth(e.target.value);}}/></label></div>
    {channels.error&&<p role="alert">{channels.error} <button onClick={channels.retry}>Retry channels</button></p>}
    {channels.busy&&<p role="status">Loading channels…</p>}
    {channelId&&<CalendarResults key={user.hubId+channelId+month} hubId={user.hubId} channelId={channelId} month={month}/>}
  </section>;
}
function CalendarResults({hubId,channelId,month}) {
  const [view,setView]=useState('list'),[selected,setSelected]=useState(''),[cursor,setCursor]=useState(''),[previous,setPrevious]=useState([]),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  const range=monthRange(month),params=new URLSearchParams({channelId,...range}),base='/hubs/'+hubId+'/calendar';
  const calendar=useSchedule(base+'?'+params+'&limit=25'+(cursor?'&cursor='+encodeURIComponent(cursor):''));
  const items=[...previous,...(calendar.data?.items||[])],visible=view==='calendar'&&selected?items.filter(i=>onDay(i,selected)):items;
  async function download(){setExporting(true);setExportError('');try{
    const response=await api.get(base+'/export.ics?'+params,{responseType:'blob'});
    if(!response.headers['content-type']?.startsWith('text/calendar'))throw Error();
    const url=URL.createObjectURL(response.data),link=document.createElement('a');link.href=url;link.download='collegehubs-'+month+'.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{setExportError('Export could not be prepared. Retry, or choose a smaller range.');}finally{setExporting(false);}}
  return <><div className="schedule-heading"><div className="schedule-switch" aria-label="Calendar view"><button aria-pressed={view==='list'} onClick={()=>setView('list')}>List</button><button aria-pressed={view==='calendar'} onClick={()=>setView('calendar')}>Calendar</button></div><button disabled={calendar.busy} onClick={()=>{setPrevious([]);setCursor('');calendar.retry();}}>Refresh calendar</button></div>
    <p className="schedule-notice">Sample events are demonstrations, not official announcements. Reviewed events link to their source; confirm changes there.</p>
    {calendar.busy&&<p role="status">Loading calendar…</p>}{calendar.error&&<p role="alert">{calendar.error} <button onClick={calendar.retry}>Retry calendar</button></p>}
    {view==='calendar'&&<ScheduleMonth month={month} items={items} selected={selected} onSelect={setSelected}/>}
    <ul className="schedule-events">{visible.map(item=><li key={item._id}><div className="schedule-date" aria-hidden="true">{indiaDay(item.startsAt).slice(8)}<small>{new Intl.DateTimeFormat('en',{timeZone:'Asia/Kolkata',month:'short'}).format(new Date(item.startsAt))}</small></div><div>
      <span className="schedule-badge">{item.provenance==='official_reviewed'?'Source reviewed':'Sample'}</span>{item.past&&<small>Past event</small>}<h3>{item.title}</h3>
      <p><time dateTime={item.startsAt}>{scheduleTime(item.startsAt)}</time> – <time dateTime={item.endsAt}>{scheduleTime(item.endsAt)}</time> IST</p>
      <p className="schedule-source">{item.sourceUrl?<a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceRef}</a>:item.sourceRef} · Version {item.version}</p>
      {item.reviewedAt&&<small className="muted">Reviewed {scheduleTime(item.reviewedAt)} IST · Source timezone: {item.timezone}</small>}
    </div></li>)}</ul>
    {!calendar.busy&&!calendar.error&&!visible.length&&<p className="schedule-empty">No events {selected&&view==='calendar'?'on this day':'in this month'}. Try another month or subject. Older samples keep their original dates.</p>}
    {calendar.data?.nextCursor&&<><p className="muted">More events remain. The calendar shows only the events loaded so far.</p><button onClick={()=>{setPrevious(items);setCursor(calendar.data.nextCursor);}}>Load more events</button></>}
    <div className="schedule-export"><button disabled={exporting||calendar.busy||!!calendar.error||!items.length} onClick={download}>{exporting?'Preparing calendar…':'Download month (.ics)'}</button><p>Import this file into your calendar app. Includes this subject’s full selected month, including samples. This is a snapshot, not automatic synchronization.</p>{exportError&&<p role="alert">{exportError}</p>}</div>
  </>;
}
