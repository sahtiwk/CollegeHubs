import React, { useEffect, useState } from 'react';
import { remainingMs } from '../realtime/study';
export function useStudyRemaining(endAt, clock) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => { const timer = setInterval(() => setNow(performance.now()), 250); return () => clearInterval(timer); }, []);
  return remainingMs(endAt, clock, now);
}
export default function StudyTimer({ room, clock }) {
  const remaining = useStudyRemaining(room.endAt, clock), seconds = Math.ceil((remaining || 0) / 1000);
  return <div className={'study-timer' + (room.status === 'active' && remaining <= 60000 ? ' study-timer-urgent' : '')}><span className="eyebrow">{room.status === 'cancelled' ? 'Not started' : room.status === 'waiting' ? 'Planned session' : room.status === 'review' ? 'Session complete' : 'Time remaining'}</span>
    <strong role="timer" aria-label="Time remaining">{room.status === 'cancelled' ? 'Cancelled' : room.status === 'waiting' ? room.durationMinutes + ' min' : room.status === 'review' ? 'Closed' : remaining === null ? 'Syncing' : `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}</strong>
    <small>{room.status === 'cancelled' ? 'You can join another circle.' : room.status === 'review' ? 'Saved solutions are ready to compare.' : room.status === 'waiting' ? 'The clock begins when the host starts.' : remaining === 0 ? 'Time is up. Checking your final saved work...' : 'Save before time runs out. The server confirms the deadline.'}</small></div>;
}
