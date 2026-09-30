import { db } from '@/db';
import { learner, learnerNodeState, skillNode } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeletePathButton from '@/components/DeletePathButton';

export default async function ProfilePage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  // Fetch learner data
  const [learnerData] = await db.select().from(learner).where(eq(learner.id, userId));
  
  if (!learnerData) {
    redirect('/onboarding');
  }

  // Fetch completed nodes
  const completedNodes = await db
    .select({
      nodeId: skillNode.id,
      label: skillNode.label,
      domain: skillNode.domain,
      difficulty: skillNode.difficulty,
    })
    .from(learnerNodeState)
    .innerJoin(skillNode, eq(learnerNodeState.nodeId, skillNode.id))
    .where(and(eq(learnerNodeState.learnerId, userId), eq(learnerNodeState.status, 'completed')));

  const skillVector = (learnerData.skillVector as Record<string, number>) || {};

  return (
    <main style={{ 
      minHeight: '100vh',
      backgroundColor: 'var(--bg-page)',
      padding: 'var(--space-12) var(--space-8)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>My Profile</h1>
        </div>

        {/* 1. Identity & Aura Banner */}
        <div className="glass-card" style={{ 
          padding: 32, borderRadius: 24, display: 'flex', alignItems: 'center', gap: 24,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(240, 249, 255, 0.6))',
          boxShadow: '0 8px 32px rgba(30, 58, 138, 0.05)'
        }}>
          <img src={user.imageUrl} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.firstName || 'Learner'}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{user.emailAddresses[0]?.emailAddress}</p>
          </div>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '12px 24px', background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-gold)' }}>{learnerData.auraTier}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, marginTop: 4 }}>Tier</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 24px', background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-blue-ocean)' }}>{learnerData.auraPoints}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, marginTop: 4 }}>Aura</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 24px', background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-success)' }}>{learnerData.streakDays} <span style={{ fontSize: '1rem' }}>🔥</span></div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, marginTop: 4 }}>Streak</div>
            </div>
          </div>
        </div>

        {/* 2. Objective Matrix */}
        <div className="glass-card" style={{ padding: 32, borderRadius: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--brand-blue-ocean)' }}>target</span>
              Current Objective
            </h3>
            <Link href="/onboarding" className="pill pill-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
              Recalibrate Goal
            </Link>
          </div>
          
          <div style={{ padding: 20, background: 'rgba(30, 58, 138, 0.05)', borderRadius: 16, border: '1px solid rgba(30, 58, 138, 0.1)' }}>
            <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--brand-blue-navy)' }}>
              "{learnerData.careerGoal || 'No goal set. Please recalibrate.'}"
            </p>
          </div>
        </div>

        {/* 3. Skill Proficiency Radar */}
        <div className="glass-card" style={{ padding: 32, borderRadius: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--brand-slate-deep)' }}>radar</span>
            Skill Vector
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.keys(skillVector).length === 0 ? (
               <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 16 }}>No skills mapped yet.</div>
            ) : (
              Object.entries(skillVector).map(([domain, score]) => (
                <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 140, fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>
                    {domain.replace('_', ' ').replace('-', ' ').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, height: 12, background: 'rgba(0,0,0,0.05)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', top: 0, left: 0, bottom: 0, 
                      width: `${(Math.min(score, 5.0) / 5.0) * 100}%`, 
                      background: 'linear-gradient(90deg, var(--brand-blue-ocean), var(--brand-blue-navy))',
                      borderRadius: 6
                    }} />
                  </div>
                  <div style={{ width: 40, textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {score.toFixed(1)}
                  </div>
                  <DeletePathButton domain={domain} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Mastery Log */}
        <div className="glass-card" style={{ padding: 32, borderRadius: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--status-success)' }}>workspace_premium</span>
            Mastery Log
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {completedNodes.length === 0 ? (
               <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 16 }}>No nodes mastered yet. Time to start learning!</div>
            ) : (
              completedNodes.map((node) => (
                <div key={node.nodeId} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, background: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                      {node.domain.replace('_', ' ').replace('-', ' ')}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{node.label}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="status-badge test-out" style={{ fontSize: 11, padding: '4px 8px', marginBottom: 4 }}>Mastered</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      Diff {node.difficulty.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
