import { db } from '@/db';
import { learner } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function LeaderboardPage() {
  // Fetch top 50 learners by Aura Points
  const topLearners = await db
    .select()
    .from(learner)
    .orderBy(desc(learner.auraPoints))
    .limit(50);

  // In a real app, we'd highlight the actual logged in user
  const currentUserId = 'test_user_123';

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: '#FCFCFD',
      fontFamily: 'Inter, sans-serif',
      padding: '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: 720 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
          <div>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, fontWeight: 600, color: '#6B7280', 
              textDecoration: 'none', marginBottom: 16,
              transition: 'color 0.2s'
            }} className="hover-darken">
              ← Back to Graph
            </Link>
            <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Global Leaderboard
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 16, color: '#6B7280' }}>
              Top learners ranked by Aura Points.
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #0F172A, #1E3A8A)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 16,
            boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.4)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24 }}>🏆</div>
          </div>
        </div>

        {/* List */}
        <div style={{
          background: '#fff',
          borderRadius: 24,
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          {topLearners.map((l, idx) => {
            const isCurrentUser = l.id === currentUserId;
            
            let rankBadge;
            if (idx === 0) rankBadge = <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FEF08A', color: '#CA8A04', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>1</div>;
            else if (idx === 1) rankBadge = <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5E7EB', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>2</div>;
            else if (idx === 2) rankBadge = <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FED7AA', color: '#C2410C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>3</div>;
            else rankBadge = <div style={{ width: 32, textAlign: 'center', fontWeight: 700, color: '#9CA3AF', fontSize: 15 }}>{idx + 1}</div>;

            return (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', padding: '16px 24px',
                borderBottom: idx === topLearners.length - 1 ? 'none' : '1px solid #F3F4F6',
                background: isCurrentUser ? '#EFF6FF' : 'transparent',
                transition: 'background 0.2s',
              }} className={!isCurrentUser ? 'hover-bg' : ''}>
                
                {/* Rank */}
                <div style={{ marginRight: 24 }}>
                  {rankBadge}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: isCurrentUser ? 700 : 600, color: isCurrentUser ? '#1E3A8A' : '#111827' }}>
                    {isCurrentUser ? 'You' : `Learner ${l.id.substring(0, 6)}`}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                    {l.auraTier} Tier • {l.streakDays}🔥
                  </p>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
                    {l.auraPoints}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Aura
                  </p>
                </div>

              </div>
            );
          })}

          {topLearners.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>
              No learners found yet.
            </div>
          )}
        </div>

      </div>

      <style>{`
        .hover-darken:hover { color: #111827 !important; }
        .hover-bg:hover { background: #F9FAFB !important; }
      `}</style>
    </main>
  );
}
