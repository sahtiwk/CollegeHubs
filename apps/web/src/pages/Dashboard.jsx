import React, { useEffect, useState } from 'react';
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
    <section className="workspace-welcome"><div><p className="eyebrow">YOUR CAMPUS / YOUR NEXT CHAPTER</p><h1>Make room for<br /><em>your next idea.</em></h1><p>Welcome back, {user.fullName || user.username}. Pick one useful thing to do at {hub?.name || 'your college'}.</p></div><span className="workspace-star" aria-hidden="true">✳</span></section>
    <section className="workspace-start" aria-labelledby="start-heading"><div><p className="eyebrow">01 / PICK UP THE THREAD</p><h2 id="start-heading">Where would you like to begin?</h2><p>Open a subject conversation, find a Study room, or return to saved practice.</p></div><a className="button primary" href="#subject-spaces">Find a subject space ↗</a></section>
    <section className="workspace-subjects" id="subject-spaces" aria-labelledby="subjects-heading"><div className="section-heading"><div><p className="eyebrow">02 / YOUR PEOPLE, YOUR SUBJECTS</p><h2 id="subjects-heading">A place to think together.</h2></div><span className="pill">College-only</span></div>
      {loading ? <p role="status">Loading your subject spaces…</p> : error ? <p role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry channels</button></p> : channels.length ? <ul className="subject-grid">{channels.map((channel,index) => <li key={channel._id}><span className="eyebrow">SUBJECT / {String(index+1).padStart(2,'0')}</span><h3>{channel.title}</h3><div><Link to={'/channels/' + channel._id}>Open conversation ↗</Link><Link to={'/channels/' + channel._id + '/study'}>Find a Study room</Link></div></li>)}</ul> : <div className="empty-state"><h3>No subject spaces yet.</h3><p>Your college has not published any channels.</p></div>}
    </section>
    <section id="workspace-calendar" aria-label="Your schedule"><div className="section-heading"><div><p className="eyebrow">03 / MAKE A LITTLE TIME</p><h2>Coming up on campus.</h2></div></div><div className="schedule-layout"><AcademicCalendar /><RightSidebar /></div></section>
    <section id="workspace-progress" aria-label="Continue saved practice"><div className="section-heading"><div><p className="eyebrow">04 / PICK UP WHERE YOU LEFT OFF</p><h2>Keep your progress in view.</h2></div></div><div className="dashboard-progress"><LearnProgressCard firstSteps onProfile={() => setProfileOpen(true)} /><AuraCard /></div></section>
    <section className="workspace-feed" aria-label="College feed"><div className="section-heading"><div><p className="eyebrow">05 / FROM YOUR COMMUNITY</p><h2>On your campus.</h2></div><span className="pill">College feed</span></div><Feed /></section>
    <OnboardingModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
  </div>;
}
