import React from 'react';
import ContestSchedule from '../components/ContestSchedule';
import AcademicCalendar from '../components/AcademicCalendar';
export default function Contests() {
  return <section className="stack"><header className="schedule-page-head"><h1>Calendar and contests</h1><p className="muted">Browse academic dates and upcoming programming contests.</p></header>
    <div className="schedule-page-columns"><AcademicCalendar /><ContestSchedule /></div>
  </section>;
}
