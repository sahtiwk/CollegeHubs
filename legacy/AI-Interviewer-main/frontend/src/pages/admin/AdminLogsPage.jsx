/**
 * pages/admin/AdminLogsPage.jsx
 *
 * System Logs & Auditing Trail Dashboard.
 * Filters logs by category (Auth, Admin, AI, Payments, Scraper, Email),
 * provides inline search, paginates results, and exports logs to CSV.
 * Clicking a row inspects its detailed metadata payload.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Terminal, Search, Filter, Download, ChevronLeft, ChevronRight,
  Eye, CheckCircle, AlertTriangle, XCircle, Info, RefreshCw
} from 'lucide-react';
import { getAdminLogs } from '@/services/admin.service';
import toast from 'react-hot-toast';

const STATUS_ICONS = {
  success: <CheckCircle className="text-emerald-400" size={14} />,
  failed:  <XCircle className="text-red-400" size={14} />,
  warning: <AlertTriangle className="text-amber-400" size={14} />,
  info:    <Info className="text-blue-400" size={14} />,
};

const STATUS_BADGES = {
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  failed:  'bg-red-500/10 text-red-400 border border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  info:    'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

export default function AdminLogsPage() {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);

  // Filters & Search
  const [category, setCategory]     = useState('all');
  const [status, setStatus]         = useState('all');
  const [search, setSearch]         = useState('');
  
  // Pagination
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Inspector details
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminLogs({
        page,
        limit: 15,
        search,
        category,
        status
      });
      setLogs(res.logs || []);
      setTotalItems(res.total || 0);
      setTotalPages(res.pages || 1);
    } catch {
      toast.error('Failed to load system audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status]);

  useEffect(() => {
    fetchLogsList();
  }, [fetchLogsList]);

  // Handle filter/search resets
  const handleFilterChange = (type, val) => {
    setPage(1);
    if (type === 'category') setCategory(val);
    if (type === 'status') setStatus(val);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogsList();
  };

  // Export logs to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return toast.error('No log records compiled to export.');

    const headers = ['Timestamp', 'Category', 'Action Event', 'Status', 'User Trigger', 'Details', 'Metadata Payload'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString(),
      l.category,
      l.action,
      l.status,
      l.userId ? `${l.userId.name} (${l.userId.email})` : 'System Daemon',
      l.details,
      JSON.stringify(l.metadata || {})
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `system_logs_export_${category}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('System logs CSV compiled and downloaded.');
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 relative">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Logs Audits</h1>
        <p className="text-slate-400 text-sm mt-0.5">Audit real-time pipeline operations, secure access, transaction requests, scraper events, and email dispatches</p>
      </div>

      {/* ── Filtering Toolbar ────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-4 rounded-xl">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full xl:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="form-input text-xs pl-9"
              placeholder="Search by action keyword or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary text-xs px-4 flex items-center gap-1">
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto justify-end flex-shrink-0">
          {/* Category Filter */}
          <select
            className="form-select text-xs py-1.5"
            value={category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="all">Category: All Logs</option>
            <option value="auth">Auth & Signins</option>
            <option value="admin">Admin Actions</option>
            <option value="ai">AI Groq Engines</option>
            <option value="payment">Webhook Payments</option>
            <option value="scraper">Job Scraper Timers</option>
            <option value="email">Email Dispatches</option>
          </select>

          {/* Status Filter */}
          <select
            className="form-select text-xs py-1.5"
            value={status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">Status: All Levels</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs px-4 flex items-center gap-1.5 hover:text-emerald-400"
            type="button"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Logs audit sheet table ───────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Timestamp</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Category</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Action Event</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Trigger Account</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Details</th>
                <th className="text-right text-slate-400 font-medium px-4 py-3">Metadata</th>
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
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">No audit logs found matching query filters.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-white/5 border border-white/8 text-[9px] uppercase tracking-wider font-bold">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200 text-xs truncate max-w-[150px]">{log.action}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGES[log.status]} flex items-center gap-1 w-fit`}>
                        {STATUS_ICONS[log.status]}
                        <span className="capitalize text-[10px]">{log.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {log.userId ? (
                        <div>
                          <p className="font-semibold leading-tight">{log.userId.name}</p>
                          <p className="text-slate-500 text-[10px]">{log.userId.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-600">System Daemon</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs text-brand-400 hover:text-brand-300 font-semibold hover:underline flex items-center gap-1 justify-end ml-auto"
                      >
                        <Eye size={12} /> Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <p className="text-slate-500 text-xs">Page {page} of {totalPages} ({totalItems} total logs)</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <ChevronLeft size={15} />
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Raw Payload Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <div>
                <h3 className="text-white font-semibold text-sm">Auditing Payload Inspector</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedLog.action} (v{selectedLog._id})</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                <XCircle size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs border-b border-white/[0.04] pb-2 text-slate-400">
                <span>Category: <strong className="text-white capitalize">{selectedLog.category}</strong></span>
                <span>Level Status: <strong className="text-white capitalize">{selectedLog.status}</strong></span>
                <span>Dispatched: <strong className="text-white">{new Date(selectedLog.createdAt).toLocaleString()}</strong></span>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-500 font-semibold mb-1 block uppercase tracking-wider">Raw Metadata Logs</span>
                <pre className="p-4 rounded-xl bg-black/40 border border-white/[0.04] text-[10px] text-slate-300 font-mono overflow-auto max-h-80 whitespace-pre">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5">
              <button onClick={() => setSelectedLog(null)} className="btn-secondary px-6">Close Inspector</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
