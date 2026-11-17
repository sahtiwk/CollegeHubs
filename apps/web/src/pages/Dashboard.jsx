import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, Hash, History, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useHubTheme } from '../theme/HubThemeProvider';
import api from '../api';
import Feed from '../components/Feed';
import AuraCard from '../components/AuraCard';
import LearnProgressCard from '../components/LearnProgressCard';
import AcademicCalendar from '../components/AcademicCalendar';
import RightSidebar from '../components/RightSidebar';
import OnboardingModal from '../components/OnboardingModal';
export default function Dashboard() {
  const { user } = useAuth();
  const { hub } = useHubTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setChannels([]); setError(''); setLoading(true);
    const hubId = user.hubs[0].hubId;
    api.get('/hubs/' + hubId + '/channels').then(({ data }) => { if (active) setChannels(data.items); })
      .catch(() => { if (active) setError('Subject channels could not be loaded.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.hubId, attempt]);
  return <div className="workspace-home">
    <section className="workspace-welcome">
      <div><p className="eyebrow">{hub?.name || 'Your college Hub'}</p><h1>Welcome back, {user.fullName?.split(' ')[0] || user.username}.</h1><p>Pick up your coursework, conversations, and practice.</p></div>
      <Terminal className="workspace-terminal" size={100} strokeWidth={1} aria-hidden="true" />
    </section>
    <nav className="workspace-shortcuts" aria-label="Workspace shortcuts">
      <a href="#subject-spaces"><Hash size={19} aria-hidden="true" /> Subject channels <ArrowUpRight size={15} aria-hidden="true" /></a>
      <a href="#workspace-calendar"><CalendarDays size={19} aria-hidden="true" /> College calendar <ArrowUpRight size={15} aria-hidden="true" /></a>
      <a href="#workspace-progress"><History size={19} aria-hidden="true" /> Saved practice <ArrowUpRight size={15} aria-hidden="true" /></a>
    </nav>
    <section className="workspace-subjects" id="subject-spaces" aria-labelledby="subjects-heading"><div className="section-heading"><div><h2 id="subjects-heading">Subject channels</h2></div><span className="pill">College-only</span></div>
      {loading ? <p role="status">Loading your subject spaces…</p> : error ? <p role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry channels</button></p> : channels.length ? <ul className="subject-grid">{channels.map(channel => <li key={channel._id}><Hash size={20} className="subject-icon" aria-hidden="true" /><h3>{channel.title}</h3><div><Link to={'/channels/' + channel._id}>Open conversation ↗</Link><Link to={'/channels/' + channel._id + '/study'}>Find a Study room</Link></div></li>)}</ul> : <div className="empty-state"><h3>No subject spaces yet.</h3><p>Your college has not published any channels.</p></div>}
    </section>
    <section id="workspace-calendar" aria-label="Your schedule"><div className="section-heading"><div><h2>College calendar</h2></div></div><div className="schedule-layout"><AcademicCalendar /><RightSidebar /></div></section>
    <section id="workspace-progress" aria-label="Continue saved practice"><div className="section-heading"><div><h2>Continue learning and practice</h2></div></div><div className="dashboard-progress"><LearnProgressCard firstSteps onProfile={() => setProfileOpen(true)} /><AuraCard /></div></section>
    <section className="workspace-feed" aria-label="College feed"><div className="section-heading"><div><h2>College feed</h2></div></div><Feed /></section>
    <OnboardingModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
  </div>;
}
