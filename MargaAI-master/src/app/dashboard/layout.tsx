'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { DashboardContext } from './DashboardContext';

// --- LAYOUT ---
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth();
  
  const [domains, setDomains] = useState<string[]>([]);
  const [activeDomain, setActiveDomain] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    fetch('/api/dashboard/domains')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.domains.length > 0) {
          setDomains(data.domains);
          setActiveDomain(data.domains[0]);
        } else {
          router.push('/onboarding');
        }
      })
      .catch(console.error);
  }, [isLoaded, userId, router]);

  return (
    <DashboardContext.Provider value={{ domains, activeDomain, setActiveDomain, isSidebarOpen, setIsSidebarOpen, isLoaded, userId, selectedNodeId, setSelectedNodeId }}>
      <div 
        className="w-full min-h-screen font-sans flex text-[var(--text-primary)]" 
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        {/* Sidebar */}
        <nav 
          className={`fixed left-0 top-0 h-screen border-r border-black/10 flex flex-col z-40 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'} overflow-hidden rounded-none`}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: isSidebarOpen ? '28px 18px' : '24px 0',
            alignItems: isSidebarOpen ? 'stretch' : 'center',
            boxSizing: 'border-box'
          }}
        >
          {/* Header Branding */}
          <div 
            className="flex items-center"
            style={{
              width: '100%',
              justifyContent: isSidebarOpen ? 'space-between' : 'center',
              marginBottom: isSidebarOpen ? '28px' : '32px',
              padding: isSidebarOpen ? '0 4px' : '0'
            }}
          >
            {isSidebarOpen && (
              <Link href="/" className="whitespace-nowrap overflow-hidden transition-opacity duration-300 cursor-pointer block hover:opacity-80">
                <h1 className="text-2xl font-black text-gradient tracking-tight leading-tight">MargaAI</h1>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1 uppercase font-bold tracking-widest leading-none">Precision Learning</p>
              </Link>
            )}
            <button 
              className="text-[var(--text-secondary)] hover:bg-black/5 rounded-xl transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              style={{ width: '40px', height: '40px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
            </button>
          </div>

          {/* Domain Selector inside Sidebar */}
          {isSidebarOpen && (
            <div 
              className="w-full transition-opacity duration-300"
              style={{ marginBottom: '24px' }}
            >
              <div 
                className="flex flex-col gap-1.5 items-start bg-slate-50/80 border border-black/10 rounded-xl"
                style={{ padding: '10px 14px' }}
              >
                <span className="text-[10px] tracking-widest text-[var(--text-tertiary)] uppercase font-bold">Path</span>
                <select 
                  className="text-sm font-bold text-[var(--brand-slate-deep)] bg-transparent border-none outline-none cursor-pointer w-full"
                  value={activeDomain}
                  onChange={(e) => setActiveDomain(e.target.value)}
                >
                  {domains.map(d => (
                    <option key={d} value={d} className="text-black">{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div 
            className="flex flex-col gap-2.5 flex-1"
            style={{
              width: '100%',
              alignItems: isSidebarOpen ? 'stretch' : 'center'
            }}
          >
            {/* View Toggles */}
            <Link href="/dashboard"
              title="Skill Graph"
              className="font-bold transition-all cursor-pointer flex items-center rounded-xl hover:opacity-90"
              style={{
                backgroundColor: pathname === '/dashboard' ? 'var(--brand-slate-deep)' : 'transparent',
                color: pathname === '/dashboard' ? '#ffffff' : 'var(--text-secondary)',
                width: isSidebarOpen ? '100%' : '40px',
                height: '42px',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                padding: isSidebarOpen ? '0 14px' : '0',
                gap: isSidebarOpen ? '12px' : '0'
              }}
            >
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontVariationSettings: pathname === '/dashboard' ? "'FILL' 1" : "'FILL' 0", fontSize: '20px' }}>bubble_chart</span>
              {isSidebarOpen && <span className="text-sm">Skill Graph</span>}
            </Link>

            <Link href="/dashboard/leaderboard"
              title="Leaderboards"
              className="font-bold transition-all cursor-pointer flex items-center rounded-xl hover:bg-black/5"
              style={{
                backgroundColor: pathname === '/dashboard/leaderboard' ? 'var(--brand-slate-deep)' : 'transparent',
                color: pathname === '/dashboard/leaderboard' ? '#ffffff' : 'var(--text-secondary)',
                width: isSidebarOpen ? '100%' : '40px',
                height: '42px',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                padding: isSidebarOpen ? '0 14px' : '0',
                gap: isSidebarOpen ? '12px' : '0'
              }}
            >
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontVariationSettings: pathname === '/dashboard/leaderboard' ? "'FILL' 1" : "'FILL' 0", fontSize: '20px' }}>leaderboard</span>
              {isSidebarOpen && <span className="text-sm">Leaderboards</span>}
            </Link>
          </div>

          <div 
            className="flex flex-col gap-2.5 mt-auto"
            style={{
              width: '100%',
              alignItems: isSidebarOpen ? 'stretch' : 'center'
            }}
          >
            <Link href="/profile"
              title="Profile"
              className="font-bold transition-all cursor-pointer flex items-center rounded-xl hover:bg-black/5"
              style={{
                backgroundColor: pathname === '/profile' ? 'var(--brand-slate-deep)' : 'transparent',
                color: pathname === '/profile' ? '#ffffff' : 'var(--text-secondary)',
                width: isSidebarOpen ? '100%' : '40px',
                height: '42px',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                padding: isSidebarOpen ? '0 14px' : '0',
                gap: isSidebarOpen ? '12px' : '0'
              }}
            >
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontVariationSettings: pathname === '/profile' ? "'FILL' 1" : "'FILL' 0", fontSize: '20px' }}>account_circle</span>
              {isSidebarOpen && <span className="text-sm">Profile</span>}
            </Link>
            <Link href="/settings"
              title="Settings"
              className="font-bold transition-all cursor-pointer flex items-center rounded-xl hover:bg-black/5"
              style={{
                backgroundColor: pathname === '/settings' ? 'var(--brand-slate-deep)' : 'transparent',
                color: pathname === '/settings' ? '#ffffff' : 'var(--text-secondary)',
                width: isSidebarOpen ? '100%' : '40px',
                height: '42px',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                padding: isSidebarOpen ? '0 14px' : '0',
                gap: isSidebarOpen ? '12px' : '0'
              }}
            >
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontVariationSettings: pathname === '/settings' ? "'FILL' 1" : "'FILL' 0", fontSize: '20px' }}>settings</span>
              {isSidebarOpen && <span className="text-sm">Settings</span>}
            </Link>
          </div>
        </nav>

        {/* Main Content Area */}
        <main 
          className={`w-full min-h-screen flex flex-col items-center pb-32 transition-all duration-300`}
          style={{ paddingLeft: isSidebarOpen ? '16rem' : '4rem' }}
        >
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  );
}
