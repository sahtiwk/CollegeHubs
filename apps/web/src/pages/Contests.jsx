import React from 'react';
import ContestSchedule from '../components/ContestSchedule';
import AcademicCalendar from '../components/AcademicCalendar';
export default function Contests() {
  return <section className="stack"><header className="schedule-page-head"><p className="eyebrow">YOUR TIME / WELL SPENT</p><h1>Make time<br />to learn.</h1><p className="muted">Your subject dates, a little practice, and room to grow. Browse the month or take your academic calendar with you.</p></header>
    <div className="schedule-page-columns"><AcademicCalendar /><ContestSchedule /></div>
  </section>;
}
