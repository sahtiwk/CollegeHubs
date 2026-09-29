import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User2, ArrowRight } from 'lucide-react';
import api, { saveSession } from '../api.js';

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { username, email, password });
      saveSession(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register. Please try again.');
    } finally { setLoading(false); }
  };

  const PERKS = [
    { value: '∞', label: 'levels to climb', color: '#7c3aed' },
    { value: '3', label: 'platforms tracked', color: '#06b6d4' },
    { value: '#1', label: 'profile recruiters remember', color: '#f59e0b' },
  ];

  return (
    <>
      <style>{`
        @keyframes floatA{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-40px) scale(1.05)}}
        @keyframes floatB{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(30px) scale(0.97)}}
        @keyframes floatC{0%,100%{transform:translateY(0)}33%{transform:translateY(-20px)}66%{transform:translateY(15px)}}
        @keyframes regCardIn{from{transform:translateY(24px) scale(0.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
        @keyframes leftIn{from{transform:translateX(-30px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes perkIn{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.7)}}
        .reg-card{animation:regCardIn 500ms cubic-bezier(0.34,1.56,0.64,1) forwards}
        .left-in{animation:leftIn 600ms cubic-bezier(0.34,1.56,0.64,1) forwards}
        .perk-0{animation:perkIn 500ms cubic-bezier(0.34,1.56,0.64,1) 200ms both}
        .perk-1{animation:perkIn 500ms cubic-bezier(0.34,1.56,0.64,1) 320ms both}
        .perk-2{animation:perkIn 500ms cubic-bezier(0.34,1.56,0.64,1) 440ms both}
        .orb-a{animation:floatA 9s ease-in-out infinite}
        .orb-b{animation:floatB 11s ease-in-out infinite}
        .orb-c{animation:floatC 13s ease-in-out infinite 2s}
        .pulse-dot{animation:pulseDot 2s ease-in-out infinite}
        .aura-label{background:linear-gradient(90deg,#f59e0b,#fcd34d,#f59e0b);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 3s linear infinite}
        .gradient-heading{background:linear-gradient(135deg,#a78bfa,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .reg-input{width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#0a0a0f;padding:11px 14px;font-size:14px;color:white;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;font-family:inherit}
        .reg-input::placeholder{color:#4b5563}
        .reg-input:focus{border-color:rgba(124,58,237,.6);box-shadow:0 0 0 3px rgba(124,58,237,.18)}
        .reg-submit{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;font-size:14px;font-weight:600;border:none;cursor:pointer;transition:transform .15s,box-shadow .2s,opacity .2s;font-family:inherit}
        .reg-submit:hover:not(:disabled){transform:scale(1.02);box-shadow:0 0 24px rgba(124,58,237,.5)}
        .reg-submit:disabled{opacity:.6;cursor:not-allowed}
      `}</style>

      <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0f', color:'white', fontFamily:'system-ui,-apple-system,sans-serif' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', padding:'60px 48px' }}>
          <div className="orb-a" style={{ position:'absolute', top:'10%', left:'5%', width:500, height:500, background:'radial-gradient(circle,rgba(124,58,237,0.18),transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />
          <div className="orb-b" style={{ position:'absolute', bottom:'5%', right:'10%', width:380, height:380, background:'radial-gradient(circle,rgba(6,182,212,0.14),transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />
          <div className="orb-c" style={{ position:'absolute', top:'50%', left:'50%', width:300, height:300, background:'radial-gradient(circle,rgba(245,158,11,0.08),transparent 70%)', filter:'blur(40px)', pointerEvents:'none', transform:'translate(-50%,-50%)' }} />

          <div className="left-in" style={{ position:'relative', maxWidth:420 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.35em', textTransform:'uppercase', color:'rgba(167,139,250,0.7)', marginBottom:20 }}>
              Join the Network
            </p>
            <h1 style={{ fontSize:52, fontWeight:800, lineHeight:1.1, marginBottom:20 }}>
              Start your<br />
              <span className="gradient-heading">Aura Journey</span>
            </h1>
            <p style={{ fontSize:15, color:'#9ca3af', lineHeight:1.7, marginBottom:36 }}>
              Create a profile that showcases the grind behind your GitHub graph,
              Codeforces rating, and LeetCode streaks.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {PERKS.map((p, i) => (
                <div key={i} className={`perk-${i}`} style={{ display:'flex', alignItems:'center', gap:16, background:'#111118', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px 18px' }}>
                  <div className="pulse-dot" style={{ width:8, height:8, borderRadius:'50%', background:p.color, boxShadow:`0 0 8px ${p.color}`, flexShrink:0, animationDelay:`${i*0.4}s` }} />
                  <span style={{ fontSize:22, fontWeight:800, color:p.color }}>{p.value}</span>
                  <span style={{ fontSize:13, color:'#6b7280' }}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width:1, background:'linear-gradient(to bottom,transparent,rgba(255,255,255,0.06),transparent)', flexShrink:0 }} />

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 32px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'20%', right:'10%', width:300, height:300, background:'radial-gradient(circle,rgba(124,58,237,0.08),transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />

          <div className="reg-card" style={{ width:'100%', maxWidth:420, background:'#111118', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, padding:'40px 36px', position:'relative' }}>

            <p className="aura-label" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', textAlign:'center', marginBottom:20 }}>
              ✦ AURA ENGINE
            </p>

            <h2 style={{ fontSize:24, fontWeight:700, color:'white', marginBottom:6 }}>
              Create your account
            </h2>
            <p style={{ fontSize:14, color:'#6b7280', marginBottom:28 }}>
              Takes less than a minute. Connect GitHub & LeetCode after.
            </p>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500, color:'#9ca3af', marginBottom:6 }}>
                  <User2 size={13} style={{ color:'#6b7280' }} /> Username
                </label>
                <input type="text" required value={username} onChange={(e)=>setUsername(e.target.value)} className="reg-input" placeholder="safiullah" autoComplete="username" />
              </div>
              <div>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500, color:'#9ca3af', marginBottom:6 }}>
                  <Mail size={13} style={{ color:'#6b7280' }} /> Email
                </label>
                <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="reg-input" placeholder="you@college.edu" autoComplete="email" />
              </div>
              <div>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500, color:'#9ca3af', marginBottom:6 }}>
                  <Lock size={13} style={{ color:'#6b7280' }} /> Password
                </label>
                <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="reg-input" placeholder="••••••••" autoComplete="new-password" />
              </div>

              {error && (
                <div style={{ fontSize:13, color:'#f87171', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'10px 14px' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="reg-submit" style={{ marginTop:4 }}>
                {loading ? 'Creating account...' : 'Create account'}
                <ArrowRight size={16} />
              </button>
            </form>

            <p style={{ marginTop:20, textAlign:'center', fontSize:13, color:'#6b7280' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color:'#a78bfa', fontWeight:500, textDecoration:'none' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Register;