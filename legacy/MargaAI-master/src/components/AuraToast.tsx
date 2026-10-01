"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function AuraToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [show, setShow] = useState(false);
  const [aura, setAura] = useState(0);
  const [mode, setMode] = useState('');

  useEffect(() => {
    const awarded = searchParams.get('awardedAura');
    const awardedMode = searchParams.get('awardedMode');

    if (awarded) {
      setAura(parseInt(awarded, 10));
      setMode(awardedMode || 'checkpoint');
      setShow(true);

      // Clean the URL so it doesn't show again on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        setShow(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!show) return null;

  const isTestOut = mode === 'test_out';

  return (
    <div style={{
      position: 'absolute',
      bottom: 40,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: isTestOut 
        ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.9), rgba(202, 138, 4, 0.9))' 
        : 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 58, 138, 0.9))',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid ${isTestOut ? 'rgba(253, 224, 71, 0.3)' : 'rgba(96, 165, 250, 0.3)'}`,
      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
      padding: '16px 28px',
      borderRadius: 999,
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      animation: 'slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards, fadeOut 0.5s ease 3.5s forwards',
    }}>
      
      <div style={{
        width: 40, height: 40, borderRadius: '50%', 
        background: 'rgba(255,255,255,0.1)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22
      }}>
        ⚡
      </div>

      <div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          {isTestOut ? 'Challenge Passed!' : 'Checkpoint Cleared!'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800 }}>
          +{aura} Aura Earned
        </p>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translate(-50%, 0); }
          to { opacity: 0; transform: translate(-50%, 10px); }
        }
      `}</style>
    </div>
  );
}
