import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { logout } from '../api';
import ModuleNavigation from './ModuleNavigation';
export default function Sidebar({ onNavigate = () => {}, onEdit }) {
  const { user } = useAuth();
  return <div className="sidebar-content">
    <div className="identity"><span className="avatar" aria-hidden="true">{(user.fullName || user.username).slice(0, 1).toUpperCase()}</span>
      <strong>{user.fullName || user.username}</strong><span className="muted">@{user.username}</span></div>
    <nav aria-label="Hub navigation">
      <NavLink to="/dashboard" end onClick={onNavigate}>Home <span aria-hidden="true">&#8599;</span></NavLink>
      <Link to="/dashboard#subject-spaces" onClick={onNavigate}>Channels &amp; Study <span aria-hidden="true">↗</span></Link>
      <Link to="/dashboard#workspace-calendar" onClick={onNavigate}>Calendar <span aria-hidden="true">↗</span></Link>
      <NavLink to="/progress" onClick={onNavigate}>Your progress <span aria-hidden="true">↗</span></NavLink>
      <NavLink to="/leaderboard" onClick={onNavigate}>Leaderboard <span aria-hidden="true">&#8599;</span></NavLink>
      <NavLink to="/contests" onClick={onNavigate}>Contests <span aria-hidden="true">&#8599;</span></NavLink>
    </nav>
    <ModuleNavigation onNavigate={onNavigate} />
    <div className="sidebar-note"><p className="eyebrow">Your space to grow</p><p>Share your work. Meet your peers. Build something together.</p></div>
    <button onClick={() => { onNavigate(); onEdit(); }}>Edit profile</button>
    <NavLink to="/verify-email" onClick={onNavigate}>Email &amp; sign-in settings</NavLink>
    <button className="quiet" onClick={() => logout()}>Sign out</button>
  </div>;
}
