import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useHubTheme } from '../theme/HubThemeProvider';
import api from '../api';
import Feed from '../components/Feed';
import AuraCard from '../components/AuraCard';
import AcademicCalendar from '../components/AcademicCalendar';
import RightSidebar from '../components/RightSidebar';
import OnboardingModal from '../components/OnboardingModal';
export default function Dashboard() {
  const { user } = useAuth();
  const { hub } = useHubTheme();
  const [dismissed, setDismissed] = useState(false);
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setChannels([]); setError('');
    const hubId = user.hubs[0].hubId;
    api.get('/hubs/' + hubId + '/channels').then(({ data }) => { if (active) setChannels(data.items); })
      .catch(() => { if (active) setError('Subject channels could not be loaded.'); });
    return () => { active = false; };
  }, [user.hubs, attempt]);
  return <>
    <section className="hero">
      <div><p className="eyebrow">A little progress, every day</p><h1>Good ideas<br />start here.</h1>
        <p className="hero-copy">Your corner of {hub?.name || 'campus'}. Share a breakthrough, ask a question, or show what you are building.</p></div>
      <div className="hero-art" aria-hidden="true"><span>&#10038;</span><small>LEARN / BUILD / BELONG</small></div>
    </section>
    <AuraCard />
    <div className="feed-layout">
      <section aria-label="College feed"><div className="section-heading"><h2>On your campus</h2><span className="pill">College feed</span></div><Feed /></section>
      <aside className="channel-card"><p className="eyebrow">Find your people</p><h2>Subject spaces</h2><p className="muted">Your college's channels. Join a subject conversation.</p>
        {error ? <p role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry</button></p> :
          channels.length ? <ul>{channels.map(channel => <li key={channel._id}><span aria-hidden="true">#</span> <Link to={'/channels/' + channel._id}>{channel.title}</Link></li>)}</ul> : <p className="muted">Loading subjects...</p>}
        <div className="channel-footnote">A place for curious minds.</div>
      </aside>
    </div>
    <div className="schedule-layout"><AcademicCalendar /><RightSidebar /></div>
    <OnboardingModal isOpen={!user.onboardingComplete && !dismissed} onClose={() => setDismissed(true)} />
  </>;
}
