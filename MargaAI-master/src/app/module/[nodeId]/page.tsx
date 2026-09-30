import { db } from '@/db';
import { skillNode, contentItem, learnerNodeState } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ModulePage({ params }: { params: Promise<{ nodeId: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { nodeId } = await params;

  // Fetch node
  const [node] = await db.select().from(skillNode).where(eq(skillNode.id, nodeId));
  if (!node) redirect('/dashboard');

  // Fetch linked contents
  let contents: any[] = [];
  let currentLinkedIds = node.linkedContentIds || [];

  if (currentLinkedIds.length === 0) {
    // JIT Fetching for empty nodes
    const { RoadmapAdapter } = await import('@/services/roadmapAdapter');
    const newIds = await RoadmapAdapter.fetchResourcesForNode(node.label, node.domain);
    
    if (newIds.length > 0) {
      await db.update(skillNode)
        .set({ linkedContentIds: newIds })
        .where(eq(skillNode.id, nodeId));
      currentLinkedIds = newIds;
    }
  }

  if (currentLinkedIds.length > 0) {
     const { inArray } = await import('drizzle-orm');
     contents = await db.select().from(contentItem).where(inArray(contentItem.id, currentLinkedIds));
  }

  // Fetch learner state
  const [state] = await db.select().from(learnerNodeState).where(
    and(eq(learnerNodeState.learnerId, userId), eq(learnerNodeState.nodeId, nodeId))
  );

  const isCompleted = state?.status === 'completed';

  return (
    <main style={{ 
      minHeight: '100vh',
      backgroundColor: 'var(--bg-page)',
      padding: 'var(--space-12) var(--space-8)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Back to Dashboard
        </Link>

        <div>
          <span style={{ 
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            background: 'rgba(30, 58, 138, 0.1)', color: '#1E3A8A', padding: '4px 10px', borderRadius: 999
          }}>
            {node.domain.replace('_', ' ')}
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '16px 0 8px' }}>
            {node.label}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6 }}>
            {node.category || 'Core Skill'} • Difficulty {Math.round(node.difficulty * 10) / 10} / 10
          </p>
        </div>

        {/* Resources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Learning Resources</h2>
          {contents.length === 0 ? (
            <div style={{ padding: 24, background: 'rgba(0,0,0,0.02)', borderRadius: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              No resources linked for this node yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {contents.map((c) => (
                <a 
                  key={c.id} 
                  href={c.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="glass-card hover:-translate-y-1"
                  style={{ 
                    display: 'flex', flexDirection: 'column', gap: 8, padding: 20, 
                    borderRadius: 16, textDecoration: 'none', transition: 'all 0.2s',
                    border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--brand-blue-navy)' }}>{c.title} ↗</h3>
                  {c.description && <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.description}</p>}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quiz CTA */}
        <div style={{ 
          marginTop: 'var(--space-8)', padding: 32, borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.95))',
          color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'white' }}>Ready to prove your knowledge?</h3>
            <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: 14, color: 'white' }}>
              {isCompleted ? 'You have already completed this node, but you can practice again.' : 'Take the adaptive assessment to complete this node and earn Aura points.'}
            </p>
          </div>
          
          <Link href={`/quiz?nodeId=${node.id}`} className="pill pill-primary" style={{ padding: '16px 40px', fontSize: 16 }}>
            {isCompleted ? 'Practice Again →' : 'Start Assessment →'}
          </Link>
        </div>

      </div>
    </main>
  );
}
