import { UserProfile } from '@clerk/nextjs';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-4xl mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[var(--brand-slate-deep)] tracking-tight">Settings</h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage your account and security preferences.</p>
        </div>
        <Link 
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-black/10 text-sm font-bold text-[var(--text-secondary)] hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          Back to Dashboard
        </Link>
      </div>

      <div className="w-full max-w-4xl flex justify-center">
        {/* We use a wrapper to override Clerk's default shadows and add our own border-radius */}
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.1)' }}>
          <UserProfile 
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-none rounded-none m-0",
                navbar: "hidden md:flex", // Keep sidebar on desktop
                headerTitle: "font-black tracking-tight",
                headerSubtitle: "text-slate-500",
                profileSectionTitleText: "font-bold tracking-tight text-slate-800",
                badge: "bg-[var(--brand-blue-sky)] text-white",
                primaryButton: "bg-[var(--brand-blue-navy)] hover:bg-[var(--brand-slate-deep)] text-white shadow-md",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
