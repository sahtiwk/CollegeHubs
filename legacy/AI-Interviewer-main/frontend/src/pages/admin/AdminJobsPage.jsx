/**
 * pages/admin/AdminJobsPage.jsx
 *
 * Full-scale admin job posting manager.
 * Features:
 *  - Interactive statistic metrics cards (Total, Featured, Pinned, Archived).
 *  - Custom search, contract filters, type filters, and column sorting.
 *  - Grid card & table layout toggles.
 *  - Edit & Add Job modals with form validation.
 *  - Duplicate job detection warnings: prompts confirmation to force creation on 409.
 *  - Slide-out Job Preview Drawer.
 *  - Multi-select bulk adjustments (Pin, Unpin, Feature, Unfeature, Archive, Unarchive, Delete).
 *  - Dynamic client-side CSV Import parser & CSV Export compiler.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Briefcase, Search, Plus, Trash2, Edit3, Eye, MoreHorizontal,
  ChevronLeft, ChevronRight, Download, Upload, EyeOff, Pin, Star,
  Archive, FileText, DollarSign, MapPin, Grid, List, AlertTriangle, X, ArrowUpDown
} from 'lucide-react';
import {
  getAdminJobs, getAdminJobStats, createAdminJob, updateAdminJob, deleteAdminJob, bulkAdminJobsAction
} from '@/services/admin.service';
import toast from 'react-hot-toast';

// ─── Contract Type Badges ─────────────────────────────────────────
function ContractBadge({ type }) {
  const labels = {
    full_time:  { val: 'Full Time',  css: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
    part_time:  { val: 'Part Time',  css: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' },
    contract:   { val: 'Contract',   css: 'bg-purple-600/20 text-purple-300 border-purple-500/30' },
    internship: { val: 'Internship', css: 'bg-teal-600/20 text-teal-300 border-teal-500/30' },
    temporary:  { val: 'Temporary',  css: 'bg-amber-600/20 text-amber-300 border-amber-500/30' },
  };
  const match = labels[type] || { val: type, css: 'bg-slate-600/20 text-slate-300 border-slate-500/30' };
  return <span className={`badge ${match.css}`}>{match.val}</span>;
}

// ─── Job Details Preview Drawer ───────────────────────────────────
function JobPreviewDrawer({ job, onClose }) {
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#0c0c1e] border-l border-white/10 p-6 z-40 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
        <h3 className="text-white font-semibold text-base">Job Listing Detail</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-5 space-y-6 scrollbar-thin">
        
        {/* Info */}
        <div className="bg-white/[0.02] p-4 border border-white/[0.05] rounded-2xl space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="text-white font-bold text-base leading-tight">{job.title}</h4>
            <div className="flex gap-1">
              {job.isPinned && <Pin size={14} className="text-amber-400 fill-amber-400" />}
              {job.isFeatured && <Star size={14} className="text-purple-400 fill-purple-400" />}
            </div>
          </div>
          <p className="text-slate-300 text-sm font-semibold">{job.company}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <ContractBadge type={job.contractType} />
            <span className="badge bg-slate-600/20 text-slate-300 border-slate-500/30 flex items-center gap-1">
              <MapPin size={10} /> {job.location}
            </span>
            <span className="badge bg-slate-600/20 text-slate-300 border-slate-500/30">{job.category}</span>
          </div>
        </div>

        {/* Salary */}
        {(job.salaryMin || job.salaryMax) && (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-3">
            <DollarSign className="text-emerald-400" size={18} />
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Salary Range</p>
              <p className="text-white text-sm font-semibold">
                {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : '—'}
                {' '}-{' '}
                {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <h5 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Job Description</h5>
          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.05] text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">
            {job.description}
          </div>
        </div>

        {/* External Link */}
        {job.applyUrl && (
          <div className="pt-2">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary w-full text-center flex items-center justify-center gap-1.5"
            >
              Apply Link
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Meta */}
        <div className="pt-4 border-t border-white/5 space-y-1">
          <p className="text-slate-500 text-[10px]">Posted By: <span className="text-slate-400">{job.postedBy?.name || 'Admin'}</span></p>
          <p className="text-slate-500 text-[10px]">Date Created: <span className="text-slate-400">{new Date(job.createdAt).toLocaleString()}</span></p>
        </div>

      </div>
    </div>
  );
}

// ─── Add/Edit Job Modal Component ─────────────────────────────────
function JobFormModal({ job, onSave, onClose }) {
  const [form, setForm] = useState({
    title:        job?.title || '',
    company:      job?.company || '',
    location:     job?.location || 'Remote',
    description:  job?.description || '',
    salaryMin:    job?.salaryMin || '',
    salaryMax:    job?.salaryMax || '',
    contractType: job?.contractType || 'full_time',
    category:     job?.category || 'General',
    isFeatured:   job?.isFeatured || false,
    isPinned:     job?.isPinned || false,
    applyUrl:     job?.applyUrl || '',
    ignoreDuplicate: false
  });
  
  const [saving, setSaving] = useState(false);
  const [dupPrompt, setDupPrompt] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null,
      };

      let res;
      if (job?._id) {
        res = await updateAdminJob(job._id, payload);
      } else {
        res = await createAdminJob(payload);
      }

      // Check duplicate hook from API response
      if (res?.duplicateDetected) {
        setDupPrompt(true);
        setSaving(false);
        return;
      }

      toast.success('Job listing saved.');
      onSave();
      onClose();
    } catch (err) {
      if (err.response?.status === 409) {
        setDupPrompt(true);
      } else {
        toast.error('Error saving job details.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleForceSave = () => {
    setForm(p => ({ ...p, ignoreDuplicate: true }));
    setDupPrompt(false);
  };

  useEffect(() => {
    if (form.ignoreDuplicate) {
      handleSubmit();
    }
  }, [form.ignoreDuplicate]);

  if (dupPrompt) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={20} />
            <h3 className="font-semibold text-base">Duplicate Listing Detected</h3>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            A job listing with the same <strong>Title, Company,</strong> and <strong>Location</strong> already exists on the platform. Do you want to post it anyway?
          </p>
          <div className="flex gap-3">
            <button onClick={handleForceSave} className="btn-primary flex-1">Force Post</button>
            <button onClick={() => setDupPrompt(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-8 scrollbar-thin">
        <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2">
          {job ? 'Modify Job Posting' : 'Add New Job Posting'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="form-label">Job Title*</label>
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Senior Frontend Engineer"
              required
            />
          </div>

          {/* Company */}
          <div>
            <label className="form-label">Company Name*</label>
            <input
              className="form-input"
              value={form.company}
              onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))}
              placeholder="e.g. Google"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="form-label">Job Location</label>
            <input
              className="form-input"
              value={form.location}
              onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Remote / New York"
            />
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category</label>
            <input
              className="form-input"
              value={form.category}
              onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Engineering / Design"
            />
          </div>

          {/* Salary Min */}
          <div>
            <label className="form-label">Salary Min ($)</label>
            <input
              type="number"
              className="form-input"
              value={form.salaryMin}
              onChange={(e) => setForm(p => ({ ...p, salaryMin: e.target.value }))}
              placeholder="e.g. 80000"
            />
          </div>

          {/* Salary Max */}
          <div>
            <label className="form-label">Salary Max ($)</label>
            <input
              type="number"
              className="form-input"
              value={form.salaryMax}
              onChange={(e) => setForm(p => ({ ...p, salaryMax: e.target.value }))}
              placeholder="e.g. 120000"
            />
          </div>

          {/* Contract Type */}
          <div>
            <label className="form-label">Contract Type</label>
            <select
              className="form-select"
              value={form.contractType}
              onChange={(e) => setForm(p => ({ ...p, contractType: e.target.value }))}
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>

          {/* Apply URL */}
          <div>
            <label className="form-label">Apply URL</label>
            <input
              type="url"
              className="form-input"
              value={form.applyUrl}
              onChange={(e) => setForm(p => ({ ...p, applyUrl: e.target.value }))}
              placeholder="e.g. https://careers.company.com/apply"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="form-label">Description / Job Details*</label>
          <textarea
            className="form-textarea h-32"
            value={form.description}
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Write role requirements and job descriptions here..."
            required
          />
        </div>

        {/* Flags */}
        <div className="flex gap-6 select-none pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm(p => ({ ...p, isFeatured: e.target.checked }))}
              className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="text-slate-300 text-xs font-semibold">Featured Posting</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) => setForm(p => ({ ...p, isPinned: e.target.checked }))}
              className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="text-slate-300 text-xs font-semibold">Pin to Top</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-3 border-t border-white/10">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Publish Listing'}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Job Manager Page ────────────────────────────────────────
