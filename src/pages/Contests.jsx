import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';

function Contests() {
  return (
    <main style={{ minHeight: '100vh', background: '#F4ECD6', color: '#310A31', padding: '32px 20px', fontFamily: 'Archivo, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#310A31', marginBottom: 48 }}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to Feed
        </Link>
        <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>CollegeHubs</p>
        <h1 style={{ fontFamily: 'Abril Fatface, Georgia, serif', fontSize: 'clamp(32px, 6vw, 48px)', marginBottom: 24 }}>Coding Contests</h1>
        <section aria-labelledby="contest-status" style={{ border: '1px solid #310A31', borderRadius: 20, padding: '32px 24px', background: '#FFD3B6' }}>
          <span style={{ display: 'inline-flex', padding: 12, borderRadius: 12, background: '#DFF7FF', marginBottom: 20 }}>
            <Calendar size={28} aria-hidden="true" />
          </span>
          <h2 id="contest-status" style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Contest schedules are unavailable</h2>
          <p style={{ lineHeight: 1.7 }}>Upcoming contests will appear here when schedule updates are available. Calendar export is also unavailable.</p>
        </section>
      </div>
    </main>
  );
}

export default Contests;
