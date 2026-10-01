/**
 * pages/admin/AdminPromptsPage.jsx
 *
 * Prompt Editor & Version Control Dashboard.
 * Left panel: Selectable system-wide prompt categories.
 * Right panel: Full screen prompt editor, version auditing logs,
 * live preview mock parser, and restore selectors.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileCode, History, RefreshCw, Save, Clock, ArrowLeft,
  Sparkles, CheckCircle, Code, Eye, AlertCircle, ShieldAlert
} from 'lucide-react';
import {
  getAdminPrompts, getAdminPrompt, updateAdminPrompt, restoreAdminPromptVersion
} from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function AdminPromptsPage() {
  const [prompts, setPrompts]       = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);

  const [loading, setLoading]       = useState(true);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [restoring, setRestoring]   = useState(false);

  // Form inputs
  const [content, setContent]       = useState('');
  const [reason, setReason]         = useState('');

  // Live preview mockup vars
  const [previewVars, setPreviewVars] = useState({
    jobTitle:             'Senior React Developer',
    questionText:         'What is the difference between useMemo and useCallback in React?',
    expectedKeywordsText: 'memoization, function reference, performance optimization',
    answerText:           'useMemo memoizes the computed value of a function, whereas useCallback memoizes the actual function reference itself.',
    summary:              'Q1: What is memoization?\nScore: 9/10\nAnswer: Memoization caches function results based on inputs.'
  });
  const [previewOpen, setPreviewOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Fetch all prompt headers
  const fetchHeaders = useCallback(async (selectFirst = false) => {
    try {
      const list = await getAdminPrompts();
      setPrompts(list || []);
      if (selectFirst && list?.length > 0) {
        setSelectedId(list[0]._id);
      }
    } catch {
      toast.error('Failed to load prompts.');
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    await fetchHeaders(true);
    setLoading(false);
  }, [fetchHeaders]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Fetch full details when selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    const fetchDetail = async () => {
      setLoadingPrompt(true);
      try {
        const full = await getAdminPrompt(selectedId);
        setActivePrompt(full);
        setContent(full.content || '');
        setReason('');
      } catch {
        toast.error('Failed to load prompt details.');
      } finally {
        setLoadingPrompt(false);
      }
    };
    fetchDetail();
  }, [selectedId]);

  // Save prompt
  const handleSave = async (e) => {
    e.preventDefault();
    if (!content.trim()) return toast.error('Content cannot be empty.');
    setSaving(true);
    try {
      const updated = await updateAdminPrompt(selectedId, {
        content: content,
        changeReason: reason.trim() || 'Updated via Prompt Editor',
      });
      toast.success('Prompt saved successfully. Version bumped.');
      
      // Update in active details
      setActivePrompt(updated);
      setReason('');
      
      // Refresh sidebar list to update version labels
      fetchHeaders();
    } catch {
      toast.error('Error saving prompt changes.');
    } finally {
      setSaving(false);
    }
  };

  // Restore history version
  const handleRestore = async (ver) => {
    if (ver === activePrompt?.version) return toast.error('Selected version is already active.');
    setRestoring(true);
    try {
      const res = await restoreAdminPromptVersion(selectedId, ver);
      toast.success(`Prompt restored back to version v${ver}.`);
      setActivePrompt(res.prompt);
      setContent(res.prompt.content || '');
      setReason('');
      fetchHeaders();
    } catch {
      toast.error('Version restore failed.');
    } finally {
      setRestoring(false);
    }
  };

  // Live preview parser
  const getParsedPreview = () => {
    if (!content) return '';
    return content.replace(/\$\{(\w+)\}/g, (match, key) => {
      return previewVars[key] !== undefined ? previewVars[key] : match;
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 relative">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Prompt Management</h1>
        <p className="text-slate-400 text-sm mt-0.5">Customize system templates, manage prompt iterations, audit version history, and test substitutions</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="card p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-3 card p-6 h-96 bg-white/5 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ── Left panel: Categories List ────────────────────────── */}
          <div className="space-y-3 lg:sticky lg:top-4">
            <div className="px-1 text-slate-500 text-xs font-semibold uppercase tracking-wider">Prompt Categories</div>
            <div className="space-y-2">
              {prompts.map(p => {
                const isSelected = selectedId === p._id;
                return (
                  <button
                    key={p._id}
                    onClick={() => setSelectedId(p._id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5
                      ${isSelected
                        ? 'bg-brand-600/10 border-brand-500/30 text-white shadow-lg'
                        : 'bg-[#0f0f22]/30 border-white/[0.06] text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold truncate leading-tight">{p.name}</span>
                      <span className="badge bg-white/5 text-slate-400 border border-white/8 text-[9px] font-bold">
                        v{p.version}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 capitalize">{p.category?.replace('_', ' ')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right panel: Active Editor ─────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            
            {loadingPrompt || !activePrompt ? (
              <div className="card p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw size={24} className="animate-spin text-brand-500" />
                <span>Loading prompt specifications...</span>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Prompt Details and Editor */}
                <form onSubmit={handleSave} className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] space-y-5">
                  
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h2 className="text-white text-base font-bold flex items-center gap-2">
                        <FileCode size={18} className="text-brand-400" />
                        {activePrompt.name}
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">{activePrompt.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        Active Version: <strong className="text-white font-semibold">v{activePrompt.version}</strong>
                      </span>
                      {activePrompt.lastUpdatedBy && (
                        <span className="text-[10px] text-slate-600">
                          by {activePrompt.lastUpdatedBy.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Editor Textarea */}
                  <div>
                    <label className="form-label flex justify-between">
                      <span>System Prompt Instructions</span>
                      <span className="text-[10px] text-brand-400 font-mono flex items-center gap-1">
                        <Code size={10} /> Dynamic parameters supported: {'${variable}'}
                      </span>
                    </label>
                    <textarea
                      className="form-textarea h-80 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                    />
                  </div>

                  {/* Reason input and buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/[0.04] items-center">
                    <div className="sm:col-span-2">
                      <input
                        className="form-input text-xs"
                        placeholder="Explain change reason... (e.g. Added communication depth weightings)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary py-2.5 flex items-center justify-center gap-2 text-xs font-semibold"
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Save & Bump Version
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* ── Live Preview Panel ─────────────────────────────── */}
                <div className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(p => !p)}
                    className="w-full px-4 py-3 bg-white/2 hover:bg-white/4 border-b border-white/8 transition-colors flex items-center justify-between"
                  >
                    <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Eye size={13} className="text-indigo-400" />
                      Live Preview Interpolation
                    </h3>
                    <span className="text-[10px] text-slate-500">{previewOpen ? 'Hide Preview' : 'Show Preview'}</span>
                  </button>
                  
                  {previewOpen && (
                    <div className="p-5 bg-black/10 space-y-4">
                      
                      {/* Interactive mock inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Job Title ($&#123;jobTitle&#125;)</label>
                          <input className="form-input text-xs" value={previewVars.jobTitle} onChange={(e) => setPreviewVars(p => ({ ...p, jobTitle: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Question ($&#123;questionText&#125;)</label>
                          <input className="form-input text-xs" value={previewVars.questionText} onChange={(e) => setPreviewVars(p => ({ ...p, questionText: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Expected Keywords ($&#123;expectedKeywordsText&#125;)</label>
                          <input className="form-input text-xs" value={previewVars.expectedKeywordsText} onChange={(e) => setPreviewVars(p => ({ ...p, expectedKeywordsText: e.target.value }))} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Candidate Answer ($&#123;answerText&#125;)</label>
                          <input className="form-input text-xs" value={previewVars.answerText} onChange={(e) => setPreviewVars(p => ({ ...p, answerText: e.target.value }))} />
                        </div>
                        <div className="md:col-span-3">
                          <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Feedback Summary ($&#123;summary&#125;)</label>
                          <textarea className="form-textarea h-12 text-xs font-mono" value={previewVars.summary} onChange={(e) => setPreviewVars(p => ({ ...p, summary: e.target.value }))} />
                        </div>
                      </div>

                      {/* Rendered prompt view */}
                      <div className="space-y-1.5 pt-3 border-t border-white/[0.04]">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Rendered Context Output</span>
                        <div className="p-4 rounded-xl bg-[#0f0f22]/60 border border-white/[0.04] text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto scrollbar-thin">
                          {getParsedPreview()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Version Audit Log History ──────────────────────── */}
                <div className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(p => !p)}
                    className="w-full px-4 py-3 bg-white/2 hover:bg-white/4 border-b border-white/8 transition-colors flex items-center justify-between"
                  >
                    <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <History size={13} className="text-teal-400" />
                      Version Log Registry
                    </h3>
                    <span className="text-[10px] text-slate-500">{historyOpen ? 'Hide Logs' : 'Show Logs'}</span>
                  </button>

                  {historyOpen && (
                    <div className="overflow-x-auto bg-black/10">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/8 bg-white/2">
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Version</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Modified</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Editor</th>
                            <th className="text-left text-slate-400 font-medium px-4 py-3">Change Note</th>
                            <th className="text-right text-slate-400 font-medium px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {activePrompt.history?.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-slate-500 py-6 text-xs">No previous versions registered.</td>
                            </tr>
                          ) : (
                            [...activePrompt.history].reverse().map((h) => {
                              const isActive = h.version === activePrompt.version;
                              return (
                                <tr key={h._id || h.version} className={`hover:bg-white/2 transition-colors ${isActive ? 'bg-brand-600/5' : ''}`}>
                                  <td className="px-4 py-3 font-mono text-xs">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold 
                                      ${isActive ? 'bg-brand-500/20 text-brand-400 border border-brand-500/20' : 'bg-white/5 text-slate-400 border border-white/8'}`}>
                                      v{h.version}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 text-xs">
                                    {new Date(h.updatedAt).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-slate-300 text-xs">
                                    {h.updatedBy?.name || 'Super Admin'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 text-xs font-medium max-w-sm truncate" title={h.changeReason}>
                                    {h.changeReason}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {isActive ? (
                                      <span className="text-[10px] text-emerald-400 font-semibold px-2 py-1 flex items-center justify-end gap-1">
                                        <CheckCircle size={10} /> Active
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleRestore(h.version)}
                                        disabled={restoring}
                                        className="text-xs text-brand-400 font-semibold hover:text-brand-300 transition-colors"
                                      >
                                        Revert to v{h.version}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
