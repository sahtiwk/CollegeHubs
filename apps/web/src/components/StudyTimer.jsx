import React, { useEffect, useState } from 'react';
import { remainingMs } from '../realtime/study';
export function useStudyRemaining(endAt, clock) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => { const timer = setInterval(() => setNow(performance.now()), 250); return () => clearInterval(timer); }, []);
  return remainingMs(endAt, clock, now);
}
export default function StudyTimer({ room, clock }) {
  const remaining = useStudyRemaining(room.endAt, clock), seconds = Math.ceil((remaining || 0) / 1000);
  return <div className="study-timer"><span className="eyebrow">{room.status === 'waiting' ? 'Planned session' : room.status === 'review' ? 'Session complete' : 'Time remaining'}</span>
    <strong role="timer" aria-label="Time remaining">{room.status === 'waiting' ? room.durationMinutes + ' min' : room.status === 'review' ? 'Closed' : `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}</strong>
    <small>{room.status === 'active' && remaining === 0 ? 'Deadline reached. Synchronizing sealed work...' : 'Everyone shares the same server deadline.'}</small></div>;
}
