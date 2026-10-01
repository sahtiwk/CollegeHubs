"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function OnboardingPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [seedTopics, setSeedTopics] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [ratings, setRatings] = useState<Record<string, string>>({});

  const handleCustomSubmit = async () => {
    if (!customGoal.trim()) return;
    setIsLoadingProfile(true);
    try {
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: customGoal })
      });
      if (res.ok) {
        const data = await res.json();
        setDomain(data.domain);
        setSeedTopics(data.seedTopics);
        setStep(2);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleRating = (topic: string, rating: string) => {
    setRatings(prev => ({ ...prev, [topic]: rating }));
  };

  const handleSubmit = async () => {
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    setStep(3);
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain, 
          ratings,
          careerGoal: customGoal
        })
      });

      if (res.ok) {
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        console.error('Failed onboarding');
        setStep(2);
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      setStep(2);
      setIsSubmitting(false);
    }
  };

  const allRated = seedTopics.every(t => ratings[t]);

  return (
    <main style={{ 
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 'var(--space-6)',
      background: 'radial-gradient(circle at top right, #EFF6FF 0%, #FCFCFD 100%)'
    }}>
      
      {step === 1 && (
        <div className="glass-card animate-fade-in-up" style={{ maxWidth: '640px', width: '100%', textAlign: 'center', padding: '48px 40px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }} className="text-gradient">What do you want to master?</h1>
          <p style={{ marginBottom: 'var(--space-8)', color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Select a trajectory to begin building your personalized curriculum.</p>
          
          <div style={{ width: '100%', position: 'relative' }}>
            <input 
              type="text" 
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="e.g. 'I want to be a Rust Backend Developer'" 
              style={{
                 width: '100%', padding: '16px 24px', fontSize: '1.125rem', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', background: 'rgba(255,255,255,0.8)'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            />
            <button 
              onClick={handleCustomSubmit}
              disabled={!customGoal.trim() || isLoadingProfile}
              className="pill pill-primary"
              style={{ position: 'absolute', right: 8, top: 8, bottom: 8, padding: '0 24px' }}
            >
              {isLoadingProfile ? 'Analyzing...' : 'Go'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card animate-fade-in-up" style={{ maxWidth: '720px', width: '100%', padding: '48px 40px' }}>
          <h2 style={{ fontSize: '2.25rem', marginBottom: 'var(--space-2)', textAlign: 'center' }} className="text-gradient">How well do you know these?</h2>
          <p style={{ textAlign: 'center', marginBottom: 'var(--space-8)', color: 'var(--text-secondary)' }}>Be honest. This helps us recalibrate your starting difficulty.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', marginBottom: 'var(--space-12)' }}>
            {seedTopics.map(topic => (
              <div key={topic} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'rgba(248,250,252,0.5)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.02)' }}>
                <span style={{ fontWeight: 600, color: 'var(--brand-slate-deep)', fontSize: '1.125rem' }}>{topic}</span>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => handleRating(topic, 'Newbie')}
                    className={`pill ${ratings[topic] === 'Newbie' ? 'pill-primary' : 'pill-ghost'}`}
                    style={{ flex: 1, padding: '12px 0' }}
                  >
                    Newbie
                  </button>
                  <button 
                    onClick={() => handleRating(topic, 'Familiar')}
                    className={`pill ${ratings[topic] === 'Familiar' ? 'pill-primary' : 'pill-ghost'}`}
                    style={{ flex: 1, padding: '12px 0' }}
                  >
                    Familiar
                  </button>
                  <button 
                    onClick={() => handleRating(topic, 'Expert')}
                    className={`pill ${ratings[topic] === 'Expert' ? 'pill-primary' : 'pill-ghost'}`}
                    style={{ flex: 1, padding: '12px 0' }}
                  >
                    Expert
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setStep(1)} className="pill pill-ghost" style={{ padding: '12px 24px' }}>← Back</button>
            <button 
              onClick={handleSubmit} 
              disabled={!allRated || isSubmitting}
              className="pill pill-primary animate-pulse-glow" 
              style={{ padding: '14px 32px', fontSize: '1.125rem' }}>
              {isSubmitting ? 'Constructing...' : 'Construct Path →'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="glass-card animate-fade-in-up" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '64px 40px' }}>
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <span className="status-badge test-out animate-pulse-glow" style={{ fontSize: '1.125rem', padding: 'var(--space-3) var(--space-6)' }}>⚡ Recalibrating Matrix...</span>
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--brand-slate-deep)' }}>Building your personalized curriculum</h2>
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Crunching your seed ratings into the graph engine.</p>
        </div>
      )}
    </main>
  );
}
