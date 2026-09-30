"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NodePopoverProps {
  node: {
    id: string;
    label: string;
    domain: string;
    difficulty: number;
    status: string;
    testOutEligible: boolean;
    testOutAttempted: boolean;
    linkedContentIds: string[];
  };
  screenX: number;
  screenY: number;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  locked:       { label: 'Locked',      color: '#9CA3AF', bg: '#F3F4F6' },
  unlocked:     { label: 'Unlocked',    color: '#1E3A8A', bg: '#EFF6FF' },
  'in-progress':  { label: 'In Progress', color: '#EA580C', bg: '#FFF7ED' },
  completed:    { label: 'Completed',   color: '#16A34A', bg: '#F0FDF4' },
  'test-out':   { label: 'Test-Out',    color: '#CA8A04', bg: '#FEFCE8' },
};

const domainColors: Record<string, string> = {
  backend:      '#6366F1',
  frontend:     '#EC4899',
  data_science: '#14B8A6',
  dsa:          '#F97316',
  devops:       '#8B5CF6',
};

function DifficultyDots({ value }: { value: number }) {
  // difficulty is 0-10, show 5 dots
  const filled = Math.round((value / 10) * 5);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i < filled ? '#1E3A8A' : '#E5E7EB',
          transition: 'background 0.2s'
        }} />
      ))}
    </div>
  );
}

export default function NodePopover({ node, screenX, screenY, onClose }: NodePopoverProps) {
  const router = useRouter();
  const status = statusConfig[node.status] || statusConfig.locked;
  const domainColor = domainColors[node.domain] || '#6366F1';

  // --- Recommendation state ---
  const [recommendation, setRecommendation] = useState<{ title: string; url: string; reasoning: string } | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState('');

  // Fetch recommendation when popover opens for non-locked nodes with linked content
  useEffect(() => {
    if (node.status === 'locked' || node.linkedContentIds.length === 0) return;

    setRecLoading(true);
    setRecError('');
    fetch('/api/recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: node.id }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.recommendedItem) {
          setRecommendation({
            title: data.recommendedItem.title,
            url: data.recommendedItem.url,
            reasoning: data.reasoning,
          });
        }
      })
      .catch(() => setRecError('Could not load recommendation'))
      .finally(() => setRecLoading(false));
  }, [node.id, node.status, node.linkedContentIds.length]);

  // Keep card inside viewport
  const CARD_W = 320;
  const CARD_H = 420;
  const OFFSET = 16;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = screenX + OFFSET;
  let top  = screenY - CARD_H / 2;

  if (left + CARD_W > vw - 16) left = screenX - CARD_W - OFFSET;
  if (top < 16) top = 16;
  if (top + CARD_H > vh - 16) top = vh - CARD_H - 16;

  return (
    <>
      {/* Backdrop: completely transparent, clicking outside dismisses */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'transparent', cursor: 'default'
        }}
      />

      {/* Floating card with clean glass transparency */}
      <div
        style={{
          position: 'fixed',
          left, top,
          width: CARD_W,
          zIndex: 100,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.12) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          borderRadius: 20,
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.15), inset 0 1px 2px 0 rgba(255, 255, 255, 1)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          animation: 'popoverIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: 2,
          }}
        >×</button>

        {/* Domain tag + label */}
        <div>
          <span style={{
            display: 'inline-block', marginBottom: 6,
            padding: '2px 10px', borderRadius: 999,
            background: `${domainColor}18`, color: domainColor,
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            {node.domain.replace('_', ' ')}
          </span>
          <h3 style={{
            margin: 0, fontSize: 15, fontWeight: 700,
            color: '#111827', lineHeight: 1.3
          }}>
            {node.label}
          </h3>
        </div>

        {/* Status + difficulty */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            padding: '3px 10px', borderRadius: 999,
            background: status.bg, color: status.color,
            fontSize: 12, fontWeight: 600
          }}>
            {status.label}
          </span>
          <DifficultyDots value={node.difficulty} />
        </div>

        {/* Resources count */}
        {node.linkedContentIds.length > 0 && (
          <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
            📚 {node.linkedContentIds.length} learning resource{node.linkedContentIds.length !== 1 ? 's' : ''} linked
          </p>
        )}

        {/* ── Recommendation Panel ────────────────────────────────── */}
        {node.status !== 'locked' && node.linkedContentIds.length > 0 && (
          <div style={{
            background: 'rgba(239, 246, 255, 0.6)',
            border: '1px solid rgba(30, 58, 138, 0.12)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#1E3A8A',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              📖 Recommended Resource
            </span>

            {recLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 14, height: 14, border: '2px solid #1E3A8A', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                <span style={{ fontSize: 12, color: '#6B7280' }}>Finding the best resource...</span>
              </div>
            )}

            {!recLoading && recommendation && (
              <>
                <a
                  href={recommendation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 13, fontWeight: 600, color: '#1E3A8A',
                    textDecoration: 'none', lineHeight: 1.4
                  }}
                >
                  {recommendation.title} ↗
                </a>
                <p style={{
                  margin: 0, fontSize: 11, color: '#6B7280',
                  lineHeight: 1.5, fontStyle: 'italic'
                }}>
                  💡 {recommendation.reasoning}
                </p>
              </>
            )}

            {!recLoading && recError && (
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{recError}</span>
            )}

            {!recLoading && !recommendation && !recError && (
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>No recommendation available.</span>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {node.status === 'locked' && (
            <p style={{
              margin: 0, fontSize: 12, color: '#9CA3AF',
              textAlign: 'center', padding: '8px 0'
            }}>
              🔒 Complete prerequisites first
            </p>
          )}

          {node.status === 'unlocked' && (
            <button
              className="pill pill-primary"
              style={{ width: '100%', textAlign: 'center' }}
              onClick={() => router.push(`/module/${node.id}`)}
            >
              Start Module →
            </button>
          )}

          {node.status === 'in-progress' && (
            <button
              className="pill pill-primary"
              style={{ width: '100%', textAlign: 'center' }}
              onClick={() => router.push(`/module/${node.id}`)}
            >
              Continue →
            </button>
          )}

          {node.status === 'completed' && recommendation && (
            <a
              href={recommendation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="pill pill-ghost"
              style={{ width: '100%', textAlign: 'center', textDecoration: 'none' }}
            >
              ✓ Review Resource
            </a>
          )}

          {node.status === 'completed' && !recommendation && (
            <button
              className="pill pill-ghost"
              style={{ width: '100%', textAlign: 'center' }}
              onClick={onClose}
            >
              ✓ Completed
            </button>
          )}

          {node.testOutEligible && !node.testOutAttempted && node.status !== 'completed' && (
            <button
              style={{
                width: '100%', padding: '8px 0', borderRadius: 999,
                border: '1.5px solid #CA8A04',
                background: '#FEFCE8', color: '#CA8A04',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                letterSpacing: '0.01em'
              }}
              onClick={() => router.push(`/quiz?nodeId=${node.id}&mode=test_out`)}
            >
              ⚡ Challenge This Node
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes popoverIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
