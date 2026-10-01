import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Aura Engine',
    color: '#f59e0b',
    description:
      'Every LeetCode problem you solve, every Codeforces contest you enter, every GitHub commit you push — all of it translates into Aura Points. Your progress, finally visible.',
  },
  {
    icon: '🏆',
    title: 'Leaderboards',
    color: '#7c3aed',
    description:
      'Compete globally or filter by your own college. See where you rank among peers, track daily gains, and climb the board one problem at a time.',
  },
  {
    icon: '📅',
    title: 'Contest Calendar',
    color: '#06b6d4',
    description:
      'Never miss a contest again. SocialStream pulls upcoming events from LeetCode, Codeforces, and CodeChef — and lets you add them directly to your Google Calendar in one click.',
  },
  {
    icon: '🎓',
    title: 'College Identity',
    color: '#10b981',
    description:
      'Your dashboard adapts to your college — unique colors, local leaderboards, and a sense of community with peers from your own campus.',
  },
  {
    icon: '📡',
    title: 'Live Feed',
    color: '#f43f5e',
    description:
      'Share what you\'re building, celebrate a rating jump, or post your contest experience. The SocialStream feed is built for developers who want to document their journey publicly.',
  },
  {
    icon: '🔗',
    title: 'Public Profile',
    color: '#8b5cf6',
    description:
      'Every dev gets a shareable profile page — one link that shows your Aura level, coding handles, stats, and rank. Your dev resume, reimagined.',
  },
];

const TEAM = [
  {
    name: 'Shaik Safiullah Sahil Hussain',
    role: 'Full Stack Developer & System Architect',
    college: 'CVR College of Engineering',
    bio: 'Builder at heart, competitive programmer by habit. Designed the Aura Engine from scratch and architected the full-stack infrastructure powering SocialStream.',
    github: 'https://github.com/sahilistrying',
    linkedin: 'https://www.linkedin.com/in/safiullahsahil',
    photo: 'https://i.imgur.com/AKEjoAB.jpeg',
    accentColor: '#7c3aed',
  },
  {
    name: 'Anugu Samhith Reddy',
    role: 'Frontend Engineer & UI/UX Lead',
    college: 'CVR College of Engineering',
    bio: 'Obsessed with pixel-perfect interfaces and smooth interactions. Crafted the visual language of SocialStream — every animation, every gradient, every detail.',
    github: 'https://github.com/SamhithReddy14',
    linkedin: 'linkedin.com/in/samhith-reddy-404422326',
    photo: 'https://i.imgur.com/cx00wBL.jpeg', // swap with real URL tomorrow
    accentColor: '#06b6d4',
  },
];

