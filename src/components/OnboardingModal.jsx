import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

const COOKING_MESSAGES = [
  'Syncing LeetCode handle...','Calibrating Aura levels...',
  'Mapping your college...','Forging your identity...','Profile forged. Welcome, dev. ✦',
];

function OnboardingModal({ open, initialUser, onComplete }) {
  const navigate = useNavigate();
  const [cardVisible, setCardVisible] = useState(false);
  const [phase, setPhase] = useState('form');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [codeforcesHandle, setCodeforcesHandle] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cookingStep, setCookingStep] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const [cookingDone, setCookingDone] = useState(false);
  const completedData = useRef(null);

  useEffect(() => {
    if (!open) { setCardVisible(false); setPhase('form'); setCookingDone(false); return; }
    const id = requestAnimationFrame(() => setCardVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (open && initialUser) {
      setFullName(initialUser.fullName || '');
      setBio(initialUser.bio || '');
      setLeetcodeUsername(initialUser.leetcodeHandle || '');
      setCodeforcesHandle(initialUser.codeforcesHandle || '');
      setGithubUsername(initialUser.githubHandle || '');
    }
  }, [open, initialUser]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (phase !== 'cooking') return;
    setProgressWidth(0); setCookingStep(0); setCookingDone(false);
    const prog = setInterval(() => {
      setProgressWidth((p) => { if (p >= 100) { clearInterval(prog); return 100; } return p + 2; });
    }, 50);
    const msg = setInterval(() => {
      setCookingStep((p) => {
        if (p >= COOKING_MESSAGES.length - 1) {
          clearInterval(msg);
          setTimeout(() => setCookingDone(true), 500);
          return p;
        }
        return p + 1;
      });
    }, 550);
    return () => { clearInterval(prog); clearInterval(msg); };
  }, [phase]);


  const handleContinue = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.put('/users/onboarding', {
        fullName: fullName.trim(), bio: bio.trim(),
        leetcodeUsername: leetcodeUsername.trim(),
        codeforcesHandle: codeforcesHandle.trim(),
        githubUsername: githubUsername.trim(),
      });
      completedData.current = res.data;
      setPhase('cooking');
    } catch (err) {
      window.alert(err.response?.data?.error || 'Could not save your profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = () => { if (completedData.current) onComplete(completedData.current); navigate('/'); };
  const handleSeeHowItWorks = () => { if (completedData.current) onComplete(completedData.current); navigate('/about'); };

  const fd = (i) => ({
    opacity: 0,
    animation: cardVisible ? `obFieldIn 400ms cubic-bezier(0.34,1.56,0.64,1) ${i * 75}ms forwards` : 'none',
  });

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes obCardIn { from{transform:scale(0.88) translateY(20px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        @keyframes obFieldIn { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes obCookIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes obMsgFade { 0%{opacity:0;transform:translateY(6px)} 20%,80%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-6px)} }
        @keyframes obShimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes obOrbPulse { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.18);opacity:1} }
        @keyframes obBtnPop { from{opacity:0;transform:translateY(16px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes obCheckPop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.2) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
        .ob-card{animation:obCardIn 420ms cubic-bezier(0.34,1.56,0.64,1) forwards}
        .ob-cook{animation:obCookIn 350ms ease forwards}
        .ob-msg{animation:obMsgFade 550ms ease forwards}
        .ob-progress{background:linear-gradient(90deg,#7c3aed,#06b6d4,#f59e0b,#7c3aed);background-size:200% auto;animation:obShimmer 1.5s linear infinite}
        .ob-orb{animation:obOrbPulse 2s ease-in-out infinite}
        .ob-btn0{animation:obBtnPop 450ms cubic-bezier(0.34,1.56,0.64,1) 100ms both}
        .ob-btn1{animation:obBtnPop 450ms cubic-bezier(0.34,1.56,0.64,1) 240ms both}
        .ob-check{animation:obCheckPop 500ms cubic-bezier(0.34,1.56,0.64,1) forwards}
        .ob-input{width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#0a0a0f;padding:11px 14px;font-size:14px;color:white;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}
        .ob-input::placeholder{color:#4b5563}
        .ob-input:focus{border-color:rgba(124,58,237,.6);box-shadow:0 0 0 3px rgba(124,58,237,.18)}
        .ob-dropdown{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:9999;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#1a1a2e;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.6)}
        .ob-opt{width:100%;padding:12px 16px;text-align:left;font-size:14px;color:#e2e8f0;background:transparent;border:none;cursor:pointer;transition:background .15s;display:block}
        .ob-opt:hover{background:rgba(124,58,237,.18)}
        .ob-lock{width:100%;padding:13px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;font-size:15px;font-weight:600;border:none;cursor:pointer;transition:transform .15s,box-shadow .2s,opacity .2s;margin-top:8px}
        .ob-lock:hover:not(:disabled){transform:scale(1.02);box-shadow:0 0 28px rgba(124,58,237,.4)}
        .ob-lock:disabled{opacity:.55;cursor:not-allowed}
        .ob-cta-primary{flex:1;padding:14px 20px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;font-size:14px;font-weight:700;border:none;cursor:pointer;transition:transform .15s,box-shadow .2s}
        .ob-cta-primary:hover{transform:scale(1.03);box-shadow:0 0 28px rgba(124,58,237,.45)}
        .ob-cta-secondary{flex:1;padding:14px 20px;border-radius:14px;background:transparent;border:1px solid rgba(255,255,255,.12);color:#a78bfa;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s,transform .15s}
        .ob-cta-secondary:hover{background:rgba(124,58,237,.1);border-color:rgba(124,58,237,.4);transform:scale(1.02)}
      `}</style>

      <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',padding:16}}>
        <div className="ob-card" style={{width:'100%',maxWidth:520,maxHeight:'90vh',background:'#111118',border:'1px solid rgba(255,255,255,0.09)',borderRadius:22,boxShadow:'0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(124,58,237,0.12)',overflowY:'auto',padding:'40px 36px',position:'relative'}}>

          {phase === 'form' && (
            <>
              <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',textAlign:'center',color:'#f59e0b',textShadow:'0 0 20px rgba(245,158,11,0.4)',marginBottom:14}}>✦ SETUP YOUR AURA</p>
              <h2 style={{fontSize:26,fontWeight:800,color:'white',textAlign:'center',marginBottom:8}}>Who are you, dev?</h2>
              <p style={{fontSize:14,color:'#6b7280',textAlign:'center',marginBottom:32}}>Your profile fuels your Aura. Set it once, flex it forever.</p>

              <div style={{display:'flex',flexDirection:'column',gap:18}}>
                <div style={fd(0)}>
                  <label style={{display:'block',fontSize:13,fontWeight:500,color:'#9ca3af',marginBottom:7}}>Full Name</label>
                  <input type="text" value={fullName} onChange={(e)=>setFullName(e.target.value)} className="ob-input" placeholder="Your name" autoComplete="name"/>
                </div>
                <div style={fd(1)}>
                  <label style={{display:'block',fontSize:13,fontWeight:500,color:'#9ca3af',marginBottom:7}}>Bio</label>
                  <textarea value={bio} onChange={(e)=>setBio(e.target.value)} rows={3} placeholder="CS Student • Competitive Programmer • Builder" className="ob-input" style={{resize:'none'}}/>
                </div>
                <p style={fd(2)}>College: {initialUser?.college || 'Assigned from your email domain'}</p>
                <div style={fd(3)}>
                  <label style={{display:'block',fontSize:13,fontWeight:500,color:'#9ca3af',marginBottom:7}}>LeetCode Username</label>
                  <input type="text" value={leetcodeUsername} onChange={(e)=>setLeetcodeUsername(e.target.value)} className="ob-input" placeholder="leetcode_user"/>
                </div>
                <div style={fd(4)}>
                  <label style={{display:'block',fontSize:13,fontWeight:500,color:'#9ca3af',marginBottom:7}}>Codeforces Handle</label>
                  <input type="text" value={codeforcesHandle} onChange={(e)=>setCodeforcesHandle(e.target.value)} className="ob-input" placeholder="codeforces_handle"/>
                </div>
                <div style={fd(5)}>
                  <label style={{display:'block',fontSize:13,fontWeight:500,color:'#9ca3af',marginBottom:7}}>GitHub Username</label>
                  <input type="text" value={githubUsername} onChange={(e)=>setGithubUsername(e.target.value)} className="ob-input" placeholder="github_user"/>
                </div>
              </div>

              <div style={fd(6)}>
                <button type="button" disabled={submitting} onClick={handleContinue} className="ob-lock">
                  {submitting ? 'Saving…' : 'Lock In My Aura →'}
                </button>
              </div>
            </>
          )}

          {phase === 'cooking' && (
            <div className="ob-cook" style={{minHeight:340,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,textAlign:'center',padding:'20px 0'}}>
              <div style={{position:'relative',width:88,height:88}}>
                <div className="ob-orb" style={{position:'absolute',inset:0,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.5),rgba(6,182,212,0.2))',filter:'blur(10px)'}}/>
                <div style={{position:'relative',fontSize:44,display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
                  {cookingDone ? <span className="ob-check" style={{color:'#f59e0b'}}>✦</span> : '🔥'}
                </div>
              </div>

              <div>
                <h3 style={{fontSize:22,fontWeight:800,color:'white',marginBottom:6}}>
                  {cookingDone ? 'Your Aura is forged.' : 'Your Aura is being forged...'}
                </h3>
                <p style={{fontSize:14,color:'#6b7280'}}>
                  {cookingDone ? 'Choose your next move, dev.' : 'This will only take a moment.'}
                </p>
              </div>

              {!cookingDone && (
                <>
                  <div style={{width:'100%',maxWidth:320,height:4,borderRadius:99,background:'rgba(255,255,255,0.07)',overflow:'hidden'}}>
                    <div className="ob-progress" style={{height:'100%',borderRadius:99,width:`${progressWidth}%`,transition:'width 0.1s linear'}}/>
                  </div>
                  <p key={cookingStep} className="ob-msg" style={{fontSize:13,color:'#a78bfa',minHeight:20}}>
                    {COOKING_MESSAGES[cookingStep]}
                  </p>
                </>
              )}

              {cookingDone && (
                <div style={{display:'flex',gap:12,width:'100%',marginTop:8}}>
                  <button className="ob-cta-primary ob-btn0" onClick={handleGoToDashboard}>
                    Enter SocialStream →
                  </button>
                  <button className="ob-cta-secondary ob-btn1" onClick={handleSeeHowItWorks}>
                    See How It Works
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default OnboardingModal;