export default function AdminJobsPage() {
  const [data, setData]               = useState({ jobs: [], total: 0, pages: 1 });
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [contractType, setContractType] = useState('all');
  const [filterType, setFilterType]   = useState('all');
  const [sortBy, setSortBy]           = useState('createdAt');
  const [sortDir, setSortDir]         = useState('desc');
  const [viewMode, setViewMode]       = useState('table'); // 'table' | 'cards'
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  
  // Modals & Drawer state
  const [activePreviewJob, setActivePreviewJob] = useState(null);
  const [editJob, setEditJob]                   = useState(null);
  const [addModalOpen, setAddModalOpen]         = useState(false);
  const [deleteJobObj, setDeleteJobObj]         = useState(null);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);

  const fileInputRef = useRef(null);
  const dropdownRef  = useRef(null);

  // Fetch jobs stats & paginated listings
  const fetchStats = useCallback(async () => {
    try {
      const s = await getAdminJobStats();
      setStats(s);
    } catch { /* ignore */ }
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAdminJobs({
        page, limit: 10, search, contractType, filterType, sortBy, sortDir
      });
      setData(d);
    } catch {
      toast.error('Failed to load job listings.');
    } finally {
      setLoading(false);
    }
  }, [page, search, contractType, filterType, sortBy, sortDir]);

  useEffect(() => {
    fetchJobs();
    fetchStats();
  }, [fetchJobs, fetchStats]);

  // Click outside bulk dropdown
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowBulkDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleUpdate = () => {
    fetchJobs();
    fetchStats();
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminJob(id);
      toast.success('Job listing deleted.');
      setDeleteJobObj(null);
      handleUpdate();
    } catch {
      toast.error('Delete failed.');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedJobIds.length === 0) return;
    try {
      await bulkAdminJobsAction(action, selectedJobIds);
      toast.success(`Bulk operation ${action} completed.`);
      setSelectedJobIds([]);
      setShowBulkDropdown(false);
      handleUpdate();
    } catch {
      toast.error('Bulk action failed.');
    }
  };

  // Selection Checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedJobIds(data.jobs.map(j => j._id));
    } else {
      setSelectedJobIds([]);
    }
  };

  const handleSelectRow = (jobId) => {
    setSelectedJobIds(p =>
      p.includes(jobId) ? p.filter(id => id !== jobId) : [...p, jobId]
    );
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(p => p === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  // CSV Export utility
  const exportToCSV = () => {
    if (data.jobs.length === 0) {
      toast.error("No job listings available to export.");
      return;
    }
    const headers = ['ID', 'Title', 'Company', 'Location', 'Contract Type', 'Category', 'Salary Min', 'Salary Max', 'Featured', 'Pinned', 'Archived'];
    const rows = data.jobs.map(j => [
      j._id,
      j.title,
      j.company,
      j.location,
      j.contractType,
      j.category,
      j.salaryMin ?? '',
      j.salaryMax ?? '',
      j.isFeatured ? 'Yes' : 'No',
      j.isPinned ? 'Yes' : 'No',
      j.isArchived ? 'Yes' : 'No'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jobs_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import parser (client-side runner)
  const handleImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length <= 1) {
        toast.error("CSV file is empty or missing content.");
        return;
      }

      // Read header mapping
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const parsedJobs = [];

      for (let i = 1; i < lines.length; i++) {
        // Basic comma parsing (safe for quoted strings)
        const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!matches || matches.length < headers.length) continue;

        const row = matches.map(val => val.trim().replace(/^["']|["']$/g, ''));
        const jobObj = {};
        
        headers.forEach((h, idx) => {
          const val = row[idx];
          if (h === 'title') jobObj.title = val;
          if (h === 'company') jobObj.company = val;
          if (h === 'location') jobObj.location = val;
          if (h === 'description') jobObj.description = val;
          if (h === 'applyUrl') jobObj.applyUrl = val;
          if (h === 'category') jobObj.category = val;
          if (h === 'contractType') jobObj.contractType = val;
        });

        if (jobObj.title && jobObj.company && jobObj.description) {
          parsedJobs.push(jobObj);
        }
      }

      if (parsedJobs.length === 0) {
        toast.error("Failed to parse valid job details from CSV file. Ensure columns: title, company, description exist.");
        return;
      }

      toast.loading(`Importing ${parsedJobs.length} job postings...`);

      let successCount = 0;
      for (const pJob of parsedJobs) {
        try {
          await createAdminJob({ ...pJob, ignoreDuplicate: true });
          successCount++;
        } catch { /* ignore single error */ }
      }

      toast.dismiss();
      toast.success(`Import completed: ${successCount} out of ${parsedJobs.length} listings published.`);
      handleUpdate();
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = null;
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-6 relative">

      {/* Slide-out Job Preview Drawer overlay */}
      {activePreviewJob && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" onClick={() => setActivePreviewJob(null)} />
          <JobPreviewDrawer job={activePreviewJob} onClose={() => setActivePreviewJob(null)} />
        </>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Job Listings Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Publish custom job listings, modify pin lists, and import CSV bulk data</p>
        </div>
        
        {/* Actions buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm hover:bg-white/10 hover:border-white/15 transition-all font-medium"
            title="Import CSV"
          >
            <Upload size={14} />
            Import CSV
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm hover:bg-white/10 hover:border-white/15 transition-all font-medium"
            title="Export CSV"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm hover:bg-brand-500 transition-colors font-medium"
          >
            <Plus size={14} />
            Add Job
          </button>
        </div>
      </div>

      {/* ── Statistics Summary Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><Briefcase size={16} /></div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Active</p>
            <p className="text-white text-lg font-bold">{stats?.totalJobs ?? 0}</p>
          </div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Pin size={16} /></div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Pinned Listings</p>
            <p className="text-white text-lg font-bold">{stats?.pinnedJobs ?? 0}</p>
          </div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><Star size={16} /></div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Featured Listings</p>
            <p className="text-white text-lg font-bold">{stats?.featuredJobs ?? 0}</p>
          </div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-500/10 text-slate-400"><Archive size={16} /></div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Archived Postings</p>
            <p className="text-white text-lg font-bold">{stats?.archivedJobs ?? 0}</p>
          </div>
        </div>
      </div>

      {/* ── Advanced Filters & Layout Toggles ────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="form-input pl-10"
              placeholder="Search by job title or company name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          
          {/* Filters */}
          <select className="form-select w-full sm:w-44" value={contractType} onChange={(e) => { setContractType(e.target.value); setPage(1); }}>
            <option value="all">All Contract Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
            <option value="temporary">Temporary</option>
          </select>
          
          <select className="form-select w-full sm:w-44" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="all">All Postings</option>
            <option value="featured">Featured Only</option>
            <option value="pinned">Pinned Only</option>
            <option value="archived">Archived Only</option>
          </select>

          {/* Bulk Actions Menu dropdown */}
          {selectedJobIds.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowBulkDropdown(!showBulkDropdown)}
                className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm hover:bg-brand-500 w-full sm:w-auto"
              >
                Bulk Action ({selectedJobIds.length})
                <MoreHorizontal size={14} />
              </button>

              {showBulkDropdown && (
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#12122a] border border-white/10 rounded-xl shadow-xl z-20 p-1 divide-y divide-white/5">
                  <div className="py-1">
                    <button onClick={() => handleBulkAction('pin')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                      <Pin size={12} className="text-amber-400 fill-amber-400" /> Pin Listings
                    </button>
                    <button onClick={() => handleBulkAction('unpin')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                      <EyeOff size={12} className="text-slate-400" /> Unpin Listings
                    </button>
                  </div>
                  <div className="py-1">
                    <button onClick={() => handleBulkAction('feature')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                      <Star size={12} className="text-purple-400 fill-purple-400" /> Feature Listings
                    </button>
                    <button onClick={() => handleBulkAction('unfeature')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                      <Star size={12} className="text-slate-400" /> Unfeature Listings
                    </button>
                  </div>
                  <div className="py-1">
                    <button onClick={() => handleBulkAction('archive')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                      <Archive size={12} className="text-orange-400" /> Archive Listings
                    </button>
                    <button onClick={() => handleBulkAction('unarchive')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                      <Briefcase size={12} className="text-blue-400" /> Restore Listings
                    </button>
                  </div>
                  <div className="py-1 pt-1">
                    <button onClick={() => handleBulkAction('delete')} className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg flex items-center gap-2">
                      <Trash2 size={12} /> Delete Listings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grid/List Layout Toggles */}
        <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/8 self-end sm:self-auto flex-shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            title="Table View"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            title="Grid View"
          >
            <Grid size={15} />
          </button>
        </div>
      </div>

      {/* ── Job Postings Lists ───────────────────────────────── */}
      {viewMode === 'cards' ? (
        // Grid View
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5 bg-white/[0.02] border-white/[0.04] animate-pulse space-y-4">
                <div className="h-4 bg-white/5 rounded w-2/3" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
                <div className="h-10 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : data.jobs.length === 0 ? (
          <div className="card p-12 text-center text-slate-500">No job listings found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.jobs.map(job => (
              <div key={job._id} className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between group">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-white font-bold text-sm leading-snug line-clamp-1 group-hover:text-brand-400 transition-colors">{job.title}</h4>
                    <div className="flex gap-1 flex-shrink-0 mt-0.5">
                      {job.isPinned && <Pin size={12} className="text-amber-400 fill-amber-400" title="Pinned" />}
                      {job.isFeatured && <Star size={12} className="text-purple-400 fill-purple-400" title="Featured" />}
                      {job.isArchived && <Archive size={12} className="text-orange-400" title="Archived" />}
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs font-medium">{job.company}</p>
                  <p className="text-slate-500 text-xs flex items-center gap-1"><MapPin size={11} /> {job.location}</p>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 pt-2">{job.description}</p>
                </div>
                
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/[0.04] flex-shrink-0">
                  <ContractBadge type={job.contractType} />
                  <div className="flex items-center gap-1">
                    <button onClick={() => setActivePreviewJob(job)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Preview"><Eye size={13} /></button>
                    <button onClick={() => setEditJob(job)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Edit"><Edit3 size={13} /></button>
                    <button onClick={() => setDeleteJobObj(job)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Table View
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={data.jobs.length > 0 && selectedJobIds.length === data.jobs.length}
                      onChange={handleSelectAll}
                      disabled={data.jobs.length === 0}
                      className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('title')}>
                    <span className="flex items-center gap-1.5">Job Title <ArrowUpDown size={12} /></span>
                  </th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('company')}>
                    <span className="flex items-center gap-1.5">Company <ArrowUpDown size={12} /></span>
                  </th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Location</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Type</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Category</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('createdAt')}>
                    <span className="flex items-center gap-1.5">Posted <ArrowUpDown size={12} /></span>
                  </th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-center"><div className="h-4 w-4 bg-white/5 rounded animate-pulse mx-auto" /></td>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.jobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-slate-500 py-10">No job listings found matching filters.</td>
                  </tr>
                ) : (
                  data.jobs.map(job => {
                    const isChecked = selectedJobIds.includes(job._id);
                    return (
                      <tr key={job._id} className={`hover:bg-white/3 transition-colors ${isChecked ? 'bg-brand-600/5' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectRow(job._id)}
                            className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium truncate max-w-[180px]">{job.title}</span>
                            <div className="flex gap-1 flex-shrink-0">
                              {job.isPinned && <Pin size={11} className="text-amber-400 fill-amber-400" title="Pinned" />}
                              {job.isFeatured && <Star size={11} className="text-purple-400 fill-purple-400" title="Featured" />}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-medium">{job.company}</td>
                        <td className="px-4 py-3 text-slate-400">{job.location}</td>
                        <td className="px-4 py-3"><ContractBadge type={job.contractType} /></td>
                        <td className="px-4 py-3 text-slate-400">{job.category}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{new Date(job.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setActivePreviewJob(job)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Preview"><Eye size={13} /></button>
                            <button onClick={() => setEditJob(job)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit"><Edit3 size={13} /></button>
                            <button onClick={() => setDeleteJobObj(job)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete"><Trash2 size={13} /></button>
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
      )}

      {/* Modals & Dialog overlays */}
      {addModalOpen && (
        <JobFormModal onSave={handleUpdate} onClose={() => setAddModalOpen(false)} />
      )}
      
      {editJob && (
        <JobFormModal job={editJob} onSave={handleUpdate} onClose={() => setEditJob(null)} />
      )}
      
      {deleteJobObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              Confirm Deletion
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Are you sure you want to permanently delete job posting <strong className="text-white">{deleteJobObj.title}</strong> at <strong className="text-white">{deleteJobObj.company}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleDelete(deleteJobObj._id)} className="btn-danger flex-1">Delete Listing</button>
              <button onClick={() => setDeleteJobObj(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
