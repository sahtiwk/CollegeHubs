import React, { lazy, Suspense, useEffect } from 'react';
import { Navigate, Routes, Route, Outlet, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { HubThemeProvider } from './theme/HubThemeProvider';
import { logout } from './api';
import { rememberIntent, safeReturnPath } from './auth/returnIntent';
import Landing from './pages/Landing';
import PageBoundary from './components/PageBoundary';
const HubShell = lazy(() => import('./components/HubShell'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Channel = lazy(() => import('./pages/Channel'));
const StudyRoom = lazy(() => import('./pages/StudyRoom'));
const StudyLobby = lazy(() => import('./pages/StudyRoom').then(module => ({ default: module.StudyLobby })));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Progress = lazy(() => import('./pages/Progress'));
const Contests = lazy(() => import('./pages/Contests'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const AboutPage = lazy(() => import('./pages/Aboutpage'));
import { LearnRoute, ArcadeRoute, InterviewRoute } from './app/routes';
function MembershipGate() {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  useEffect(() => { if (user && !user.hubs?.length) rememberIntent(location.pathname, user._id); }, [user, location.pathname]);
  if (loading) return <main className="status-page" role="status">Loading your college...</main>;
  if (error) return <main className="status-page stack"><h1>Let's try that again.</h1><p role="alert">{error}</p><button onClick={refresh}>Retry account</button><button onClick={() => logout()}>Sign out</button></main>;
  if (!user) return <Navigate to={'/login?returnTo=' + encodeURIComponent(safeReturnPath(location.pathname) || '/dashboard')} replace />;
  if (user.membershipStatus !== 'active' || !user.hubs?.length) return <Navigate to="/verify-email" replace />;
  return <>{!user.membershipVerified && user.identity?.legacyAccessUntil && <div role="status" className="ui-status ui-status--warning">Verify your mailbox before {new Date(user.identity.legacyAccessUntil).toLocaleString()} to retain Hub access. Your saved work remains. <Link to="/verify-email">Verify email</Link></div>}<Outlet key={user._id + ':' + user.hubId + ':' + user.membershipVersion} /></>;
}
function Workspace() { return <HubThemeProvider><Outlet /></HubThemeProvider>; }
function NotFound() { return <main className="status-page stack"><p className="eyebrow">404 / A small detour</p><h1>This page isn’t here.</h1><p>Your saved work is still in your workspace.</p><Link to="/">Explore CollegeHubs</Link><Link to="/dashboard">Open your dashboard</Link></main>; }
export default function App() {
  const { pathname } = useLocation();
  return <AuthProvider><PageBoundary resetKey={pathname}><Suspense fallback={<main className="status-page" role="status">Opening your page…</main>}><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route path="/verify-email" element={<VerifyEmail />} /><Route path="/about" element={<AboutPage />} />
    <Route element={<MembershipGate />}><Route element={<Workspace />}><Route element={<HubShell />}>
      <Route path="/study-rooms/:id" element={<StudyRoom />} /><Route path="/channels/:id/study" element={<StudyLobby />} />
      <Route path="/channels/:id" element={<Channel />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/arcade" element={<ArcadeRoute />} /><Route path="/arcade/:gameId/:id?" element={<ArcadeRoute />} />
      <Route path="/interview/*" element={<InterviewRoute />} /><Route path="/learn/*" element={<LearnRoute />} />
      <Route path="/dashboard" element={<Dashboard />} /><Route path="/leaderboard" element={<Leaderboard />} /><Route path="/contests" element={<Contests />} />
    </Route></Route></Route>
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense></PageBoundary></AuthProvider>;
}
