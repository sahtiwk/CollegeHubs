import Link from 'next/link';
import SkillGraph from '@/components/SkillGraph';
import Navbar from '@/components/Navbar';
import { SignInButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';

export default async function LandingPage() {
  const authObj = await auth();
  const userId = authObj.userId;
  
  return (
    <>
      <Navbar />
      <main style={{ 
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-page)'
      }}>
      {/* Ambient graph — full visibility */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.85 }}>
        <SkillGraph ambient={true} />
      </div>
      
      {/* Center-left positioned text content */}
      <div className="animate-fade-in-up" style={{ 
        position: 'absolute', 
        top: '42%',
        transform: 'translateY(-50%)',
        left: '80px', 
        zIndex: 10, 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--brand-slate-deep), var(--brand-blue-navy))',
            padding: '4px 16px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.4)'
          }}>
            <h1 style={{ color: '#FFFFFF', fontSize: '3.5rem', margin: 0, lineHeight: 1.1 }}>
              Welcome to MargaAI
            </h1>
          </div>
          
          <p style={{ fontSize: '1.25rem', color: 'var(--brand-slate-deep)', margin: 0, marginLeft: '16px', fontWeight: 500 }}>
            The adaptive, explainable learning engine powered by AI.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          {!userId ? (
            <SignInButton mode="modal">
              <button className="pill pill-primary" style={{ padding: '16px 32px', fontSize: '1.125rem', boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.3)' }}>
                Start Learning
              </button>
            </SignInButton>
          ) : (
            <>
              <Link href="/onboarding" className="pill pill-primary" style={{ padding: '16px 32px', fontSize: '1.125rem', boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.3)' }}>
                Create a New Path
              </Link>
              <Link href="/dashboard" className="pill pill-outline" style={{ padding: '16px 32px', fontSize: '1.125rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}>
                Continue Learning
              </Link>
            </>
          )}
        </div>
      </div>

      <footer style={{ position: 'absolute', bottom: '40px', right: '40px', zIndex: 10, animation: 'fadeInUp 1s ease 0.5s both' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span className="status-badge unlocked" style={{ padding: '6px 16px', fontSize: '0.85rem', background: 'rgba(239, 246, 255, 0.9)' }}>Next-Gen</span>
          <span className="status-badge test-out animate-pulse-glow" style={{ padding: '6px 16px', fontSize: '0.85rem', background: 'rgba(254, 252, 232, 0.9)' }}>Adaptive</span>
        </div>
      </footer>
    </main>
    </>
  );
}
