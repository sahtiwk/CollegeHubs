'use client';

import { useState, useEffect } from 'react';
import { useDashboard } from '../DashboardContext';

export default function LeaderboardPage() {
  const { isLoaded, activeDomain, userId } = useDashboard();
  
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    
    fetch('/api/dashboard/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.leaderboard) {
          // Mark the current user
          const mappedData = data.leaderboard.map((u: any) => ({
            ...u,
            isCurrentUser: u.id === userId
          }));
          setLeaderboardData(mappedData);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isLoaded, userId]);

  if (!isLoaded || isLoading) {
    return <div className="w-full h-[80vh] flex items-center justify-center text-gradient text-xl font-bold">Loading Leaderboard...</div>;
  }

  // Pad the top3 array with nulls if there are fewer than 3 users
  const top3 = [
    leaderboardData[0] || null,
    leaderboardData[1] || null,
    leaderboardData[2] || null,
  ];
  
  const others = leaderboardData.slice(3);

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Diamond': return <span className="material-symbols-outlined text-cyan-400" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>;
      case 'Platinum': return <span className="material-symbols-outlined text-slate-400" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>;
      case 'Gold': return <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>;
      case 'Silver': return <span className="material-symbols-outlined text-gray-400" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>;
      case 'Bronze': return <span className="material-symbols-outlined text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>;
      case 'Spark': return <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>electric_bolt</span>;
      default: return <span className="material-symbols-outlined text-slate-400" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>;
    }
  };

  const getPodiumStyle = (rank: number) => {
    const baseStyle = {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '24px 24px 8px 8px',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '160px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
      transition: 'transform 0.3s ease',
    };

    if (rank === 1) {
      return {
        ...baseStyle,
        height: '240px',
        background: 'linear-gradient(180deg, rgba(255,215,0,0.15) 0%, rgba(255,255,255,0.4) 100%)',
        borderTop: '2px solid rgba(255,215,0,0.6)',
        borderLeft: '1px solid rgba(255,255,255,0.5)',
        borderRight: '1px solid rgba(255,255,255,0.5)',
        zIndex: 10,
      };
    }
    if (rank === 2) {
      return {
        ...baseStyle,
        height: '200px',
        background: 'linear-gradient(180deg, rgba(192,192,192,0.15) 0%, rgba(255,255,255,0.4) 100%)',
        borderTop: '2px solid rgba(192,192,192,0.6)',
        borderLeft: '1px solid rgba(255,255,255,0.5)',
        borderRight: '1px solid rgba(255,255,255,0.5)',
        zIndex: 5,
      };
    }
    return {
      ...baseStyle,
      height: '170px',
      background: 'linear-gradient(180deg, rgba(205,127,50,0.15) 0%, rgba(255,255,255,0.4) 100%)',
      borderTop: '2px solid rgba(205,127,50,0.6)',
      borderLeft: '1px solid rgba(255,255,255,0.5)',
      borderRight: '1px solid rgba(255,255,255,0.5)',
      zIndex: 5,
    };
  };

  return (
    <div className="w-full flex flex-col items-center pt-8 px-6 pb-24">
      {/* Header */}
      <div 
        className="w-full max-w-4xl flex flex-col items-center text-center"
        style={{ marginBottom: '80px' }}
      >
        <h1 className="text-4xl font-black text-gradient tracking-tight mb-3">Global Leaderboard</h1>
        <p className="text-[var(--text-secondary)] font-medium max-w-lg">
          Compete with other learners. Points are awarded for completing nodes, testing out, and maintaining your daily streak.
        </p>
      </div>

      {/* Podium */}
      <div 
        className="flex justify-center items-end gap-4"
        style={{ marginBottom: '64px', marginTop: '40px' }}
      >
        {/* Rank 2 */}
        <div style={getPodiumStyle(2)} className="hover:-translate-y-2 relative group">
          <div className="absolute -top-6 text-3xl font-black text-slate-300 drop-shadow-md">2</div>
          {top3[1] ? (
            <>
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-xl font-bold text-[var(--brand-slate-deep)] mb-3 border-2 border-slate-200">
                {top3[1].name.charAt(0)}
              </div>
              <div className="font-bold text-sm text-[var(--text-primary)] whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{top3[1].name}</div>
              <div className="text-xs font-bold text-slate-500 mt-1">{top3[1].points.toLocaleString()} AP</div>
              <div className="mt-auto flex items-center gap-1 text-[var(--text-tertiary)]">
                <span className="material-symbols-outlined text-[14px] text-orange-400">local_fire_department</span>
                <span className="text-[10px] font-bold">{top3[1].streak}</span>
              </div>
            </>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] opacity-50">
               <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
               <span className="text-xs font-bold">Unclaimed</span>
             </div>
          )}
        </div>

        {/* Rank 1 */}
        <div style={getPodiumStyle(1)} className="hover:-translate-y-2 relative group mx-2">
          <div className="absolute -top-10">
            <span className="material-symbols-outlined text-yellow-400 text-5xl drop-shadow-lg" style={{ fontVariationSettings: "'FILL' 1" }}>kid_star</span>
          </div>
          {top3[0] ? (
            <>
              <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center text-2xl font-black text-[var(--brand-slate-deep)] mb-3 border-4 border-yellow-200 mt-2">
                {top3[0].name.charAt(0)}
              </div>
              <div className="font-black text-base text-[var(--text-primary)] whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{top3[0].name}</div>
              <div className="text-sm font-black text-yellow-600 mt-1">{top3[0].points.toLocaleString()} AP</div>
              <div className="mt-auto flex items-center gap-1 text-[var(--text-tertiary)]">
                <span className="material-symbols-outlined text-[16px] text-orange-500">local_fire_department</span>
                <span className="text-xs font-bold">{top3[0].streak}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] opacity-50 mt-4">
               <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
               <span className="text-xs font-bold">Unclaimed</span>
             </div>
          )}
        </div>

        {/* Rank 3 */}
        <div style={getPodiumStyle(3)} className="hover:-translate-y-2 relative group">
          <div className="absolute -top-6 text-3xl font-black text-amber-700/50 drop-shadow-md">3</div>
          {top3[2] ? (
            <>
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-lg font-bold text-[var(--brand-slate-deep)] mb-3 border-2 border-amber-200/50">
                {top3[2].name.charAt(0)}
              </div>
              <div className="font-bold text-sm text-[var(--text-primary)] whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{top3[2].name}</div>
              <div className="text-xs font-bold text-amber-700/70 mt-1">{top3[2].points.toLocaleString()} AP</div>
              <div className="mt-auto flex items-center gap-1 text-[var(--text-tertiary)]">
                <span className="material-symbols-outlined text-[14px] text-orange-400">local_fire_department</span>
                <span className="text-[10px] font-bold">{top3[2].streak}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] opacity-50">
               <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
               <span className="text-xs font-bold">Unclaimed</span>
             </div>
          )}
        </div>
      </div>

      {/* List View */}
      {others.length > 0 && (
        <div className="w-full max-w-4xl flex flex-col gap-3">
          {others.map((user) => (
            <div 
              key={user.id} 
              className="group flex items-center justify-between p-4 rounded-xl transition-all duration-300"
              style={{
                backgroundColor: user.isCurrentUser ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: user.isCurrentUser ? '1px solid rgba(0, 102, 255, 0.3)' : '1px solid rgba(0,0,0,0.05)',
                boxShadow: user.isCurrentUser ? '0 4px 12px rgba(0, 102, 255, 0.1)' : '0 2px 8px rgba(0,0,0,0.02)',
                transform: 'translateZ(0)',
              }}
            >
              {/* Rank & User Info */}
              <div className="flex items-center gap-6 flex-1">
                <div className="w-8 text-center font-black text-[var(--text-tertiary)] text-lg">
                  {user.rank}
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{
                      background: user.isCurrentUser ? 'var(--brand-blue-navy)' : 'var(--brand-slate-deep)',
                    }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold ${user.isCurrentUser ? 'text-blue-700' : 'text-[var(--text-primary)]'}`}>
                      {user.name} {user.isCurrentUser && <span className="ml-2 text-[10px] uppercase tracking-widest text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">You</span>}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mt-0.5">
                      <span className="flex items-center gap-0.5">{getTierIcon(user.tier)} {user.tier}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 justify-end">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Streak</span>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-orange-500">local_fire_department</span>
                    <span className="font-bold text-sm text-[var(--text-primary)]">{user.streak}</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-black/10 hidden sm:block"></div>
                <div className="flex flex-col items-end min-w-[80px]">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Score</span>
                  <span className={`font-black text-lg ${user.isCurrentUser ? 'text-blue-600' : 'text-[var(--brand-slate-deep)]'}`}>
                    {user.points.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {leaderboardData.length === 0 && (
        <div className="text-slate-500 font-medium">No users on the leaderboard yet. Be the first!</div>
      )}
    </div>
  );
}
