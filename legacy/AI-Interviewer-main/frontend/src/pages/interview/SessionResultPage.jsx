import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, TrendingUp, ThumbsUp, Target, Lightbulb,
  BookOpen, ChevronDown, ChevronUp, CheckCircle, XCircle,
  RotateCcw, ArrowLeft, Star
} from 'lucide-react';
import { sessionAPI } from '@/services/api';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';

export default function SessionResultPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAnswer, setExpandedAnswer] = useState(null);

  useEffect(() => {
    sessionAPI.getById(id)
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) return <p className="text-slate-400 text-center mt-20">Session not found.</p>;

  const score = session.overallScore ?? 0;
  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 70 ? 'Excellent' : score >= 40 ? 'Good' : 'Needs Work';

  // Radar chart data by category
  const categoryScores = {};
  session.answers.forEach((a) => {
    const cat = session.interviewId?.questions?.find(
      (q) => q._id === a.questionId?.toString()
    )?.category || 'other';
    if (!categoryScores[cat]) categoryScores[cat] = { scores: [], name: cat.replace('_', ' ') };
    if (a.aiScore !== null) categoryScores[cat].scores.push(a.aiScore);
  });

  const radarData = Object.values(categoryScores).map((c) => ({
    subject: c.name,
    score: c.scores.length
      ? Math.round((c.scores.reduce((a, b) => a + b, 0) / (c.scores.length * 10)) * 100)
      : 0,
  }));

  const barData = session.answers.map((a, i) => ({
    name: `Q${i + 1}`,
    score: a.aiScore ?? 0,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Back */}
      <Link to="/sessions" className="btn-ghost inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back to History
      </Link>

      {/* Score Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-8 text-center bg-gradient-card"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 mb-4"
          style={{ borderColor: scoreColor, boxShadow: `0 0 30px ${scoreColor}40` }}>
          <span className="text-3xl font-display font-bold" style={{ color: scoreColor }}>{score}%</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-1">{scoreLabel}!</h2>
        <p className="text-slate-400 mb-4">{session.interviewId?.jobTitle} • {session.answers.length} questions answered</p>

        {session.overallFeedback && (
          <p className="text-slate-300 text-sm bg-surface/60 rounded-xl p-4 max-w-2xl mx-auto leading-relaxed">
            {session.overallFeedback}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 mt-6">
          <Link to="/interviews/new" className="btn-primary">
            <RotateCcw className="w-4 h-4" /> Practice Again
          </Link>
          <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
        </div>
      </motion.div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-emerald-400" /> Strengths
          </h3>
          {session.strengths?.length ? (
            <ul className="space-y-2">
              {session.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-500 text-sm">No specific strengths noted.</p>}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" /> Areas to Improve
          </h3>
          {session.areasForImprovement?.length ? (
            <ul className="space-y-2">
              {session.areasForImprovement.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-500 text-sm">Keep practicing!</p>}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {radarData.length > 2 && (
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-brand-400" /> Performance by Category
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2a2a4a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" /> Score Per Question
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={24}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#16162a', border: '1px solid #2a2a4a', borderRadius: '12px' }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#a5b4fc' }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 7 ? '#10b981' : entry.score >= 4 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommended Resources */}
      {session.recommendedResources?.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-400" /> Recommended Resources
          </h3>
          <ul className="space-y-2">
            {session.recommendedResources.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-6 h-6 bg-brand-600/20 text-brand-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Answers */}
      <div className="card p-6">
        <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> Question-by-Question Review
        </h3>
        <div className="space-y-3">
          {session.answers.map((answer, i) => {
            const isExpanded = expandedAnswer === i;
            const score = answer.aiScore ?? 0;
            const color = score >= 7 ? 'text-emerald-400' : score >= 4 ? 'text-amber-400' : 'text-red-400';

            return (
              <div key={i} className="border border-surface-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedAnswer(isExpanded ? null : i)}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 bg-brand-600/20 text-brand-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <p className="text-sm text-white truncate">{answer.questionText}</p>
                    {answer.skipped && <span className="badge-warning badge flex-shrink-0">Skipped</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className={`text-sm font-bold ${color}`}>{score}/10</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-surface-border p-4 space-y-4 bg-surface"
                  >
                    {answer.answerText && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Your Answer</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{answer.answerText}</p>
                      </div>
                    )}
                    {answer.aiFeedback && (
                      <div className="p-3 rounded-lg bg-brand-600/10 border border-brand-500/20">
                        <p className="text-xs text-brand-400 mb-1 uppercase tracking-wide">AI Feedback</p>
                        <p className="text-brand-200 text-sm leading-relaxed">{answer.aiFeedback}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
