import React from 'react';
export const indiaDay = value => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function monthRange(month) {
  const first=new Date(month+'-01T00:00:00Z');first.setUTCMonth(first.getUTCMonth()+1);
  return {from:month+'-01',to:first.toISOString().slice(0,10)};
}
export const onDay=(item,day)=>new Date(item.startsAt)<new Date(new Date(day+'T00:00:00+05:30').getTime()+86400000)&&new Date(item.endsAt)>new Date(day+'T00:00:00+05:30');
export default function ScheduleMonth({month,items,selected,onSelect}) {
  const first=new Date(month+'-01T00:00:00Z'),count=new Date(first.getUTCFullYear(),first.getUTCMonth()+1,0).getDate();
  const offset=(first.getUTCDay()+6)%7,today=indiaDay(new Date());
  return <div className="month-view"><div className="month-grid" aria-label="Month days in India time">
    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><span className="month-weekday" key={d}>{d}</span>)}
    {Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}
    {Array.from({length:count},(_,i)=>{const day=month+'-'+String(i+1).padStart(2,'0'),n=items.filter(item=>onDay(item,day)).length;
      return <button key={day} type="button" className={'month-day'+(today===day?' today':'')} aria-pressed={selected===day} aria-label={`${day}, ${n} loaded events`} onClick={()=>onSelect(selected===day?'':day)}><span>{i+1}</span><small aria-hidden="true">{n?`${n} •`:''}</small></button>;})}
  </div><p className="muted">{selected?`Showing ${selected}. Select it again to show the month.`:'Select a day to see its events. Dates follow India time.'}</p></div>;
}
