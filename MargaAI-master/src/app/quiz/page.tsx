"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
type QuizMode = 'checkpoint' | 'test_out';
type UIState = 'loading' | 'question' | 'feedback' | 'results' | 'error';

interface QuizItem {
  id: string;
  question: string;
  answerType: 'mcq' | 'short_answer';
  options?: string[];
  correctOption?: string;
  explanation?: string;
  pointValue: number;
  irtDifficultyB: number;
}

interface FeedbackData {
  correct: boolean;
  explanation: string;
  pointsEarned: number;
}

interface ResultsData {
  passed: boolean;
  earnedPoints: number;
  totalPoints: number;
  awardedAura: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────
// Authentication is handled via cookies/Clerk server-side.

// ─── Subcomponents ─────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div style={{ width: '100%', height: 4, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: 'linear-gradient(90deg, #0F172A, #1E3A8A)',
        borderRadius: 999, transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

function McqOptions({
  options, selected, submitted, correct, onSelect
}: {
  options: string[];
  selected: number | null;
  submitted: boolean;
  correct: boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {options.map((opt, i) => {
        let bg = 'rgba(255,255,255,0.7)';
        let border = '1.5px solid #E5E7EB';
        let color = '#111827';
        if (submitted && selected === i) {
          if (correct) { bg = '#F0FDF4'; border = '1.5px solid #16A34A'; color = '#15803D'; }
          else         { bg = '#FFF1F2'; border = '1.5px solid #F43F5E'; color = '#BE123C'; }
        } else if (!submitted && selected === i) {
          bg = '#EFF6FF'; border = '1.5px solid #1E3A8A'; color = '#1E3A8A';
        }
        return (
          <button key={i} disabled={submitted} onClick={() => onSelect(i)} style={{
            padding: '14px 18px', borderRadius: 12, border,
            background: bg, color, textAlign: 'left',
            fontSize: 15, fontWeight: selected === i ? 600 : 400,
            cursor: submitted ? 'default' : 'pointer', transition: 'all 0.15s',
            boxShadow: selected === i && !submitted ? '0 0 0 3px rgba(30,58,138,0.1)' : 'none',
          }}>
            <span style={{ marginRight: 10, opacity: 0.5, fontFamily: 'monospace' }}>
              {String.fromCharCode(65 + i)}.
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

import { Suspense } from 'react';

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function QuizPage() {
  return (
    <Suspense fallback={<div>Loading quiz...</div>}>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeId = searchParams.get('nodeId') || '';
  const mode = (searchParams.get('mode') as QuizMode) || 'checkpoint';
  const isTestOut = mode === 'test_out';
  const maxQuestions = isTestOut ? 10 : 5;

  // ── Visual state (for rendering) ─────────────────────────────────────────
  const [uiState, setUiState] = useState<UIState>('loading');
  const [currentItem, setCurrentItem] = useState<QuizItem | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Track previous result to send to backend on next fetch
  const previousResultRef = useRef<{ quizItemId: string, actualScore: number, newTheta: number } | undefined>(undefined);
  // Track current theta locally to compute next theta
  const currentThetaRef = useRef<number>(0);

  // ── Refs (synchronous, always-fresh, bypass stale closure problem) ────────
  const isSubmittingRef = useRef(false); // synchronous double-submit guard
  const requestIdRef    = useRef(0);     // stale-response guard
  const earnedPtsRef    = useRef(0);     // accumulated points (always fresh in async callbacks)
  const totalPtsRef     = useRef(0);     // total possible points

  // ── Fetch next question ───────────────────────────────────────────────────
  const fetchNext = useCallback(async (isFinalCall: boolean = false) => {
    const myRequestId = ++requestIdRef.current;

    // Reset per-question state
    setUiState('loading');
    setSelectedOption(null);
    setShortAnswer('');
    setFeedback(null);
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    try {
      const res = await fetch('/api/quiz/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nodeId, 
          mode,
          previousResult: previousResultRef.current,
          isFinal: isFinalCall
        }),
      });
      const data = await res.json();
      
      // Clear previous result after it is sent
      previousResultRef.current = undefined;

      // Discard stale response (StrictMode double-invoke / rapid clicks)
      if (myRequestId !== requestIdRef.current) return;

      if (!data.success || !data.item || data.isFinal) {
        if (res.status === 404 || res.status === 200) {
          // 200/404 = legitimate "no more items" (or API returns 200 with success: false) → finalize
          const finalRes = await fetch('/api/quiz/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId,
              earnedPoints: earnedPtsRef.current,
              totalPoints:  totalPtsRef.current,
              mode,
            }),
          });
          const finalData = await finalRes.json();
          setResults({
            passed:      finalData.passed,
            earnedPoints: earnedPtsRef.current,
            totalPoints:  totalPtsRef.current,
            awardedAura:  finalData.awardedAura || 0,
          });
          setUiState('results');
          return;
        } else {
           throw new Error(data.message || `Failed to fetch question: ${res.status}`);
        }
      }

      const rawOptions = data.item.options;
      const item: QuizItem = {
        id: data.item.id,
        question: data.item.prompt,
        answerType: data.item.answerType,
        options: Array.isArray(rawOptions) && rawOptions.length > 0 ? rawOptions : undefined,
        correctOption: data.item.correctOption,
        explanation: data.item.explanation,
        pointValue: data.item.pointValue ?? 10,
        irtDifficultyB: data.item.irtDifficultyB ?? 0,
      };

      currentThetaRef.current = data.currentTheta;
      totalPtsRef.current += item.pointValue;
      setCurrentItem(item);
      setUiState('question');
    } catch (e: any) {
      setErrorMsg(e.message);
      setUiState('error');
    }
  }, [nodeId, mode]);

  // ── Grade answer (Client-Side) ───────────────────────────────────────────
  const submitAnswer = () => {
    if (!currentItem) return;
    if (isSubmittingRef.current) return; // synchronous check — blocks same-tick rapid clicks
    if (currentItem.answerType === 'mcq' && selectedOption === null) return;
    if (currentItem.answerType === 'short_answer' && !shortAnswer.trim()) return;

    // Lock immediately
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const studentAnswer = currentItem.answerType === 'mcq'
      ? currentItem.options![selectedOption!]
      : shortAnswer.trim();

    // Grade instantly locally
    let actualScore = 0;
    let feedbackText = '';

    if (currentItem.answerType === 'mcq') {
      const correctOpt = currentItem.correctOption || '';
      if (studentAnswer.trim().toLowerCase() === correctOpt.trim().toLowerCase()) {
        actualScore = 1;
        feedbackText = currentItem.explanation ? `Correct! ${currentItem.explanation}` : 'Correct!';
      } else {
        feedbackText = currentItem.explanation ? `Incorrect. The correct answer was: ${correctOpt}. ${currentItem.explanation}` : `Incorrect. The correct answer was: ${correctOpt}`;
      }
    } else {
      actualScore = 1; 
      feedbackText = 'Auto-graded (Legacy Question Type)';
    }

    // Rasch IRT Theta Update
    const currentTheta = currentThetaRef.current;
    const learningRate = 0.5;
    const expectedScore = 1 / (1 + Math.exp(-(currentTheta - currentItem.irtDifficultyB)));
    let newTheta = currentTheta + learningRate * (actualScore - expectedScore);
    newTheta = Math.max(1.0, Math.min(5.0, newTheta)); // Clamp theta

    const pts = actualScore === 1 ? (currentItem.pointValue || 10) : 0;
    earnedPtsRef.current += pts;
    
    // Set previousResultRef for the next request
    previousResultRef.current = {
      quizItemId: currentItem.id,
      actualScore,
      newTheta
    };

    setFeedback({
      correct: actualScore === 1,
      explanation: feedbackText,
      pointsEarned: pts,
    });
    setUiState('feedback');
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  };

  // ── Continue after feedback ───────────────────────────────────────────────
  const handleContinue = () => {
    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    fetchNext(nextIndex >= maxQuestions);
  };

  useEffect(() => {
    if (nodeId) fetchNext(false);
  }, [nodeId, fetchNext]);

  // ─── Accent colors based on mode ─────────────────────────────────────────
  const accentColor = isTestOut ? '#CA8A04' : '#1E3A8A';
  const accentBg    = isTestOut ? '#FEFCE8' : '#EFF6FF';
  const headerBg    = isTestOut
    ? 'linear-gradient(135deg, #78350F, #CA8A04)'
    : 'linear-gradient(135deg, #0F172A, #1E3A8A)';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main style={{
      minHeight: '100vh', background: '#FCFCFD',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 24px', fontFamily: 'Inter, sans-serif',
    }}>

      {/* Header */}
      <div style={{
        width: '100%', maxWidth: 680, borderRadius: 16,
        background: headerBg, padding: '20px 28px', marginBottom: 32,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E2E8F0' }}>
            {isTestOut ? '⚡ Challenge Mode' : 'Checkpoint'}
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#FFFFFF' }}>
            {nodeId.replace(/_/g, ' ')}
          </h1>
        </div>
        {uiState === 'question' && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>Question</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{questionIndex + 1}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {questionIndex > 0 && uiState !== 'results' && (
        <div style={{ width: '100%', maxWidth: 680, marginBottom: 24 }}>
          <ProgressBar current={questionIndex} total={maxQuestions} />
        </div>
      )}

      {/* ── LOADING ── */}
      {uiState === 'loading' && (
        <div style={{ width: '100%', maxWidth: 680 }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ height: 20, background: '#E5E7EB', borderRadius: 8, marginBottom: 16, width: '60%', animation: 'pulse 1.5s ease infinite' }} />
            <div style={{ height: 14, background: '#F3F4F6', borderRadius: 8, marginBottom: 10 }} />
            <div style={{ height: 14, background: '#F3F4F6', borderRadius: 8, marginBottom: 10, width: '80%' }} />
            <div style={{ height: 14, background: '#F3F4F6', borderRadius: 8, width: '50%' }} />
          </div>
          <p style={{ textAlign: 'center', marginTop: 16, color: '#9CA3AF', fontSize: 13 }}>
            {questionIndex === 0 ? 'Generating your quiz questions...' : 'Loading next question...'}
          </p>
        </div>
      )}

      {/* ── QUESTION ── */}
      {uiState === 'question' && currentItem && (
        <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Point value badge */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{
              padding: '4px 14px', borderRadius: 999,
              background: accentBg, color: accentColor, fontSize: 13, fontWeight: 600,
            }}>
              {currentItem.pointValue} pts
            </span>
          </div>

          {/* Question card */}
          <div className="glass-card" style={{ padding: '28px 32px' }}>
            <p style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600, color: '#111827', lineHeight: 1.5 }}>
              {currentItem.question}
            </p>

            {currentItem.answerType === 'mcq' && currentItem.options && currentItem.options.length > 0 ? (
              <McqOptions
                options={currentItem.options}
                selected={selectedOption}
                submitted={false}
                correct={false}
                onSelect={setSelectedOption}
              />
            ) : (
              <div style={{ padding: '24px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#991B1B' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Error: Invalid Question Format</p>
                <p style={{ margin: '4px 0 0', fontSize: 14 }}>This question is missing its multiple choice options. Please skip it.</p>
              </div>
            )}
          </div>

          {/* Submit button */}
          {(!currentItem.options || currentItem.options.length === 0) ? (
            <button
              onClick={() => {
                // Skip logic: just fetch next without updating theta
                const nextIndex = questionIndex + 1;
                setQuestionIndex(nextIndex);
                fetchNext(nextIndex >= maxQuestions);
              }}
              style={{
                padding: '14px 32px', borderRadius: 999,
                background: '#EF4444', color: '#fff', border: 'none', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', alignSelf: 'flex-end',
                transition: 'background 0.2s, transform 0.1s',
              }}
            >
              Skip Question →
            </button>
          ) : (
            <button
              onClick={submitAnswer}
              disabled={isSubmitting || selectedOption === null}
              style={{
                padding: '14px 32px', borderRadius: 999,
                background: isSubmitting ? '#94A3B8' : headerBg,
                color: '#fff', border: 'none', fontSize: 15, fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer', alignSelf: 'flex-end',
                transition: 'background 0.2s, transform 0.1s',
              }}
            >
              {isSubmitting ? 'Grading...' : 'Submit Answer →'}
            </button>
          )}
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {uiState === 'feedback' && feedback && currentItem && (
        <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            padding: '20px 28px', borderRadius: 16,
            background: feedback.correct ? '#F0FDF4' : '#FFF1F2',
            border: `1.5px solid ${feedback.correct ? '#86EFAC' : '#FDA4AF'}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 36 }}>{feedback.correct ? '✓' : '✗'}</span>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: feedback.correct ? '#15803D' : '#BE123C' }}>
                {feedback.correct ? `Correct! +${feedback.pointsEarned} pts` : 'Incorrect'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                {feedback.explanation}
              </p>
            </div>
          </div>

          {currentItem.answerType === 'mcq' && currentItem.options && currentItem.options.length > 0 && (
            <div className="glass-card" style={{ padding: '20px 28px' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your answer</p>
              <McqOptions
                options={currentItem.options}
                selected={selectedOption}
                submitted={true}
                correct={feedback.correct}
                onSelect={() => {}}
              />
            </div>
          )}

          <button onClick={handleContinue} style={{
            padding: '14px 32px', borderRadius: 999,
            background: headerBg, color: '#fff',
            border: 'none', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', alignSelf: 'flex-end',
          }}>
            Next Question →
          </button>
        </div>
      )}

      {/* ── RESULTS ── */}
      {uiState === 'results' && results && (
        <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '48px 40px', textAlign: 'center', width: '100%' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
              background: results.passed ? '#F0FDF4' : '#FFF1F2',
              border: `3px solid ${results.passed ? '#16A34A' : '#F43F5E'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
            }}>
              {results.passed ? '🎉' : '😔'}
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: results.passed ? '#15803D' : '#BE123C' }}>
              {results.passed ? 'Passed!' : 'Not quite yet'}
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: 16, color: '#6B7280' }}>
              You scored {results.earnedPoints.toFixed(0)} / {results.totalPoints.toFixed(0)} points.
            </p>

            {results.passed && results.awardedAura > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '12px 24px', borderRadius: 999,
                background: 'linear-gradient(135deg, #0F172A, #1E3A8A)',
                color: '#fff', marginBottom: 32,
              }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>+{results.awardedAura} Aura Points</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => {
                if (results.awardedAura > 0) {
                  router.push(`/dashboard?awardedAura=${results.awardedAura}&awardedMode=${mode}`);
                } else {
                  router.push('/dashboard');
                }
              }} style={{
                padding: '12px 28px', borderRadius: 999,
                background: 'linear-gradient(135deg, #0F172A, #1E3A8A)',
                color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>
                Back to Graph →
              </button>
              {!results.passed && (
                <button onClick={() => {
                  earnedPtsRef.current = 0;
                  totalPtsRef.current = 0;
                  setQuestionIndex(0);
                  fetchNext(false);
                }} style={{
                  padding: '12px 28px', borderRadius: 999,
                  background: '#F3F4F6', color: '#374151',
                  border: '1.5px solid #E5E7EB', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}>
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {uiState === 'error' && (
        <div className="glass-card" style={{ padding: 32, maxWidth: 680, width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: 18, color: '#BE123C', marginBottom: 16 }}>⚠ Something went wrong</p>
          <p style={{ color: '#6B7280', marginBottom: 24, fontFamily: 'monospace', fontSize: 13 }}>{errorMsg}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => router.push('/dashboard')} className="pill pill-ghost">← Back to Dashboard</button>
            <button onClick={() => fetchNext(false)} style={{
              padding: '12px 28px', borderRadius: 999,
              background: '#1E3A8A', color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>Try Again</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </main>
  );
}
