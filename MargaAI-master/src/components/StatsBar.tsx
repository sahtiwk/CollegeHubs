"use client";

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

interface StatsBarProps {
  auraPoints: number;
  auraTier: string;
  streakDays: number;
  completedNodes: number;
}

export default function StatsBar({ auraPoints, auraTier, streakDays, completedNodes }: StatsBarProps) {
  const router = useRouter();

  // Tier color mapping
  const tierColor = useMemo(() => {
    switch (auraTier.toLowerCase()) {
      case 'spark': return '#9CA3AF'; // Gray
      case 'ember': return '#F59E0B'; // Orange
      case 'flame': return '#EF4444'; // Red
      case 'blaze': return '#8B5CF6'; // Purple
      case 'aurora': return '#14B8A6'; // Teal
      default: return '#1E3A8A'; // Navy
    }
  }, [auraTier]);

  return (
    <div style={{
      position: 'absolute',
      top: 80,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      zIndex: 50,
      pointerEvents: 'none'
    }}>
      <div className="animate-fade-in-up" style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07), 0 0 0 1px rgba(255,255,255,0.6) inset',
        padding: '12px 24px',
        borderRadius: 999,
        fontFamily: 'Inter, sans-serif',
        color: '#111827',
        transition: 'all 0.3s ease',
      }}>
      
      {/* Aura Points */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16, borderRight: '1.5px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Aura</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1E3A8A', lineHeight: 1 }}>{auraPoints}</span>
        </div>
      </div>

      {/* Tier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16, borderRight: '1.5px solid rgba(0,0,0,0.06)' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: tierColor, boxShadow: `0 0 10px ${tierColor}` }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Tier</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{auraTier}</span>
        </div>
      </div>

      {/* Streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16, borderRight: '1.5px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 18, filter: streakDays > 0 ? 'none' : 'grayscale(100%) opacity(40%)' }}>🔥</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Streak</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{streakDays} <span style={{fontSize: 12, opacity: 0.6, fontWeight: 500}}>days</span></span>
        </div>
      </div>

      {/* Leaderboard Button */}
      <button 
        onClick={() => router.push('/leaderboard')}
        className="leaderboard-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #0F172A, #1E3A8A)',
          color: 'white',
          border: 'none',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: 16 }}>🏆</span>
        Leaderboard
      </button>

      {/* Delete Roadmap Button */}
      <button 
        onClick={async () => {
          if (confirm('Are you sure you want to delete your entire learning roadmap? This cannot be undone.')) {
            const res = await fetch('/api/roadmap/delete', { method: 'POST' });
            if (res.ok) {
              router.push('/onboarding');
              router.refresh();
            }
          }
        }}
        className="reset-btn"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36,
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '50%',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginLeft: 8
        }}
        title="Reset Progress"
      >
        <span style={{ fontSize: 16 }}>🗑️</span>
      </button>

      <style>{`
        .leaderboard-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(30, 58, 138, 0.4);
        }
        .leaderboard-btn:active {
          transform: translateY(0px);
        }
        .reset-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          transform: translateY(-2px);
        }
        .reset-btn:active {
          transform: translateY(0px);
        }
      `}</style>
      </div>
    </div>
  );
}
