/**
 * pages/admin/AdminPaymentsPage.jsx
 *
 * Payment Transactions & Invoices Dashboard.
 * Toggles between:
 *  - Tab 1: Transactions list (Filters for success/refunds, exports CSV, and triggers refund actions).
 *  - Tab 2: Failed Payments (Audits card declinings and error messages).
 *  - Tab 3: Webhook Logs (Lists raw Stripe events metadata logs).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, DollarSign, RefreshCw, AlertOctagon, CheckCircle2,
  XCircle, Filter, Search, Download, Trash2, ShieldAlert, Clock, Eye
} from 'lucide-react';
import {
  getAdminTransactions, getAdminPaymentStats, refundAdminTransaction, getAdminWebhookLogs
} from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'failed' | 'webhooks'

  // Data states
  const [transactions, setTransactions] = useState([]);
  const [failedPayments, setFailedPayments] = useState([]);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [stats, setStats] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Query filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [refundItem, setRefundItem] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState(null);

  // Fetch metrics cards
  const fetchStats = useCallback(async () => {
    try {
      const s = await getAdminPaymentStats();
      setStats(s);
    } catch {
      toast.error('Failed to load transaction statistics.');
    }
  }, []);

  // Fetch transactions list
  const fetchTxList = useCallback(async () => {
    try {
      const query = { page, limit: 12, search };
      if (activeTab === 'transactions') {
        query.status = statusFilter === 'all' ? 'success,refunded' : statusFilter;
      } else if (activeTab === 'failed') {
        query.status = 'failed';
      }
      
      const res = await getAdminTransactions(query);
      if (activeTab === 'transactions') {
        setTransactions(res.transactions || []);
      } else {
        setFailedPayments(res.transactions || []);
      }
      setTotalItems(res.total || 0);
      setTotalPages(res.pages || 1);
    } catch {
      toast.error('Error fetching transactions list.');
    }
  }, [page, search, statusFilter, activeTab]);

  // Fetch webhook logs list
  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await getAdminWebhookLogs({ page, limit: 12 });
      setWebhookLogs(res.logs || []);
      setTotalItems(res.total || 0);
      setTotalPages(res.pages || 1);
    } catch {
      toast.error('Error fetching webhook logs.');
    }
  }, [page]);

  // Loader dispatcher
  const loadActiveData = useCallback(async () => {
    setLoading(true);
    await fetchStats();
    if (activeTab === 'webhooks') {
      await fetchWebhooks();
    } else {
      await fetchTxList();
    }
    setLoading(false);
  }, [activeTab, fetchStats, fetchWebhooks, fetchTxList]);

  useEffect(() => {
    loadActiveData();
  }, [loadActiveData]);

  // Handle search trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTxList();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return toast.error('No transaction records to export.');

    const headers = ['Created At', 'Transaction ID', 'Candidate Name', 'Candidate Email', 'Plan Name', 'Amount', 'Currency', 'Status', 'Refund Reason'];
    const rows = transactions.map(tx => [
      new Date(tx.createdAt).toLocaleString(),
      tx.transactionId,
      tx.userId?.name || '—',
      tx.userId?.email || '—',
      tx.planId?.name || '—',
      tx.amount,
      tx.currency,
      tx.status,
      tx.refundReason || '—'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transactions_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV compiled and downloaded.');
  };

  // Perform Refund
  const handleIssueRefund = async () => {
    if (!refundReason.trim()) return toast.error('Refund explanation reason is required.');
    setRefunding(true);
    try {
      await refundAdminTransaction(refundItem._id, refundReason);
      toast.success('Payment successfully refunded. User premium access revoked.');
      setRefundItem(null);
      setRefundReason('');
      loadActiveData();
    } catch {
      toast.error('Refund transaction failure.');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 relative">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payment Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Audit customer transaction records, log stripe webhooks, check failed receipts, and issue manual refunds</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/8 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => { setActiveTab('transactions'); setPage(1); setSearch(''); setStatusFilter('all'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors
              ${activeTab === 'transactions' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <CheckCircle2 size={13} />
            Transactions
          </button>
          <button
            onClick={() => { setActiveTab('failed'); setPage(1); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors
              ${activeTab === 'failed' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <XCircle size={13} />
            Failed Payments
          </button>
          <button
            onClick={() => { setActiveTab('webhooks'); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors
              ${activeTab === 'webhooks' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Clock size={13} />
            Webhook Logs
          </button>
        </div>
      </div>

      {/* ── Metrics Cards Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Gross Revenue */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold">Gross Platform Revenue</span>
            <p className="text-2xl font-bold text-white leading-none mt-1">
              ${stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : '0.00'}
            </p>
            <p className="text-[10px] text-emerald-400">Excludes refunded amounts</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Total Sales count */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold">Completed Sales Reciepts</span>
            <p className="text-2xl font-bold text-white leading-none mt-1">
              {stats?.successfulSales ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">Total processed subscriptions</p>
          </div>
          <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-400">
            <CreditCard size={20} />
          </div>
        </div>

        {/* Refunded Sales */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold">Total Issued Refunds</span>
            <p className="text-2xl font-bold text-red-400 leading-none mt-1">
              ${stats?.totalRefunded ? stats.totalRefunded.toFixed(2) : '0.00'}
            </p>
            <p className="text-[10px] text-slate-500">From {stats?.refundedSales ?? 0} returns</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
            <RefreshCw size={20} />
          </div>
        </div>

        {/* Failed rate */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold">Failed Card Declines</span>
            <p className="text-2xl font-bold text-amber-500 leading-none mt-1">
              {stats?.failedSales ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">Insufficient checkout balances</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
            <AlertOctagon size={20} />
          </div>
        </div>

      </div>

      {/* ── Filtering Toolbar (Except for webhooks) ──────────── */}
      {activeTab !== 'webhooks' && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-4 rounded-xl">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="form-input text-xs pl-9"
                placeholder="Search by Transaction ID or candidate name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-secondary text-xs px-4 flex items-center gap-1">
              Search
            </button>
          </form>

          <div className="flex gap-3 w-full md:w-auto justify-end flex-shrink-0">
            {activeTab === 'transactions' && (
              <select
                className="form-select text-xs py-1.5"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">Status: Successful & Refunded</option>
                <option value="success">Status: Success Only</option>
                <option value="refunded">Status: Refunded Only</option>
              </select>
            )}
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
      )}

      {/* ── TAB 1: Transactions list ─────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Timestamp</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Transaction ID</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">User</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Plan Package</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Method</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Paid Price</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-500 text-xs">No successful transactions found matching queries.</td>
                  </tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx._id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{tx.transactionId}</td>
                      <td className="px-4 py-3">
                        <p className="text-white text-xs font-semibold leading-tight">{tx.userId?.name || '—'}</p>
                        <p className="text-slate-500 text-[10px]">{tx.userId?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium">{tx.planId?.name || 'Starter Plan'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs capitalize">{tx.paymentMethod}</td>
                      <td className="px-4 py-3 text-white font-bold">${tx.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {tx.status === 'success' ? (
                          <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Success</span>
                        ) : (
                          <span className="badge bg-red-500/10 text-red-400 border border-red-500/20" title={tx.refundReason}>Refunded</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tx.status === 'success' && (
                          <button
                            onClick={() => { setRefundItem(tx); setRefundReason(''); }}
                            className="text-xs text-red-400 font-semibold hover:text-red-300 hover:underline"
                          >
                            Issue Refund
                          </button>
                        )}
                        {tx.status === 'refunded' && (
                          <span className="text-[10px] text-slate-500 italic max-w-[120px] truncate block ml-auto" title={tx.refundReason}>
                            Reason: {tx.refundReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Failed Payments list ──────────────────────── */}
      {activeTab === 'failed' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Timestamp</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Transaction ID</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Candidate</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Attempted package</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Price</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Card Error Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : failedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500 text-xs">No failed transaction records logged.</td>
                  </tr>
                ) : (
                  failedPayments.map(tx => (
                    <tr key={tx._id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{tx.transactionId}</td>
                      <td className="px-4 py-3 text-slate-300">
                        <p className="text-white text-xs font-semibold">{tx.userId?.name || '—'}</p>
                        <p className="text-slate-500 text-[10px]">{tx.userId?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{tx.planId?.name || 'Starter Plan'}</td>
                      <td className="px-4 py-3 font-bold text-slate-200">${tx.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-red-400 max-w-sm truncate" title={tx.error}>
                        {tx.error || 'Payment rejected by bank.'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: Webhook Logs list ─────────────────────────── */}
      {activeTab === 'webhooks' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Received Time</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Gateway</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Webhook Event Type</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Execution Status</th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3">Payload Raw Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : webhookLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500 text-xs">No webhooks event records parsed.</td>
                  </tr>
                ) : (
                  webhookLogs.map(log => (
                    <tr key={log._id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-xs text-white capitalize">{log.provider}</td>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-300">{log.eventType}</td>
                      <td className="px-4 py-3">
                        {log.status === 'processed' ? (
                          <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Processed</span>
                        ) : (
                          <span className="badge bg-red-500/10 text-red-400 border border-red-500/20" title={log.error}>Failed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedPayload(log.payload)}
                          className="text-xs text-indigo-400 font-semibold hover:text-indigo-300 hover:underline flex items-center gap-1 justify-end ml-auto"
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
        </div>
      )}

      {/* Pagination control */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 bg-white/2 rounded-xl">
          <p className="text-slate-500 text-xs">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
              <RefreshCw size={15} />
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Issue Refund Modal */}
      {refundItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <RefreshCw className="text-red-500" size={18} />
              Issue Refund Request?
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Are you sure you want to refund this purchase of <strong className="text-white">${refundItem.amount.toFixed(2)}</strong>? This will marking the receipt as refunded and revoke candidate premium permissions.
            </p>
            <div>
              <label className="form-label">Reason for Refund*</label>
              <input
                className="form-input text-xs"
                placeholder="e.g. Duplicate charging error"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleIssueRefund} disabled={refunding} className="btn-danger flex-1">
                {refunding ? 'Refunding…' : 'Issue Refund'}
              </button>
              <button onClick={() => setRefundItem(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Payload Inspector Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-white font-semibold text-sm">Raw Webhook Payload JSON</h3>
              <button onClick={() => setSelectedPayload(null)} className="text-slate-400 hover:text-white"><XCircle size={16} /></button>
            </div>
            <pre className="p-4 rounded-xl bg-black/40 border border-white/[0.04] text-[10px] text-slate-300 font-mono overflow-auto max-h-96 whitespace-pre">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedPayload(null)} className="btn-secondary px-6">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
