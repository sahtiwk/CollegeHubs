import React from 'react';
import { Link } from 'react-router-dom';
import { Award, CalendarClock, ChevronRight, Trophy } from 'lucide-react';

const leaderboard = [
  { id: 1, name: 'Safiullah', handle: '@safiullah', aura: 4203, streak: 12, rankDelta: '+2 today' },
  { id: 2, name: 'Samhith', handle: '@samhith', aura: 3870, streak: 9, rankDelta: '+1 today' },
  { id: 3, name: 'BalaKrishna', handle: '@Balakrik', aura: 6969, streak: 69, rankDelta: '—' },
];

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];

function RightSidebar({ theme }) {
  const accent = theme?.accent || '#7c3aed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Leaderboard */}
      <section style={{
        borderRadius: 18, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#111118',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trophy size={14} color="#000" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Community Leaderboard</p>
              <p style={{ fontSize: 11, color: '#4b5563' }}>Top CVR students by Aura</p>
            </div>
          </div>
          <Link to="/leaderboard" style={{ fontSize: 11, color: accent, textDecoration: 'none', fontWeight: 500 }}>
            View full
          </Link>
        </div>

        <div>
          {leaderboard.map((user, i) => (
            <div key={user.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderLeft: `3px solid ${RANK_COLORS[i]}`,
              transition: 'background 0.15s',
              cursor: 'pointer',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: '#1a1a2a',
                  border: `2px solid ${RANK_COLORS[i]}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'white',
                }}>
                  {user.name[0]}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{user.name}</span>
                    {i === 0 && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }}>👑 #1</span>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: '#4b5563' }}>
                    {user.handle} • Streak: <span style={{ color: '#f59e0b' }}>{user.streak}d</span>
                    {user.rankDelta !== '—' && <span style={{ color: '#10b981' }}> • {user.rankDelta}</span>}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                {user.aura.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contests */}
      <section style={{
        borderRadius: 18, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#111118',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarClock size={14} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Upcoming Contests</p>
              <p style={{ fontSize: 11, color: '#4b5563' }}>Schedule updates unavailable</p>
            </div>
          </div>
          <Link to="/contests" style={{ fontSize: 11, color: accent, textDecoration: 'none', fontWeight: 500 }}>
            View all
          </Link>
        </div>

        <div>
          <p style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>Contest schedules and rewards are unavailable.</p>
        </div>
      </section>
    </div>
  );
}

export default RightSidebar;