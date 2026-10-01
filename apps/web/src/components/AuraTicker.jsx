import React, { useMemo } from 'react';

const BASE_MESSAGES = [
  { text: 'safiullah solved Two Sum on LeetCode', suffix: '+12 Aura', color: '#7c3aed' },
  { text: 'Samhith reached Level 10 — Elite rank unlocked', suffix: null, color: '#f59e0b' },
  { text: 'CVR College is #1 on today\'s leaderboard', suffix: null, color: '#06b6d4' },
  { text: '3 devs just registered for Codeforces Round #980', suffix: null, color: '#7c3aed' },
  { text: 'BalaKrishna hit a 69-day streak — absolute beast', suffix: null, color: '#f59e0b' },
  { text: '12 new devs joined SocialStream in the last hour', suffix: null, color: '#10b981' },
  { text: 'April Fools Day Contest starts in 2 hours', suffix: 'are you ready?', color: '#f43f5e' },
  { text: 'Sahil pushed 8 commits to GitHub', suffix: '+24 Aura', color: '#06b6d4' },
  { text: 'NIT Warangal climbing fast on the global board', suffix: null, color: '#7c3aed' },
];

function AuraTicker({ accentColor }) {
  const color = accentColor || '#7c3aed';
  const doubled = [...BASE_MESSAGES, ...BASE_MESSAGES];

  return (
    <>
      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: tickerScroll 40s linear infinite;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>
      <div style={{
        height: 36,
        background: '#0d0d14',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}>
        {/* Left fade */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 60,
          background: 'linear-gradient(90deg,#0d0d14,transparent)',
          zIndex: 2, pointerEvents: 'none',
        }} />
        {/* Right fade */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 60,
          background: 'linear-gradient(270deg,#0d0d14,transparent)',
          zIndex: 2, pointerEvents: 'none',
        }} />

        <div className="ticker-track">
          {doubled.map((msg, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 28px', fontSize: 12, whiteSpace: 'nowrap',
              color: '#4b5563',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: msg.color, flexShrink: 0,
                boxShadow: `0 0 6px ${msg.color}`,
              }} />
              <span style={{ color: '#6b7280' }}>⚡</span>
              <span style={{ color: '#6b7280' }}>{msg.text}</span>
              {msg.suffix && (
                <span style={{ color: msg.color, fontWeight: 600 }}>{msg.suffix}</span>
              )}
              <span style={{ color: '#2d2d3a', marginLeft: 8 }}>◆</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

export default AuraTicker;