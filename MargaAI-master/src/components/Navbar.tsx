import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function Navbar() {
  const authObj = await auth();
  const userId = authObj.userId;

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      zIndex: 50,
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Link href="/" style={{
        display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none'
      }}>
        <div style={{
          background: 'var(--brand-slate-deep)', color: 'white',
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: 16
        }}>M</div>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-slate-deep)' }}>
          MargaAI
        </span>
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {!userId ? (
          <SignInButton mode="modal">
            <button className="pill pill-primary">Sign In</button>
          </SignInButton>
        ) : (
          <>
            <Link href="/dashboard" className="pill pill-ghost" style={{ marginRight: '8px' }}>Dashboard</Link>
            <UserButton appearance={{ elements: { avatarBox: { width: 36, height: 36 } } }} />
          </>
        )}
      </div>
    </header>
  );
}
