import React from 'react';
import { Flame, Medal, Target, RotateCcw } from 'lucide-react';

function AuraCard({ aura, accentColor }) {
  const level = aura?.level || 1;
  const progress = aura?.progress || 0;
  const totalAura = aura?.totalAura || 0;
  const rankTitle = aura?.rankTitle || 'Novice';
  const globalRank = aura?.globalRank || 0;
  const streak = aura?.streak || 0;
  const accent = accentColor || '#7c3aed';

  const stats = [
    { id: 'rank', label: 'Global Rank', value: globalRank > 0 ? `#${globalRank.toLocaleString()}` : 'Unranked', icon: Medal },
    { id: 'streak', label: 'Daily Streak', value: `🔥 ${streak}`, icon: Flame },
    { id: 'quest', label: "Today's Quest", value: 'Review 3 PRs', icon: Target },
  ];

  return (
    <>
      <style>{`
        @keyframes auraGlow {
          0%,100% { opacity:0.6; }
          50% { opacity:1; }
        }
        @keyframes progressShine {
          0% { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        .aura-progress-fill {
          background: linear-gradient(90deg, ${accent}, #06b6d4, #f59e0b, ${accent});
          background-size: 200% auto;
          animation: progressShine 2s linear infinite;
        }
        .aura-orb {
          animation: auraGlow 3s ease-in-out infinite;
        }
        .aura-stat-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:9px 12px; border-radius:12px;
          border:1px solid rgba(255,255,255,0.06);
          background:rgba(0,0,0,0.3);
          cursor:pointer;
          transition:background 0.2s, border-color 0.2s;
        }
        .aura-stat-row:hover {
          background:rgba(255,255,255,0.04);
          border-color:rgba(255,255,255,0.12);
        }
      `}</style>

      <section style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 18,
        border: `1px solid ${accent}22`,
        background: 'linear-gradient(145deg,#13131e,#0e0e18)',
        padding: '20px',
        boxShadow: `0 0 40px ${accent}18`,
      }}>
        {/* Background orb */}
        <div className="aura-orb" style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180,
          background: `radial-gradient(circle,${accent}30,transparent 70%)`,
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20,
          width: 120, height: 120,
          background: 'radial-gradient(circle,rgba(245,158,11,0.15),transparent 70%)',
          filter: 'blur(25px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 4 }}>
                AURA CORE
              </p>
              <p style={{ fontSize: 12, color: '#6b7280' }}>Your developer reputation</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                disabled
                title="External stats refresh is unavailable"
                aria-label="External stats refresh is unavailable"
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid rgba(245,158,11,0.3)',
                  background: 'rgba(245,158,11,0.08)',
                  color: '#fbbf24', cursor: 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                  opacity: 0.5,
                }}
              >
                <RotateCcw size={13} style={{ animation: 'none' }} />
              </button>
              <div style={{
                padding: '4px 10px', borderRadius: 8,
                border: `1px solid ${accent}40`,
                background: `${accent}12`,
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: accent,
              }}>
                LV{level} {rankTitle}
              </div>
            </div>
          </div>

          {/* Aura count */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Total Aura</p>
            <p style={{
              fontSize: 36, fontWeight: 900, lineHeight: 1,
              background: 'linear-gradient(135deg,#fbbf24,#f59e0b,#a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.4))',
            }}>
              {totalAura.toLocaleString()}
            </p>
            <p style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>+142 today</p>
          </div>

          {/* Boost card */}
          <div style={{
            padding: '10px 14px', borderRadius: 12,
            border: '1px solid rgba(124,58,237,0.2)',
            background: 'rgba(124,58,237,0.08)',
            marginBottom: 16,
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 3 }}>AURA BOOST</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Complete 1 quest to multiply XP</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.id} className="aura-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fbbf24',
                    }}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0' }}>{stat.label}</p>
                      <p style={{ fontSize: 10, color: '#4b5563' }}>View details</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 11, color: '#6b7280' }}>Next Level</p>
              <p style={{ fontSize: 11, color: '#fbbf24' }}>{progress}% to Level {level + 1}</p>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div className="aura-progress-fill" style={{ height: '100%', borderRadius: 99, width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default AuraCard;