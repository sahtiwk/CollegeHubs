import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import api, { saveSession } from '../api.js';

function Login() {
  const pampinchu = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get('reason') === 'expired' ? 'Your session expired. Please sign in again.' : '');

  const handleGoogleSuccess = async ({ credential }) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/google/auth', { credential });
      saveSession(response.data);
      pampinchu('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed. Try again.');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      saveSession(res.data);
      pampinchu('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const LIVE_STATS = [
    { value: '2,847', label: 'problems solved today', color: '#7c3aed' },
    { value: '143', label: 'devs leveled up', color: '#06b6d4' },
    { value: '12', label: 'live contests now', color: '#f59e0b' },
  ];

  return (
    <>
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-40px) scale(1.05); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(30px) scale(0.97); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) scale(1); }
          33% { transform: translateY(-20px) scale(1.03); }
          66% { transform: translateY(15px) scale(0.98); }
        }
        @keyframes loginCardIn {
          from { transform: translateY(24px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes leftContentIn {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes statCardIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .login-card { animation: loginCardIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .left-content { animation: leftContentIn 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .stat-card-0 { animation: statCardIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 200ms both; }
        .stat-card-1 { animation: statCardIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 320ms both; }
        .stat-card-2 { animation: statCardIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 440ms both; }
        .orb-a { animation: floatA 9s ease-in-out infinite; }
        .orb-b { animation: floatB 11s ease-in-out infinite; }
        .orb-c { animation: floatC 13s ease-in-out infinite; }
        .pulse-dot { animation: pulseDot 2s ease-in-out infinite; }
        .aura-label {
          background: linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .gradient-heading {
          background: linear-gradient(135deg, #a78bfa, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .input-field {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: #0a0a0f;
          padding: 11px 14px;
          font-size: 14px;
          color: white;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field::placeholder { color: #4b5563; }
        .input-field:focus {
          border-color: rgba(124, 58, 237, 0.6);
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
        }
        .sign-in-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: white;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
        }
        .sign-in-btn:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 0 24px rgba(124, 58, 237, 0.5);
        }
        .sign-in-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 11px;
          border-radius: 12px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #d1d5db;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .google-btn:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.2);
        }
      `}</style>

      <div style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#0a0a0f',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>

        {/* LEFT PANEL */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '60px 48px',
        }}>
          {/* Background orbs */}
          <div className="orb-a" style={{
            position: 'absolute', top: '10%', left: '5%',
            width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />
          <div className="orb-b" style={{
            position: 'absolute', bottom: '5%', right: '10%',
            width: 380, height: 380,
            background: 'radial-gradient(circle, rgba(6,182,212,0.14), transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />
          <div className="orb-c" style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(245,158,11,0.08), transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
          }} />

          <div className="left-content" style={{ position: 'relative', maxWidth: 420 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.35em',
              textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: 20,
            }}>
              SocialStream • Aura Engine
            </p>

            <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
              Level Up<br />
              <span className="gradient-heading">Your Career</span>
            </h1>

            <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 36 }}>
              Turn every solved problem, commit, and contest into visible Aura.
              Track your growth like an RPG skill tree — but for your dev journey.
            </p>

            {/* Live stat cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {LIVE_STATS.map((stat, i) => (
                <div
                  key={i}
                  className={`stat-card-${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: '#111118',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14, padding: '14px 18px',
                  }}
                >
                  <div className="pulse-dot" style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: stat.color,
                    boxShadow: `0 0 8px ${stat.color}`,
                    flexShrink: 0,
                    animationDelay: `${i * 0.4}s`,
                  }} />
                  <span style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>
                    {stat.value}
                  </span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{
          width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)',
          flexShrink: 0,
        }} />

        {/* RIGHT PANEL — Login Form */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '48px 32px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle right-side orb */}
          <div style={{
            position: 'absolute', top: '20%', right: '10%',
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)',
            filter: 'blur(60px)', pointerEvents: 'none',
          }} />

          <div className="login-card" style={{
            width: '100%', maxWidth: 420,
            background: '#111118',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24, padding: '40px 36px',
            position: 'relative',
          }}>
            {/* Gold badge */}
            <p className="aura-label" style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.3em',
              textTransform: 'uppercase', textAlign: 'center', marginBottom: 20,
            }}>
              ✦ AURA ENGINE
            </p>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 6 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
              Sign in to continue tracking your Aura across the dev universe.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#9ca3af', marginBottom: 6 }}>
                  <Mail size={13} style={{ color: '#6b7280' }} /> Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@college.edu"
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#9ca3af', marginBottom: 6 }}>
                  <Lock size={13} style={{ color: '#6b7280' }} /> Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div style={{
                  fontSize: 13, color: '#f87171',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10, padding: '10px 14px',
                }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="sign-in-btn" style={{ marginTop: 4 }}>
                {loading ? 'Signing in...' : 'Sign in'}
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: 12, color: '#4b5563', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>

            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google sign-in failed. Try again.')} />

            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              New to SocialStream?{' '}
              <Link to="/register" style={{ color: '#a78bfa', fontWeight: 500, textDecoration: 'none' }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;