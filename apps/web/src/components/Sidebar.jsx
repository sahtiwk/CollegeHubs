import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { logout } from '../api';
import { CalendarDays, ChartNoAxesColumn, House, MessagesSquare, Trophy, Swords } from 'lucide-react';
import ModuleNavigation from './ModuleNavigation';
export default function Sidebar({ onNavigate = () => {}, onEdit }) {
  const { user } = useAuth();
  return <div className="sidebar-content">
    <div className="identity"><span className="avatar" aria-hidden="true">{(user.fullName || user.username).slice(0, 1).toUpperCase()}</span>
      <strong>{user.fullName || user.username}</strong><span className="muted">@{user.username}</span></div>
    <nav aria-label="Hub navigation">
      <NavLink to="/dashboard" end onClick={onNavigate}><House size={17} aria-hidden="true" /> Home</NavLink>
      <Link to="/dashboard#subject-spaces" onClick={onNavigate}><MessagesSquare size={17} aria-hidden="true" /> Channels &amp; Study</Link>
      <Link to="/dashboard#workspace-calendar" onClick={onNavigate}><CalendarDays size={17} aria-hidden="true" /> Calendar</Link>
      <NavLink to="/progress" onClick={onNavigate}><ChartNoAxesColumn size={17} aria-hidden="true" /> Your progress</NavLink>
      <NavLink to="/leaderboard" onClick={onNavigate}><Trophy size={17} aria-hidden="true" /> Leaderboard</NavLink>
      <NavLink to="/contests" onClick={onNavigate}><Swords size={17} aria-hidden="true" /> Contests</NavLink>
    </nav>
    <ModuleNavigation onNavigate={onNavigate} />
    <button onClick={() => { onNavigate(); onEdit(); }}>Edit profile</button>
    <NavLink to="/verify-email" onClick={onNavigate}>Email &amp; sign-in settings</NavLink>
    <button className="quiet" onClick={() => logout()}>Sign out</button>
  </div>;
}