function AboutPage() {
  const navigate = useNavigate();
  const featureRefs = useRef([]);
  const teamRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.12 }
    );
    [...featureRefs.current, ...teamRefs.current].forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @keyframes aboutHeroIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aboutOrbFloat {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.04); }
        }
        @keyframes aboutShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes aboutLineGrow {
          from { width: 0; }
          to { width: 80px; }
        }
        .about-hero { animation: aboutHeroIn 700ms cubic-bezier(0.34,1.2,0.64,1) forwards; }
        .about-orb-a { animation: aboutOrbFloat 9s ease-in-out infinite; }
        .about-orb-b { animation: aboutOrbFloat 12s ease-in-out infinite reverse; }
        .about-orb-c { animation: aboutOrbFloat 7s ease-in-out infinite 2s; }
        .about-gradient-text {
          background: linear-gradient(135deg, #a78bfa, #06b6d4, #f59e0b);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: aboutShimmer 4s linear infinite;
        }
        .about-feature-card {
          opacity: 0; transform: translateY(32px);
          transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.34,1.2,0.64,1);
          background: #111118;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 28px;
          cursor: default;
        }
        .about-feature-card:hover {
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.4);
        }
        .about-team-card {
          opacity: 0; transform: translateY(36px);
          transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.2,0.64,1);
          background: #111118;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 22px; overflow: hidden;
        }
        .about-team-card:hover {
          border-color: rgba(255,255,255,0.13);
          box-shadow: 0 20px 60px rgba(0,0,0,0.45);
        }
        .about-social-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: #9ca3af;
          font-size: 13px; font-weight: 500;
          text-decoration: none;
          transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s;
        }
        .about-social-btn:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.22);
          color: white; transform: scale(1.04);
        }
        .about-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px; border-radius: 14px;
          background: linear-gradient(135deg, #7c3aed, #06b6d4);
          color: white; font-size: 15px; font-weight: 700;
          border: none; cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
          text-decoration: none;
        }
        .about-cta-btn:hover {
          transform: scale(1.04);
          box-shadow: 0 0 32px rgba(124,58,237,0.45);
        }
        .about-divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
        }
        .about-section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.3em;
          text-transform: uppercase; color: #f59e0b;
          text-shadow: 0 0 16px rgba(245,158,11,0.35);
        }
        .about-avatar-ring {
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.12);
          box-shadow: 0 0 0 4px rgba(124,58,237,0.15), 0 0 32px rgba(124,58,237,0.2);
        }
        .about-placeholder-avatar {
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 48px; font-weight: 900; color: white;
          border: 2px solid rgba(255,255,255,0.1);
        }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#0a0a0f',
        color: 'white', fontFamily: 'system-ui,-apple-system,sans-serif',
        position: 'relative', overflowX: 'hidden',
      }}>

        {/* Background orbs */}
        <div className="about-orb-a" style={{position:'fixed',top:'5%',left:'5%',width:500,height:500,background:'radial-gradient(circle,rgba(124,58,237,0.12),transparent 70%)',filter:'blur(60px)',pointerEvents:'none',zIndex:0}}/>
        <div className="about-orb-b" style={{position:'fixed',top:'40%',right:'5%',width:400,height:400,background:'radial-gradient(circle,rgba(6,182,212,0.10),transparent 70%)',filter:'blur(60px)',pointerEvents:'none',zIndex:0}}/>
        <div className="about-orb-c" style={{position:'fixed',bottom:'10%',left:'30%',width:300,height:300,background:'radial-gradient(circle,rgba(245,158,11,0.07),transparent 70%)',filter:'blur(50px)',pointerEvents:'none',zIndex:0}}/>

        {/* Top gradient line */}
        <div style={{height:2,background:'linear-gradient(90deg,#7c3aed,#06b6d4,#f59e0b)',position:'relative',zIndex:1}}/>

        <div style={{position:'relative',zIndex:1,maxWidth:1080,margin:'0 auto',padding:'0 24px'}}>

          {/* ── HERO ── */}
          <section className="about-hero" style={{textAlign:'center',padding:'96px 0 72px'}}>
            <p className="about-section-label" style={{marginBottom:20}}>✦ SOCIALSTREAM</p>
            <h1 style={{fontSize:'clamp(40px, 6vw, 72px)',fontWeight:900,lineHeight:1.08,marginBottom:24}}>
              The Platform Built for<br/>
              <span className="about-gradient-text">Developers Who Compete</span>
            </h1>
            <p style={{fontSize:18,color:'#9ca3af',maxWidth:580,margin:'0 auto 40px',lineHeight:1.7}}>
              SocialStream is a dev-centric social network powered by the Aura Engine —
              turning your coding activity into a visible, gamified reputation system.
            </p>
            <button className="about-cta-btn" onClick={() => navigate('/')}>
              Back to SocialStream →
            </button>
          </section>

          <div className="about-divider-line" style={{marginBottom:80}}/>

          {/* ── FEATURES ── */}
          <section style={{marginBottom:100}}>
            <p className="about-section-label" style={{textAlign:'center',marginBottom:16}}>✦ WHAT WE BUILT</p>
            <h2 style={{fontSize:36,fontWeight:800,textAlign:'center',marginBottom:56}}>
              Everything in one place
            </h2>
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',
              gap:20,
            }}>
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="about-feature-card"
                  ref={(el) => (featureRefs.current[i] = el)}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div style={{
                    width:48,height:48,borderRadius:14,
                    background:`${f.color}18`,
                    border:`1px solid ${f.color}30`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:22,marginBottom:16,
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{fontSize:17,fontWeight:700,color:'white',marginBottom:10}}>
                    {f.title}
                  </h3>
                  <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7}}>
                    {f.description}
                  </p>
                  <div style={{
                    marginTop:20,height:2,borderRadius:99,
                    background:`linear-gradient(90deg,${f.color},transparent)`,
                    width:48,
                  }}/>
                </div>
              ))}
            </div>
          </section>

          <div className="about-divider-line" style={{marginBottom:80}}/>

          {/* ── HOW IT WORKS ── */}
          <section style={{marginBottom:100}}>
            <p className="about-section-label" style={{textAlign:'center',marginBottom:16}}>✦ THE AURA ENGINE</p>
            <h2 style={{fontSize:36,fontWeight:800,textAlign:'center',marginBottom:56}}>
              How Aura Points work
            </h2>
            <div style={{display:'flex',flexDirection:'column',gap:0,maxWidth:640,margin:'0 auto'}}>
              {[
                {step:'01',title:'Connect your handles',desc:'Add your LeetCode, Codeforces, and GitHub usernames during onboarding.'},
                {step:'02',title:'We track your activity',desc:'Our engine scrapes your public stats — problems solved, contest ratings, commit streaks.'},
                {step:'03',title:'Aura is calculated',desc:'Each activity maps to Aura Points. More consistent activity = higher Aura = higher level.'},
                {step:'04',title:'Climb the leaderboard',desc:'Compete globally or within your college. Every point you earn is reflected in real time.'},
              ].map((s, i) => (
                <div key={s.step} style={{display:'flex',gap:24,padding:'28px 0',borderBottom:i<3?'1px solid rgba(255,255,255,0.06)':'none'}}>
                  <div style={{
                    fontSize:13,fontWeight:800,color:'#7c3aed',
                    letterSpacing:'0.1em',minWidth:32,paddingTop:2,
                  }}>{s.step}</div>
                  <div>
                    <h4 style={{fontSize:16,fontWeight:700,color:'white',marginBottom:6}}>{s.title}</h4>
                    <p style={{fontSize:14,color:'#6b7280',lineHeight:1.65}}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="about-divider-line" style={{marginBottom:80}}/>

          {/* ── TEAM ── */}
          <section style={{marginBottom:100}}>
            <p className="about-section-label" style={{textAlign:'center',marginBottom:16}}>✦ THE BUILDERS</p>
            <h2 style={{fontSize:36,fontWeight:800,textAlign:'center',marginBottom:12}}>
              Who made this
            </h2>
            <p style={{fontSize:15,color:'#6b7280',textAlign:'center',marginBottom:56}}>
              Two devs from CVR College of Engineering, Hyderabad.
            </p>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:24}}>
              {TEAM.map((member, i) => (
                <div
                  key={member.name}
                  className="about-team-card"
                  ref={(el) => (teamRefs.current[i] = el)}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  {/* Card top accent bar */}
                  <div style={{height:3,background:`linear-gradient(90deg,${member.accentColor},transparent)`}}/>

                  <div style={{padding:'32px 28px'}}>
                    {/* Avatar */}
                    <div style={{marginBottom:20}}>
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="about-avatar-ring"
                          style={{
                            width:80,height:80,objectFit:'cover',
                            boxShadow:`0 0 0 4px ${member.accentColor}25, 0 0 32px ${member.accentColor}30`,
                          }}
                        />
                      ) : (
                        <div
                          className="about-placeholder-avatar"
                          style={{
                            width:80,height:80,
                            background:`linear-gradient(135deg,${member.accentColor}44,#111118)`,
                            boxShadow:`0 0 0 4px ${member.accentColor}25`,
                            fontSize:32,
                          }}
                        >
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <h3 style={{fontSize:18,fontWeight:800,color:'white',marginBottom:4,lineHeight:1.3}}>
                      {member.name}
                    </h3>
                    <p style={{fontSize:13,fontWeight:600,color:member.accentColor,marginBottom:4}}>
                      {member.role}
                    </p>
                    <p style={{fontSize:12,color:'#4b5563',marginBottom:14}}>
                      🎓 {member.college}
                    </p>
                    <p style={{fontSize:14,color:'#9ca3af',lineHeight:1.7,marginBottom:24}}>
                      {member.bio}
                    </p>

                    {/* Social links */}
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      <a href={member.github} target="_blank" rel="noopener noreferrer" className="about-social-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                      <a href={member.linkedin.startsWith('http') ? member.linkedin : `https://${member.linkedin}`} target="_blank" rel="noopener noreferrer" className="about-social-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── BOTTOM CTA ── */}
          <section style={{textAlign:'center',padding:'0 0 100px'}}>
            <div style={{
              background:'#111118',
              border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:24,padding:'60px 40px',
              position:'relative',overflow:'hidden',
            }}>
              {/* Inner glow */}
              <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:400,height:200,background:'radial-gradient(ellipse,rgba(124,58,237,0.12),transparent 70%)',pointerEvents:'none'}}/>
              <p className="about-section-label" style={{marginBottom:16}}>✦ READY?</p>
              <h2 style={{fontSize:32,fontWeight:800,marginBottom:12}}>
                Start building your Aura today.
              </h2>
              <p style={{fontSize:15,color:'#6b7280',marginBottom:32,maxWidth:420,margin:'0 auto 32px'}}>
                Join the community of developers tracking their growth, competing on leaderboards, and leveling up together.
              </p>
              <button className="about-cta-btn" onClick={() => navigate('/')}>
                Enter SocialStream →
              </button>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'24px',textAlign:'center'}}>
          <p style={{fontSize:13,color:'#374151'}}>
            Built with ✦ at CVR College of Engineering, Hyderabad · SocialStream © 2026
          </p>
        </div>

      </div>
    </>
  );
}

export default AboutPage;