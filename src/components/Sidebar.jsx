import React, { useState } from 'react';
import { Link2, MapPin, Settings } from 'lucide-react';
import { logout } from '../api.js';
import AuraCard from './AuraCard.jsx';
import EditProfileModal from './EditProfileModal.jsx';

function Sidebar({ user, aura, onProfileUpdated, theme }) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const accent = theme?.accent || '#7c3aed';
  const secondary = theme?.secondary || '#4c1d95';
  const tertiary = theme?.tertiary || '#6d28d9';

  return (
    <>
      <style>{`
        @keyframes badgePop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
        .college-badge{animation:badgePop 400ms cubic-bezier(0.34,1.56,0.64,1) 300ms both}
        .sidebar-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.2s;font-family:inherit}
        .sidebar-btn-outline{background:transparent;border:1px solid rgba(255,255,255,0.08);color:#9ca3af}
        .sidebar-btn-outline:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.15);color:white}
        .sidebar-btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.05);color:#6b7280}
        .sidebar-btn-ghost:hover{background:rgba(255,255,255,0.03);color:#9ca3af}
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

        {/* ── PROFILE CARD ── */}
        <section style={{ borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', background:'#0e1020' }}>

          {/* Banner — uses college accent colors, no more blue */}
          <div style={{
            height:68, position:'relative', overflow:'hidden',
            background:`linear-gradient(135deg,${accent}cc,${secondary}cc,${tertiary}88)`,
          }}>
            {/* Noise texture overlay */}
            <div style={{
              position:'absolute', inset:0,
              backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.08\'/%3E%3C/svg%3E")',
              opacity:0.4,
            }} />
            {/* Shine line */}
            <div style={{
              position:'absolute', top:0, left:0, right:0, height:1,
              background:`linear-gradient(90deg,transparent,${accent}80,transparent)`,
            }} />
          </div>

          <div style={{ padding:'0 16px 20px', display:'flex', flexDirection:'column', alignItems:'center' }}>
            {/* Avatar — overlaps banner */}
            <div style={{ marginTop:-28, marginBottom:12, position:'relative' }}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name}
                  style={{
                    width:56, height:56, borderRadius:'50%', objectFit:'cover',
                    border:'3px solid #0e1020',
                    boxShadow:`0 0 0 2px ${accent}50, 0 0 24px ${accent}30`,
                  }} />
              ) : (
                <div style={{
                  width:56, height:56, borderRadius:'50%',
                  background:`linear-gradient(135deg,${accent},${secondary})`,
                  border:'3px solid #0e1020',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, fontWeight:800, color:'white',
                  boxShadow:`0 0 0 2px ${accent}50, 0 0 24px ${accent}30`,
                }}>
                  {user?.avatarInitial || 'U'}
                </div>
              )}
            </div>

            {/* Name */}
            <h2 style={{ fontSize:15, fontWeight:700, color:'white', textAlign:'center', marginBottom:3 }}>
              {user?.name || 'User'}
            </h2>

            {/* Headline */}
            <p style={{ fontSize:12, color:'#6b7280', textAlign:'center', marginBottom:8, lineHeight:1.4 }}>
              {user?.headline || 'CS Student'}
            </p>

            {/* College badge */}
            {(user?.college || theme?.badge) && (
              <div className="college-badge" style={{
                padding:'4px 12px', borderRadius:99, marginBottom:10,
                background:`${accent}18`, border:`1px solid ${accent}35`,
                fontSize:11, fontWeight:600, color:accent,
              }}>
                🎓 {user?.college || theme.badge}
              </div>
            )}

            {/* Location */}
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#374151', marginBottom:14 }}>
              <MapPin size={12} style={{ color:'#374151' }} />
              <span>Hyderabad, India</span>
            </div>

            {/* Buttons */}
            <div style={{ display:'flex', flexDirection:'column', gap:6, width:'100%' }}>
              <button className="sidebar-btn sidebar-btn-outline">
                <Link2 size={12} /> View public profile
              </button>
              <button className="sidebar-btn sidebar-btn-ghost" onClick={() => setIsEditingProfile(true)}>
                <Settings size={11} /> Edit profile
              </button>
              <button className="sidebar-btn sidebar-btn-ghost" onClick={() => logout()}>Sign out</button>
            </div>
          </div>
        </section>

        {/* ── AURA CARD ── */}
        <AuraCard aura={aura} accentColor={accent} />

        <EditProfileModal
          isOpen={isEditingProfile}
          onClose={() => setIsEditingProfile(false)}
          user={user}
          onProfileUpdated={onProfileUpdated}
        />
      </div>
    </>
  );
}

export default Sidebar;