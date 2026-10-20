import React, { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { signIn } from '../api';
import {rememberIntent,returnIntent} from '../auth/returnIntent';
import {useIdentityCapabilities} from '../hooks/useIdentityCapabilities';
export default function AuthForm({ register = false }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {googleEnabled}=useIdentityCapabilities();
  useEffect(()=>{rememberIntent(params.get('returnTo'));},[params]);
  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function authenticate(path, body) {
    setBusy(true); setError('');
    try { const data = await signIn(path, body); const target=returnIntent(data.user._id,params.get('verify')!=='1'&&data.user.membershipStatus==='active'&&data.user.membershipVerified); navigate(params.get('verify')==='1'?'/verify-email':data.user.membershipStatus==='active'&&data.user.membershipVerified?target:'/verify-email', { replace: true }); }
    catch (err) { setError(err.response?.data?.error || 'Sign-in is unavailable. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page">
    <section className="auth-intro"><Link to="/" className="wordmark">CollegeHubs.</Link><p className="eyebrow">Better, together</p>
      <h1>Your campus.<br />Your people.<br />Your next idea.</h1><p>A shared space for the things you are learning and the things you have yet to build.</p><span className="auth-star" aria-hidden="true">&#10038;</span></section>
    <section className="auth-panel"><div className="stack"><p className="eyebrow">{register ? 'Join your community' : 'Welcome back'}</p><h2>{register ? 'Make yourself at home.' : 'Pick up where you left off.'}</h2>
      <p className="muted">Use your college email. Hub access requires verified ownership of your email and a configured college domain.</p>
      {params.get('reason') === 'expired' && <p role="status">Your session expired. Sign in to return to your saved drafts.</p>}
      <form className="stack" onSubmit={e => { e.preventDefault(); authenticate(register ? '/auth/register' : '/auth/login', register ? values : { email: values.email, password: values.password }); }}>
        {register && <label htmlFor="username">Username<input id="username" autoComplete="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_.\-]{3,50}" value={values.username} onChange={e => setValues({ ...values, username: e.target.value })} /></label>}
        <label htmlFor="email">College email<input id="email" type="email" autoComplete={register ? 'email' : 'username'} required maxLength={254} value={values.email} onChange={e => setValues({ ...values, email: e.target.value })} /></label>
        <label htmlFor="password">Password<input id="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : undefined} value={values.password} onChange={e => setValues({ ...values, password: e.target.value })} /></label>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait...' : register ? 'Create account' : 'Sign in'}</button>
      </form>
      {googleEnabled && <div className={busy ? 'google-signin busy' : 'google-signin'} inert={busy ? '' : undefined}>
        <GoogleLogin onSuccess={({ credential }) => authenticate('/google/auth', { credential })} onError={() => setError('Google sign-in failed. Please retry.')} /></div>}
      <p>{register ? 'Already part of the community?' : 'New around here?'} <Link to={(register ? '/login' : '/register') + (params.get('returnTo') ? '?returnTo='+encodeURIComponent(params.get('returnTo')) : '')}>{register ? 'Sign in' : 'Create an account'}</Link></p>
      <p className="muted"><a href="/privacy.html">How CollegeHubs uses your information</a></p>
    </div></section>
  </main>;
}
