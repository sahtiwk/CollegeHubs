import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { History, Clock, ChevronRight, Building2, Trophy } from 'lucide-react';
import { sessionAPI } from '@/services/api';

const STATUS_BADGE = {
  started:     'badge-warning',
  in_progress: 'badge-warning',
  completed:   'badge-success',
  abandoned:   'badge-danger',
};

export default function SessionHistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSessions = (p = 1) => {
    setLoading(true);
    sessionAPI.getAll({ page: p, limit: 10 })
      .then(({ data }) => {
        setSessions(data.sessions || []);
        setTotalPages(data.totalPages || 1);
        setPage(p);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSessions(); }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">Session History</h2>
        <p className="text-slate-400 mt-1">Track your interview practice progress over time</p>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-surface-border rounded w-1/4 mb-3" />
              <div className="h-3 bg-surface-border rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-16 text-center">
          <History className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No sessions yet</h3>
          <p className="text-slate-500 mb-6">Complete your first interview to see results here</p>
          <Link to="/interviews/new" className="btn-primary inline-flex">Start Practicing</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {sessions.map((session, idx) => {
              const score = session.overallScore;
              const scoreColor = score === null ? 'text-slate-500' :
                score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';

              return (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Link
                    to={session.status === 'completed' ? `/sessions/${session._id}/results` : '#'}
                    className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-500/40 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-brand-600/20 rounded-xl flex-shrink-0">
                        <Building2 className="w-5 h-5 text-brand-400" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">
                            {session.interviewId?.jobTitle || 'Unknown Role'}
                          </h3>
                          <span className={`badge ${STATUS_BADGE[session.status] || 'badge-slate'} capitalize`}>
                            {session.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {session.interviewId?.company && <span>{session.interviewId.company}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(session.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </span>
                          {session.totalTimeTaken > 0 && (
                            <span>~{Math.ceil(session.totalTimeTaken / 60)} min</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      {score !== null && score !== undefined ? (
                        <div className="text-center">
                          <p className={`text-2xl font-display font-bold ${scoreColor}`}>{score}%</p>
                          <p className="text-xs text-slate-500">overall</p>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                      {session.status === 'completed' && (
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-brand-400 transition-colors" />
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => fetchSessions(page - 1)} disabled={page === 1} className="btn-secondary px-4 py-2 disabled:opacity-30">
                &larr; Prev
              </button>
              <span className="text-sm text-slate-400 px-2">Page {page} of {totalPages}</span>
              <button onClick={() => fetchSessions(page + 1)} disabled={page === totalPages} className="btn-secondary px-4 py-2 disabled:opacity-30">
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
