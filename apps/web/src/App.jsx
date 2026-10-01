import React, { useState } from 'react';
import { Navigate, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { HubThemeProvider } from './theme/HubThemeProvider';
import api, { logout, saveSession } from './api';
import HubShell from './components/HubShell';
import Dashboard from './pages/Dashboard';
import Channel from './pages/Channel';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Contests from './pages/Contests';
import AboutPage from './pages/Aboutpage';
import { LearnRoute } from './app/routes';
function MembershipGate() {
  const { user, loading, error, refresh } = useAuth();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true); setMessage('');
    try { const { data } = await api.post('/me/assignment/retry', {}); setMessage(data.assignment?.message || 'Assignment checked.'); saveSession(data); }
    catch (err) { setMessage(err.response?.data?.error || 'Assignment is unavailable. Please retry.'); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="status-page" role="status">Loading your college...</main>;
  if (error) return <main className="status-page stack"><h1>Let's try that again.</h1><p role="alert">{error}</p><button onClick={refresh}>Retry account</button><button onClick={() => logout()}>Sign out</button></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.membershipStatus !== 'active' || !user.hubs?.length) return <main className="status-page stack">
    <p className="eyebrow">CollegeHubs</p><h1>Your college<br />comes next.</h1>
    <p>{user.membershipStatus === 'disabled' ? 'Your membership is disabled. Contact your college administrator.' : 'Your email domain has not been assigned to an active college Hub. An administrator must confirm and configure the exact domain before you can join.'}</p>
    <p className="muted">Signed in as {user.email}. Changing your profile or college display name cannot change your membership.</p>
    {message && <p role="status">{message}</p>}
    {user.membershipStatus !== 'disabled' && <button className="primary" onClick={retry} disabled={busy}>{busy ? 'Checking...' : 'Retry college assignment'}</button>}
    <button onClick={() => logout()}>Sign out</button>
  </main>;
  return <Outlet key={user._id + ':' + user.hubId + ':' + user.membershipVersion} />;
}
export default function App() {
  return <AuthProvider><HubThemeProvider><Routes>
    <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route path="/about" element={<AboutPage />} />
    <Route element={<MembershipGate />}>
      <Route element={<HubShell />}>
      <Route path="/channels/:id" element={<Channel />} />
      <Route path="/learn/*" element={<LearnRoute />} /><Route path="/" element={<Dashboard />} /><Route path="/leaderboard" element={<Leaderboard />} /><Route path="/contests" element={<Contests />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></HubThemeProvider></AuthProvider>;
}
