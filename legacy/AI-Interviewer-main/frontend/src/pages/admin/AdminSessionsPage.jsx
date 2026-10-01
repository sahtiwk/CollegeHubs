import { useState, useEffect, useCallback } from 'react';
import { Trash2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { getAdminSessions, deleteAdminSession } from '@/services/admin.service';
import toast from 'react-hot-toast';

function ConfirmModal({ message, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-semibold mb-2">Delete Session?</h3>
        <p className="text-slate-400 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            className="btn-danger flex-1"
            disabled={loading}
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return <span className="text-slate-500">—</span>;
  const color =
    score >= 80 ? 'text-emerald-400' :
    score >= 60 ? 'text-amber-400' :
    'text-red-400';
  return <span className={`font-bold ${color}`}>{score}%</span>;
}

const STATUS_COLORS = {
  started:     'badge-brand',
  in_progress: 'badge-warning',
  completed:   'badge-success',
  abandoned:   'badge-danger',
};

export default function AdminSessionsPage() {
  const [data, setData]       = useState({ sessions: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [delItem, setDelItem] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAdminSessions({ page, limit: 15 });
      setData(d);
    } catch { toast.error('Failed to load sessions'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (id) => {
    try {
      await deleteAdminSession(id);
      toast.success('Session deleted');
      setDelItem(null);
      fetchSessions();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">All Sessions</h1>
        <p className="text-slate-400 text-sm mt-1">{data.total} sessions across all users</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Interview</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">User</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Score</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Answers</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Date</th>
                <th className="text-right text-slate-400 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <MessageSquare size={36} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500">No sessions found</p>
                  </td>
                </tr>
              ) : (
                data.sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium truncate max-w-[160px]">
                        {s.interviewId?.jobTitle ?? 'Deleted Interview'}
                      </p>
                      <p className="text-slate-500 text-xs">{s.interviewId?.company ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300 text-xs">{s.userId?.name ?? '—'}</p>
                      <p className="text-slate-500 text-xs">{s.userId?.email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_COLORS[s.status] ?? 'badge-slate'} capitalize`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={s.overallScore} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {s.answers?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDelItem(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <p className="text-slate-500 text-xs">Page {page} of {data.pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <ChevronLeft size={15} />
              </button>
              <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {delItem && (
        <ConfirmModal
          message="Delete this session and all its answers? This cannot be undone."
          onConfirm={() => handleDelete(delItem._id)}
          onClose={() => setDelItem(null)}
        />
      )}
    </div>
  );
}
