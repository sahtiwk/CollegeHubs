import React from 'react';
import ContestSchedule from '../components/ContestSchedule';
import AcademicCalendar from '../components/AcademicCalendar';
export default function Contests() {
  return <section className="stack"><p className="eyebrow">Beyond the classroom</p><h1>Make time<br />to learn.</h1><p className="muted">Public contest schedules and your subject calendar. Calendar export is unavailable.</p>
    <ContestSchedule /><AcademicCalendar />
  </section>;
}
