/**
 * pages/admin/AdminUsersPage.jsx
 *
 * Full-scale admin user management system.
 * Features:
 *  - Dynamic searching, filtering, and backend sorting.
 *  - Premium toggle, Ban / Suspend actions.
 *  - Credit allocation & removal adjustments.
 *  - Interactive slide-out Profile Drawer for user sessions and resume history.
 *  - Selection mechanics for bulk operations (Activate, Deactivate, Ban, Unban, Delete).
 *  - CSV export of table queries.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Shield, UserX, UserCheck, Trash2, ChevronLeft, ChevronRight,
  Edit3, Check, X, CreditCard, Star, Activity, Download, Plus, Minus,
  ExternalLink, Eye, MoreHorizontal, Ban, AlertOctagon, HelpCircle, FileText, ArrowUpDown
} from 'lucide-react';
import {
  getAdminUsers, getAdminUser, updateAdminUser, deleteAdminUser, bulkAdminUsersAction
} from '@/services/admin.service';
import toast from 'react-hot-toast';

const ADMIN_EMAIL = 'aftab@admin.com';

// ─── Status Badge rendering ───────────────────────────────────────
function StatusBadge({ isActive, isBanned }) {
  if (isBanned) {
    return <span className="badge bg-red-600/20 text-red-300 border border-red-500/30">Banned</span>;
  }
  return isActive
    ? <span className="badge bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">Active</span>
    : <span className="badge bg-slate-600/20 text-slate-400 border border-slate-500/30">Inactive</span>;
}

// ─── Role Badge rendering ─────────────────────────────────────────
function RoleBadge({ role }) {
  if (role === 'super_admin') {
    return <span className="badge bg-amber-600/20 text-amber-300 border border-amber-500/30">Super Admin</span>;
  }
  if (role === 'admin') {
    return <span className="badge bg-red-600/20 text-red-300 border border-red-500/30">Admin</span>;
  }
  if (role === 'support') {
    return <span className="badge bg-teal-600/20 text-teal-300 border border-teal-500/30">Support</span>;
  }
  if (role === 'content_manager') {
    return <span className="badge bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">Content Manager</span>;
  }
  return <span className="badge bg-blue-600/20 text-blue-300 border border-blue-500/30">Candidate</span>;
}

// ─── Profile Drawer Component ─────────────────────────────────────
function UserProfileDrawer({ userId, onClose, onUpdateSuccess }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminUser(userId);
      setDetails(data);
    } catch {
      toast.error('Failed to load user activity log.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#0c0c1e] border-l border-white/10 p-6 z-40 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/5" />
          <div className="h-4 bg-white/5 rounded w-32" />
          <div className="h-3 bg-white/5 rounded w-24" />
        </div>
      </div>
    );
  }

  const { user, interviewCount, sessionCount, resumeCount } = details || {};
  const initial = user?.name?.[0]?.toUpperCase() ?? 'A';

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#0c0c1e] border-l border-white/10 p-6 z-40 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
        <h3 className="text-white font-semibold text-base">User Activity & Profile</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <X size={18} />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto py-5 space-y-6 scrollbar-thin">
        
        {/* User Card */}
        <div className="flex items-center gap-4 bg-white/[0.02] p-4 border border-white/[0.05] rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            {initial}
          </div>
          <div className="min-w-0">
            <h4 className="text-white font-semibold text-sm truncate">{user?.name}</h4>
            <p className="text-slate-500 text-xs truncate mb-1">{user?.email}</p>
            <div className="flex gap-1.5 items-center flex-wrap">
              <RoleBadge role={user?.role} />
              <StatusBadge isActive={user?.isActive} isBanned={user?.isBanned} />
              {user?.isPremium && (
                <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Star size={10} className="fill-amber-300" /> Premium
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-xl text-center">
            <p className="text-lg font-bold text-white">{user?.credits ?? 0}</p>
            <p className="text-slate-500 text-[10px] uppercase font-semibold">Credits</p>
          </div>
          <div className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-xl text-center">
            <p className="text-lg font-bold text-white">{interviewCount ?? 0}</p>
            <p className="text-slate-500 text-[10px] uppercase font-semibold">Interviews</p>
          </div>
          <div className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-xl text-center">
            <p className="text-lg font-bold text-white">{sessionCount ?? 0}</p>
            <p className="text-slate-500 text-[10px] uppercase font-semibold">Sessions</p>
          </div>
        </div>

        {/* Uploaded Resumes */}
        <div>
          <h5 className="text-white text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Uploaded Resumes ({resumeCount ?? 0})</h5>
          {user?.resumes?.length === 0 ? (
            <p className="text-slate-600 text-xs">No resumes uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {user?.resumes?.map(r => (
                <div key={r._id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-orange-400" />
                    <p className="text-xs text-slate-300 truncate max-w-[200px]">{r.originalName || r.fileName}</p>
                  </div>
                  {r.fileUrl && (
                    <a href={`https://docs.google.com/viewer?url=${encodeURIComponent(r.fileUrl)}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      View <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Mock Sessions */}
        <div>
          <h5 className="text-white text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Recent Sessions</h5>
          {user?.sessions?.length === 0 ? (
            <p className="text-slate-600 text-xs">No active interview session history.</p>
          ) : (
            <div className="space-y-2">
              {user?.sessions?.map(s => (
                <div key={s._id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-white">{s.interviewId?.jobTitle || 'Mock Interview'}</p>
                      <p className="text-[10px] text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    {s.overallScore !== null && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {s.overallScore}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Edit Modal Component ─────────────────────────────────────────
function EditUserModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    isBanned: user.isBanned,
    isPremium: user.isPremium,
    credits: user.credits ?? 10
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(user._id, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2">Edit User Profile</h3>
        
        {/* Name */}
        <div>
          <label className="form-label">Full Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
            required
          />
        </div>

        {/* Role */}
        <div>
          <label className="form-label">User Authorization Role</label>
          <select
            className="form-select"
            value={form.role}
            onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
            disabled={user.email === ADMIN_EMAIL}
          >
            <option value="candidate">Candidate</option>
            <option value="support">Support</option>
            <option value="content_manager">Content Manager</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {/* Credits Control */}
        <div>
          <label className="form-label">Credits Count</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, credits: Math.max(0, p.credits - 1) }))}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              className="form-input text-center"
              value={form.credits}
              onChange={(e) => setForm(p => ({ ...p, credits: parseInt(e.target.value) || 0 }))}
              min="0"
            />
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, credits: p.credits + 1 }))}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Status flags */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Active status */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
              disabled={user.email === ADMIN_EMAIL}
              className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="text-slate-300 text-xs font-semibold">Account Active</span>
          </label>

          {/* Premium flag */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isPremium}
              onChange={(e) => setForm(p => ({ ...p, isPremium: e.target.checked }))}
              className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="text-slate-300 text-xs font-semibold">Premium Membership</span>
          </label>

          {/* Banned flag */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none col-span-2">
            <input
              type="checkbox"
              checked={form.isBanned}
              onChange={(e) => setForm(p => ({ ...p, isBanned: e.target.checked, isActive: e.target.checked ? false : p.isActive }))}
              disabled={user.email === ADMIN_EMAIL}
              className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="text-slate-300 text-xs font-semibold">Banned / Terminated Status</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-3 border-t border-white/10">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Apply Changes'}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Main User Manager ────────────────────────────────────────────
export default function AdminUsersPage() {
  const [data, setData]               = useState({ users: [], total: 0, pages: 1 });
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [role, setRole]               = useState('all');
  const [status, setStatus]           = useState('all');
  const [sortBy, setSortBy]           = useState('createdAt');
  const [sortDir, setSortDir]         = useState('desc');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  
  // Modals / Drawer toggles
  const [activeDrawerUserId, setActiveDrawerUserId] = useState(null);
  const [editUser, setEditUser]       = useState(null);
  const [deleteUserObj, setDeleteUserObj] = useState(null);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);

  const dropdownRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAdminUsers({
        page, limit: 12, search, role, status, sortBy, sortDir
      });
      setData(d);
    } catch {
      toast.error('Failed to load accounts list.');
    } finally {
      setLoading(false);
    }
  }, [page, search, role, status, sortBy, sortDir]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle outside dropdown close
  useEffect(() => {
    const clickHandler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowBulkDropdown(false);
      }
    };
    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, []);

  const handleUpdate = async (id, payload) => {
    try {
      await updateAdminUser(id, payload);
      toast.success('Account modifications saved.');
      fetchUsers();
    } catch {
      toast.error('Error saving edits.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminUser(id);
      toast.success('Account permanently deleted.');
      setDeleteUserObj(null);
      fetchUsers();
    } catch {
      toast.error('Deletion failure.');
    }
  };

  // Bulk operation triggers
  const handleBulkAction = async (action) => {
    if (selectedUserIds.length === 0) return;
    try {
      await bulkAdminUsersAction(action, selectedUserIds);
      toast.success(`Bulk operation: ${action} succeeded.`);
      setSelectedUserIds([]);
      setShowBulkDropdown(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk operation failed.');
    }
  };

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const list = data.users.filter(u => u.email !== ADMIN_EMAIL).map(u => u._id);
      setSelectedUserIds(list);
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectRow = (userId) => {
    setSelectedUserIds(p =>
      p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]
    );
  };

  // Toggle sorting directions
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(p => p === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  // Export search queue as CSV file
  const exportToCSV = () => {
    if (data.users.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Premium', 'Credits', 'Sessions', 'Last Login'];
    const rows = data.users.map(u => [
      u._id,
      u.name,
      u.email,
      u.role,
      u.isBanned ? 'Banned' : (u.isActive ? 'Active' : 'Inactive'),
      u.isPremium ? 'Yes' : 'No',
      u.credits ?? 10,
      u.totalSessions ?? 0,
      u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `candidates_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-6 relative">

      {/* Slide-out Profile Drawer overlay wrapper */}
      {activeDrawerUserId && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" onClick={() => setActiveDrawerUserId(null)} />
          <UserProfileDrawer userId={activeDrawerUserId} onClose={() => setActiveDrawerUserId(null)} onUpdateSuccess={fetchUsers} />
        </>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage user authorization roles, ban lists, credit counts, and activity metrics</p>
        </div>
        
        {/* Export CSV button */}
        <button
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm hover:bg-white/10 hover:border-white/15 transition-all font-medium self-start sm:self-auto"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* ── Search, Filters, & Bulk Actions Dropdown ─────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="form-input pl-10"
            placeholder="Search by name or email address…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        
        {/* Filters */}
        <select className="form-select w-full sm:w-40" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="all">All Roles</option>
          <option value="candidate">Candidate</option>
          <option value="support">Support</option>
          <option value="content_manager">Content Manager</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        
        <select className="form-select w-full sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="banned">Banned</option>
          <option value="premium">Premium</option>
        </select>

        {/* Bulk Actions Dropdown */}
        {selectedUserIds.length > 0 && (
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setShowBulkDropdown(!showBulkDropdown)}
              className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm hover:bg-brand-500 transition-colors w-full sm:w-auto"
            >
              Bulk Action ({selectedUserIds.length})
              <MoreHorizontal size={14} />
            </button>

            {showBulkDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#12122a] border border-white/10 rounded-xl shadow-xl z-20 p-1 divide-y divide-white/5">
                <div className="py-1">
                  <button onClick={() => handleBulkAction('activate')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                    <UserCheck size={12} className="text-emerald-400" /> Activate Users
                  </button>
                  <button onClick={() => handleBulkAction('deactivate')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                    <UserX size={12} className="text-amber-400" /> Deactivate Users
                  </button>
                </div>
                <div className="py-1">
                  <button onClick={() => handleBulkAction('ban')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                    <Ban size={12} className="text-red-400" /> Ban Users
                  </button>
                  <button onClick={() => handleBulkAction('unban')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                    <UserCheck size={12} className="text-blue-400" /> Unban Users
                  </button>
                </div>
                <div className="py-1 pt-1">
                  <button onClick={() => handleBulkAction('delete')} className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg flex items-center gap-2">
                    <Trash2 size={12} /> Delete Users
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Accounts Table ───────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                {/* Select All Checkbox */}
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={data.users.length > 0 && selectedUserIds.length === data.users.filter(u => u.email !== ADMIN_EMAIL).length}
                    onChange={handleSelectAll}
                    disabled={data.users.length === 0}
                    className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1.5">User <ArrowUpDown size={12} /></span>
                </th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Role</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('credits')}>
                  <span className="flex items-center gap-1.5">Credits <ArrowUpDown size={12} /></span>
                </th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('totalSessions')}>
                  <span className="flex items-center gap-1.5">Sessions <ArrowUpDown size={12} /></span>
                </th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('lastLogin')}>
                  <span className="flex items-center gap-1.5">Last Login <ArrowUpDown size={12} /></span>
                </th>
                <th className="text-right text-slate-400 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-4 bg-white/5 rounded animate-pulse mx-auto" /></td>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500 py-10">No users found matching query filters.</td>
                </tr>
              ) : (
                data.users.map((u) => {
                  const isSuperAdmin = u.email === ADMIN_EMAIL;
                  const isRowChecked = selectedUserIds.includes(u._id);
                  return (
                    <tr key={u._id} className={`hover:bg-white/3 transition-colors ${isRowChecked ? 'bg-brand-600/5' : ''}`}>
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isRowChecked}
                          onChange={() => handleSelectRow(u._id)}
                          disabled={isSuperAdmin}
                          className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500 disabled:opacity-40"
                        />
                      </td>

                      {/* User Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium leading-tight flex items-center gap-1.5">
                              {u.name}
                              {u.isPremium && (
                                <Star size={11} className="text-amber-400 fill-amber-400" title="Premium Subscriber" />
                              )}
                            </p>
                            <p className="text-slate-500 text-xs truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Role & status */}
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3"><StatusBadge isActive={u.isActive} isBanned={u.isBanned} /></td>
                      
                      {/* Credits & sessions count */}
                      <td className="px-4 py-3 font-semibold text-slate-200">{u.credits ?? 10}</td>
                      <td className="px-4 py-3 text-slate-300">{u.totalSessions ?? 0}</td>
                      
                      {/* Last Login date */}
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                      </td>

                      {/* Single actions triggers */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Profile drawer view */}
                          <button
                            title="View activity log"
                            onClick={() => setActiveDrawerUserId(u._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {/* Edit user details */}
                          <button
                            title="Edit profile details"
                            onClick={() => setEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Delete profile */}
                          {!isSuperAdmin && (
                            <button
                              title="Delete user profile"
                              onClick={() => setDeleteUserObj(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <p className="text-slate-500 text-xs">Page {page} of {data.pages}</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                disabled={page === data.pages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals trigger overlays */}
      {editUser && (
        <EditUserModal user={editUser} onSave={handleUpdate} onClose={() => setEditUser(null)} />
      )}
      
      {deleteUserObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2 mb-2">
              <AlertOctagon className="text-red-500" size={20} />
              Confirm Deletion
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-5">
              Are you sure you want to permanently delete candidate <span className="text-white font-semibold">{deleteUserObj.name}</span>? 
              This will cascade delete all their interview templates, session records, and uploaded resume files.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteUserObj._id)}
                className="btn-danger flex-1"
              >
                Delete Account
              </button>
              <button
                onClick={() => setDeleteUserObj(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
