/**
 * pages/admin/AdminScraperPage.jsx
 *
 * Job Scraper Control Dashboard.
 * Manages scraper scheduling settings, country filters, remote tags,
 * keyword lists, manual triggers, and scraper historical trace logs.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Play, Pause, Save, Loader2, AlertCircle, CheckCircle,
  Plus, X, Terminal, Clock, Settings, FileText, Globe
} from 'lucide-react';
import {
  getAdminScraperStatus, updateAdminScraperSettings, triggerAdminScrape,
  pauseAdminScraper, resumeAdminScraper, getAdminScraperLogs
} from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function AdminScraperPage() {
  const [config, setConfig]       = useState(null);
  const [schedulerRunning, setSchedRunning] = useState(false);
  
  const [logs, setLogs]           = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logPage, setLogPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [loading, setLoading]     = useState(true);
  const [savingSettings, setSaving] = useState(false);
  const [triggeringScrape, setTriggeringScrape] = useState(false);

  // Settings form local state
  const [interval, setIntervalVal] = useState(60);
  const [maxJobs, setMaxJobs]       = useState(50);
  const [country, setCountry]       = useState('us');
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [keywords, setKeywords]     = useState([]);
  const [newKeyword, setNewKeyword] = useState('');

  // Fetch status and configuration
  const fetchStatus = useCallback(async () => {
    try {
      const res = await getAdminScraperStatus();
      if (res.success && res.data) {
        const c = res.data.config;
        setConfig(c);
        setSchedRunning(res.data.schedulerRunning);
        setIntervalVal(c.scrapeInterval);
        setMaxJobs(c.maxJobs);
        setCountry(c.country);
        setRemoteOnly(c.remoteOnly);
        setKeywords(c.keywords || []);
      }
    } catch {
      toast.error('Failed to load scraper configurations.');
    }
  }, []);

  // Fetch logs history list
  const fetchLogs = useCallback(async () => {
    try {
      const data = await getAdminScraperLogs({ page: logPage, limit: 8 });
      setLogs(data.logs || []);
      setTotalLogs(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch {
      toast.error('Failed to retrieve scraper logs.');
    }
  }, [logPage]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchLogs()]);
    setLoading(false);
  }, [fetchStatus, fetchLogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic poll of status and logs (helps monitor background runs)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 12000); // 12 seconds
    return () => clearInterval(timer);
  }, [fetchStatus, fetchLogs]);

  // Handle manual run trigger
  const handleTriggerScrape = async () => {
    if (config?.status === 'running') return;
    setTriggeringScrape(true);
    try {
      await triggerAdminScrape();
      toast.success('Job scraper task triggered. Check logs for updates.');
      fetchStatus();
      fetchLogs();
    } catch {
      toast.error('Trigger failure.');
    } finally {
      setTriggeringScrape(false);
    }
  };

  // Pause / Resume scheduler
  const handleToggleScheduler = async () => {
    try {
      if (config?.isActiveScheduler) {
        await pauseAdminScraper();
        toast.success('Scheduler paused.');
      } else {
        await resumeAdminScraper();
        toast.success('Scheduler resumed.');
      }
      fetchStatus();
    } catch {
      toast.error('Toggle scheduler action failed.');
    }
  };

  // Save Settings Form
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateAdminScraperSettings({
        scrapeInterval: parseInt(interval) || 60,
        maxJobs: parseInt(maxJobs) || 50,
        keywords,
        country: country.toLowerCase().trim(),
        remoteOnly,
      });
      toast.success('Configurations saved successfully.');
      fetchStatus();
    } catch {
      toast.error('Error saving scraper configurations.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Keywords management
  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords(p => [...p, kw]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw) => {
    setKeywords(p => p.filter(k => k !== kw));
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 relative">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Job Scraper Control</h1>
        <p className="text-slate-400 text-sm mt-0.5">Configure Adzuna sync queues, modify keyword pipelines, and trigger scraping operations</p>
      </div>

      {/* ── Status & Actions Grid ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Scheduler Status widget */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" />
                Scheduler Details
              </h3>
              
              {/* Scheduler state badge */}
              {config?.isActiveScheduler ? (
                <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                  <CheckCircle size={10} /> Active
                </span>
              ) : (
                <span className="badge bg-slate-500/20 text-slate-400 border border-slate-500/30 flex items-center gap-1.5">
                  <Pause size={10} /> Paused
                </span>
              )}
            </div>

            <div className="space-y-2 mt-2">
              <div className="flex justify-between border-b border-white/[0.04] pb-2 text-xs">
                <span className="text-slate-500">Scheduler Service</span>
                <span className="text-slate-300 font-medium">{schedulerRunning ? 'Active Daemon' : 'Inactive'}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-2 text-xs">
                <span className="text-slate-500">Interval Settings</span>
                <span className="text-slate-300 font-medium">Every {config?.scrapeInterval} minutes</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-2 text-xs">
                <span className="text-slate-500">Last Scrape Triggered</span>
                <span className="text-slate-300 font-medium">
                  {config?.lastRun ? new Date(config.lastRun).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className={`font-semibold capitalize
                  ${config?.status === 'running' ? 'text-blue-400 animate-pulse' : 'text-slate-300'}`}>
                  {config?.status || 'idle'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-5 border-t border-white/[0.04] mt-5">
            <button
              onClick={handleTriggerScrape}
              disabled={config?.status === 'running' || triggeringScrape}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {config?.status === 'running' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Run Scraper Now
                </>
              )}
            </button>
            <button
              onClick={handleToggleScheduler}
              className={`btn-secondary flex-1 flex items-center justify-center gap-2 
                ${config?.isActiveScheduler ? 'hover:text-red-400 hover:bg-red-500/10' : 'hover:text-emerald-400 hover:bg-emerald-500/10'}`}
            >
              {config?.isActiveScheduler ? (
                <>
                  <Pause size={14} />
                  Pause Scheduler
                </>
              ) : (
                <>
                  <Play size={14} />
                  Resume Scheduler
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync Sources Panel */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex flex-col justify-between">
          <div>
            <h3 className="text-white text-sm font-semibold flex items-center gap-2 mb-4">
              <Globe size={16} className="text-blue-400" />
              Source Pipelines
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer">
                <div className="flex items-center gap-3">
                  <Globe size={15} className="text-blue-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Adzuna Jobs</p>
                    <p className="text-[10px] text-slate-500">API search connections</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Terminal size={15} className="text-slate-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">LinkedIn Web</p>
                    <p className="text-[10px] text-slate-500">HTML scraper pipeline</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled
                  className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 mt-4 leading-relaxed">
            API connections run deterministic mappings. Unlicensed web scraper triggers are disabled by default.
          </p>
        </div>
      </div>

      {/* ── Settings Form & Keywords Editor ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scraper Settings Form */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-2 card p-5 bg-[#0f0f22]/30 border-white/[0.06] space-y-4">
          <h3 className="text-white text-sm font-semibold flex items-center gap-2 border-b border-white/10 pb-2 flex-shrink-0">
            <Settings size={16} className="text-slate-400" />
            Configuration Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scrape Interval */}
            <div>
              <label className="form-label">Scrape Interval (Minutes)</label>
              <input
                type="number"
                min="5"
                className="form-input"
                value={interval}
                onChange={(e) => setIntervalVal(e.target.value)}
                required
              />
            </div>

            {/* Max Jobs */}
            <div>
              <label className="form-label">Max Jobs (per keyword/run)</label>
              <input
                type="number"
                min="5"
                className="form-input"
                value={maxJobs}
                onChange={(e) => setMaxJobs(e.target.value)}
                required
              />
            </div>

            {/* Country */}
            <div>
              <label className="form-label">Pipeline Country (Adzuna Code)</label>
              <input
                type="text"
                maxLength="2"
                className="form-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. us, gb, in"
                required
              />
            </div>

            {/* Remote Only */}
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-300 text-xs font-semibold">Remote Only Postings</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.04]">
            <button
              type="submit"
              disabled={savingSettings}
              className="btn-primary px-6 flex items-center justify-center gap-2"
            >
              {savingSettings ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Configurations
                </>
              )}
            </button>
          </div>
        </form>

        {/* Keywords Editor Card */}
        <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex flex-col justify-between">
          <div>
            <h3 className="text-white text-sm font-semibold flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
              <Terminal size={16} className="text-slate-400" />
              Keywords Pipeline
            </h3>

            {/* Keyword tags */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {keywords.length === 0 ? (
                <span className="text-xs text-slate-500">No active keywords configured.</span>
              ) : (
                keywords.map(kw => (
                  <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="text-slate-500 hover:text-white transition-colors" type="button">
                      <X size={10} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Add keyword input */}
          <div className="pt-4 border-t border-white/[0.04] mt-4 flex gap-2">
            <input
              className="form-input text-xs"
              placeholder="e.g. Docker, AWS…"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            />
            <button
              type="button"
              onClick={addKeyword}
              className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all flex-shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Historical Logs Table ────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 bg-white/3 flex items-center gap-2 flex-shrink-0">
          <FileText size={15} className="text-slate-400" />
          <h3 className="text-white font-semibold text-sm">Scraper Audit Log Sheet</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Start Time</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Duration</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Imported</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Updated</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Duplicates</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
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
                  <td colSpan={7} className="text-center text-slate-500 py-10">No scraper execution logs recorded yet.</td>
                </tr>
              ) : (
                logs.map(log => {
                  const duration = log.endTime
                    ? `${Math.round((new Date(log.endTime) - new Date(log.startTime)) / 1000)}s`
                    : '—';
                  
                  return (
                    <tr key={log._id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {new Date(log.startTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{duration}</td>
                      <td className="px-4 py-3">
                        {log.status === 'success' && (
                          <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Success</span>
                        )}
                        {log.status === 'failed' && (
                          <span className="badge bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>
                        )}
                        {log.status === 'running' && (
                          <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">Running</span>
                        )}
                        {log.status === 'interrupted' && (
                          <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">Interrupted</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-200">{log.jobsImported ?? 0}</td>
                      <td className="px-4 py-3 text-slate-300">{log.jobsUpdated ?? 0}</td>
                      <td className="px-4 py-3 text-slate-500">{log.duplicateCount ?? 0}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px]" title={log.error}>
                        {log.error ? (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertCircle size={12} /> {log.error}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <p className="text-slate-500 text-xs">Page {logPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <ChevronLeft size={15} />
              </button>
              <button disabled={logPage === totalPages} onClick={() => setLogPage(p => p + 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
