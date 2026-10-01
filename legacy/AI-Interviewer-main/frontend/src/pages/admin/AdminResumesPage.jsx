import { useState, useEffect, useCallback } from 'react';
import { Trash2, ChevronLeft, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import { getAdminResumes, deleteAdminResume } from '@/services/admin.service';
import toast from 'react-hot-toast';

function ConfirmModal({ message, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-semibold mb-2">Delete Resume?</h3>
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

const PARSE_STATUS_COLORS = {
  pending:    'badge-slate',
  processing: 'badge-warning',
  parsed:     'badge-success',
  failed:     'badge-danger',
};

export default function AdminResumesPage() {
  const [data, setData]       = useState({ resumes: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [delItem, setDelItem] = useState(null);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAdminResumes({ page, limit: 15 });
      setData(d);
    } catch { toast.error('Failed to load resumes'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const handleDelete = async (id) => {
    try {
      await deleteAdminResume(id);
      toast.success('Resume deleted');
      setDelItem(null);
      fetchResumes();
    } catch { toast.error('Delete failed'); }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">All Resumes</h1>
        <p className="text-slate-400 text-sm mt-1">{data.total} resumes uploaded across all users</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="text-left text-slate-400 font-medium px-4 py-3">File</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Owner</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Parse Status</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Size</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Default</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Uploaded</th>
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
              ) : data.resumes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <FileText size={36} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500">No resumes found</p>
                  </td>
                </tr>
              ) : (
                data.resumes.map((r) => (
                  <tr key={r._id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-orange-400 flex-shrink-0" />
                        <div>
                          <p className="text-white font-medium truncate max-w-[150px]" title={r.originalName}>
                            {r.originalName || r.fileName}
                          </p>
                          {r.fileUrl && (
                            <a
                              href={`https://docs.google.com/viewer?url=${encodeURIComponent(r.fileUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              View <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300 text-xs">{r.userId?.name ?? '—'}</p>
                      <p className="text-slate-500 text-xs">{r.userId?.email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${PARSE_STATUS_COLORS[r.parseStatus] ?? 'badge-slate'} capitalize`}>
                        {r.parseStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {formatBytes(r.fileSize)}
                    </td>
                    <td className="px-4 py-3">
                      {r.isDefault
                        ? <span className="badge badge-success">Yes</span>
                        : <span className="text-slate-600 text-xs">No</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDelItem(r)}
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
          message={`Delete "${delItem.originalName || delItem.fileName}"? This cannot be undone.`}
          onConfirm={() => handleDelete(delItem._id)}
          onClose={() => setDelItem(null)}
        />
      )}
    </div>
  );
}
