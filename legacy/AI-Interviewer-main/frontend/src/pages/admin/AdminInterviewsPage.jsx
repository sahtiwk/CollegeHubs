/**
 * pages/admin/AdminInterviewsPage.jsx
 *
 * Unified AI Interviews & Templates Manager.
 * Toggles between:
 *  - Tab 1: Candidate Interviews (Audit log of actual mock interviews run by candidates).
 *  - Tab 2: Interview Templates (Admins CRUD settings to configure system prompts, difficulty tiers, durations, and text-to-speech presets).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Trash2, ChevronLeft, ChevronRight, Briefcase, Plus, Edit3, Eye, FileText,
  Clock, Star, Volume2, Globe, Sparkles, Code, Play, X, ArrowLeft
} from 'lucide-react';
import {
  getAdminInterviews, deleteAdminInterview,
  getAdminTemplates, createAdminTemplate, updateAdminTemplate, deleteAdminTemplate
} from '@/services/admin.service';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  draft:       'badge-slate',
  ready:       'badge-brand',
  in_progress: 'badge-warning',
  completed:   'badge-success',
};

// ─── Prompt Preview Modal ─────────────────────────────────────────
function PromptPreviewModal({ template, onClose }) {
  const [activePromptTab, setActivePromptTab] = useState('system'); // 'system' | 'evaluation' | 'feedback'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <Code size={18} className="text-brand-400" />
            Prompt Inspector: {template.name}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Prompt type tabs */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/8">
          {['system', 'evaluation', 'feedback'].map(tab => (
            <button
              key={tab}
              onClick={() => setActivePromptTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors
                ${activePromptTab === tab ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab} Prompt
            </button>
          ))}
        </div>

        {/* Prompt content render */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/[0.04] text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto scrollbar-thin">
          {activePromptTab === 'system' && template.systemPrompt}
          {activePromptTab === 'evaluation' && template.evaluationPrompt}
          {activePromptTab === 'feedback' && template.feedbackPrompt}
        </div>

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button onClick={onClose} className="btn-secondary px-6">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Template Form Modal ─────────────────────────────────
function TemplateFormModal({ template, onSave, onClose }) {
  const [form, setForm] = useState({
    name:             template?.name || '',
    difficulty:       template?.difficulty || 'medium',
    duration:         template?.duration || 30,
    questionCount:    template?.questionCount || 5,
    language:         template?.language || 'en',
    voiceId:          template?.voiceId || 'alloy',
    voiceSpeed:       template?.voiceSpeed || 1.0,
    voicePitch:       template?.voicePitch || 1.0,
    systemPrompt:     template?.systemPrompt || '',
    evaluationPrompt: template?.evaluationPrompt || '',
    feedbackPrompt:   template?.feedbackPrompt || '',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (template?._id) {
        await updateAdminTemplate(template._id, form);
      } else {
        await createAdminTemplate(form);
      }
      toast.success('Interview Template saved successfully.');
      onSave();
      onClose();
    } catch {
      toast.error('Error saving template specifications.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-3xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin my-8">
        <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2">
          {template ? 'Edit Template Preset' : 'Create Preset Template'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="form-label">Template Name*</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Senior Backend Python Developer"
              required
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="form-label">Difficulty</label>
            <select
              className="form-select"
              value={form.difficulty}
              onChange={(e) => setForm(p => ({ ...p, difficulty: e.target.value }))}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="form-label">Duration (Minutes)</label>
            <input
              type="number"
              min="5"
              className="form-input"
              value={form.duration}
              onChange={(e) => setForm(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))}
              required
            />
          </div>

          {/* Question Count */}
          <div>
            <label className="form-label">Question Count</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={form.questionCount}
              onChange={(e) => setForm(p => ({ ...p, questionCount: parseInt(e.target.value) || 5 }))}
              required
            />
          </div>

          {/* Language */}
          <div>
            <label className="form-label">Language Code</label>
            <input
              type="text"
              className="form-input"
              value={form.language}
              onChange={(e) => setForm(p => ({ ...p, language: e.target.value }))}
              placeholder="e.g. en, fr, de"
              required
            />
          </div>

          {/* Voice ID */}
          <div>
            <label className="form-label">Voice Preset (OpenAI)</label>
            <select
              className="form-select"
              value={form.voiceId}
              onChange={(e) => setForm(p => ({ ...p, voiceId: e.target.value }))}
            >
              <option value="alloy">Alloy (Neut)</option>
              <option value="echo">Echo (Male)</option>
              <option value="fable">Fable (Male)</option>
              <option value="onyx">Onyx (Male)</option>
              <option value="nova">Nova (Fem)</option>
              <option value="shimmer">Shimmer (Fem)</option>
            </select>
          </div>

          {/* Voice Speed */}
          <div>
            <label className="form-label">Voice Speed ({form.voiceSpeed}x)</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"
              value={form.voiceSpeed}
              onChange={(e) => setForm(p => ({ ...p, voiceSpeed: parseFloat(e.target.value) }))}
            />
          </div>

          {/* Voice Pitch */}
          <div>
            <label className="form-label">Voice Pitch ({form.voicePitch}x)</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"
              value={form.voicePitch}
              onChange={(e) => setForm(p => ({ ...p, voicePitch: parseFloat(e.target.value) }))}
            />
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="form-label">System Prompt (Context Generator)*</label>
          <textarea
            className="form-textarea h-24 text-xs font-mono"
            value={form.systemPrompt}
            onChange={(e) => setForm(p => ({ ...p, systemPrompt: e.target.value }))}
            placeholder="Instruct the AI Interviewer model on its persona, tone, and skills domain..."
            required
          />
        </div>

        {/* Evaluation Prompt */}
        <div>
          <label className="form-label">Evaluation Prompt (Response Scorer)*</label>
          <textarea
            className="form-textarea h-24 text-xs font-mono"
            value={form.evaluationPrompt}
            onChange={(e) => setForm(p => ({ ...p, evaluationPrompt: e.target.value }))}
            placeholder="Instruct the model on how to evaluate the candidate's answers..."
            required
          />
        </div>

        {/* Feedback Prompt */}
        <div>
          <label className="form-label">Feedback Prompt (Session Analyzer)*</label>
          <textarea
            className="form-textarea h-24 text-xs font-mono"
            value={form.feedbackPrompt}
            onChange={(e) => setForm(p => ({ ...p, feedbackPrompt: e.target.value }))}
            placeholder="Instruct the model on generating overall summary reports at session end..."
            required
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-3 border-t border-white/10">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Publish Template'}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Main View Controller ─────────────────────────────────────────
export default function AdminInterviewsPage() {
  const [activeTab, setActiveTab]   = useState('interviews'); // 'interviews' | 'templates'
  
  // Tab 1: Interviews logs state
  const [data, setData]               = useState({ interviews: [], total: 0, pages: 1 });
  const [page, setPage]               = useState(1);
  const [delItem, setDelItem]         = useState(null);
  
  // Tab 2: Templates CRUD state
  const [templates, setTemplates]     = useState([]);
  const [tempPage, setTempPage]       = useState(1);
  const [tempTotal, setTempTotal]     = useState(0);
  const [tempPages, setTempPages]     = useState(1);
  const [activeInspector, setActiveInspector] = useState(null);
  const [activeFormTemplate, setActiveFormTemplate] = useState(null);
  const [tempAddOpen, setTempAddOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState(null);

  const [loading, setLoading]         = useState(true);

  // ─── Fetch Candidates Interviews Logs ────────────────────────────
  const fetchInterviews = useCallback(async () => {
    try {
      const d = await getAdminInterviews({ page, limit: 12 });
      setData(d);
    } catch {
      toast.error('Failed to load candidate interviews.');
    }
  }, [page]);

  // ─── Fetch Preset Templates ──────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await getAdminTemplates({ page: tempPage, limit: 8 });
      setTemplates(res.templates || []);
      setTempTotal(res.total || 0);
      setTempPages(res.pages || 1);
    } catch {
      toast.error('Failed to load preset templates.');
    }
  }, [tempPage]);

  // Loader dispatcher
  const loadActiveData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'interviews') {
      await fetchInterviews();
    } else {
      await fetchTemplates();
    }
    setLoading(false);
  }, [activeTab, fetchInterviews, fetchTemplates]);

  useEffect(() => {
    loadActiveData();
  }, [loadActiveData]);

  const handleDeleteInterview = async (id) => {
    try {
      await deleteAdminInterview(id);
      toast.success('Interview logs deleted.');
      setDelItem(null);
      fetchInterviews();
    } catch {
      toast.error('Deletion failed.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await deleteAdminTemplate(id);
      toast.success('Interview template preset removed.');
      setDeleteTemplateId(null);
      fetchTemplates();
    } catch {
      toast.error('Deletion failure.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 relative">

      {/* Prompts preview inspector portal */}
      {activeInspector && (
        <PromptPreviewModal template={activeInspector} onClose={() => setActiveInspector(null)} />
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Interview Manager</h1>
          <p className="text-slate-400 text-sm mt-0.5">Audit candidate interviews or configure default AI evaluator prompts and system voice presets</p>
        </div>
        
        {/* Tab Selector buttons */}
        <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/8 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => { setActiveTab('interviews'); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors
              ${activeTab === 'interviews' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Briefcase size={13} />
            Candidates Log ({data.total})
          </button>
          <button
            onClick={() => { setActiveTab('templates'); setTempPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors
              ${activeTab === 'templates' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Sparkles size={13} />
            AI Templates ({tempTotal})
          </button>
        </div>
      </div>

      {/* ── TAB 1: Candidates Logs View ───────────────────────── */}
      {activeTab === 'interviews' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Job / Company</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">User</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Level</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Questions</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Created</th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.interviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">No interviews log recorded on the platform.</td>
                  </tr>
                ) : (
                  data.interviews.map((iv) => (
                    <tr key={iv._id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[200px]">{iv.jobTitle}</p>
                        <p className="text-slate-500 text-xs">{iv.company || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 text-xs font-semibold">{iv.userId?.name ?? '—'}</p>
                        <p className="text-slate-500 text-[10px]">{iv.userId?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-slate-600/20 text-slate-300 border border-slate-500/30 capitalize">{iv.experienceLevel}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-300">{iv.numberOfQuestions}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_COLORS[iv.status] ?? 'badge-slate'} capitalize`}>
                          {iv.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(iv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDelItem(iv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete Logs"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* ── TAB 2: AI Templates Presets CRUD ───────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl">
            <p className="text-slate-400 text-xs">Manage pre-configured AI Interview Presets with voice settings and system logic</p>
            <button
              onClick={() => setTempAddOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs hover:bg-brand-500 font-semibold transition-colors"
            >
              <Plus size={13} />
              Create Preset
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-5 bg-white/[0.02] border-white/[0.04] animate-pulse space-y-4">
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                  <div className="h-10 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="card p-12 text-center text-slate-500">No template presets created yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map(temp => (
                <div key={temp._id} className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between group relative">
                  
                  {/* Info */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-white font-bold text-sm leading-snug line-clamp-2">{temp.name}</h4>
                      <span className={`badge flex-shrink-0 uppercase text-[9px] font-bold 
                        ${temp.difficulty === 'hard' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          temp.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {temp.difficulty}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5"><Clock size={11} className="text-indigo-400" /> {temp.duration} min</span>
                      <span className="flex items-center gap-1.5"><FileText size={11} className="text-teal-400" /> {temp.questionCount} Qs</span>
                      <span className="flex items-center gap-1.5"><Globe size={11} className="text-blue-400" /> Lang: {temp.language}</span>
                      <span className="flex items-center gap-1.5"><Volume2 size={11} className="text-orange-400" /> Voice: {temp.voiceId}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/[0.04] flex-shrink-0">
                    <button
                      onClick={() => setActiveInspector(temp)}
                      className="text-xs text-brand-400 font-semibold hover:text-brand-300 transition-colors flex items-center gap-1"
                    >
                      <Eye size={12} /> Inspect Prompts
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveFormTemplate(temp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit Template"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTemplateId(temp._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {tempPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 bg-white/2 rounded-xl">
              <p className="text-slate-500 text-xs">Page {tempPage} of {tempPages}</p>
              <div className="flex gap-2">
                <button disabled={tempPage === 1} onClick={() => setTempPage(p => p - 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                  <ChevronLeft size={15} />
                </button>
                <button disabled={tempPage === tempPages} onClick={() => setTempPage(p => p + 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-all">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Edit Overlays */}
      {delItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Trash2 className="text-red-500" size={18} />
              Delete Log Details?
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Are you sure you want to permanently delete candidate <strong className="text-white">{delItem.userId?.name}</strong>'s mock interview log: <strong className="text-white">{delItem.jobTitle}</strong>?
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleDeleteInterview(delItem._id)} className="btn-danger flex-1">Delete Log</button>
              <button onClick={() => setDelItem(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deleteTemplateId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14142a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Trash2 className="text-red-500" size={18} />
              Delete Template Preset?
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Are you sure you want to permanently delete this AI interview template? Candidates will no longer be able to select this pre-configured layout.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleDeleteTemplate(deleteTemplateId)} className="btn-danger flex-1">Delete Preset</button>
              <button onClick={() => setDeleteTemplateId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {tempAddOpen && (
        <TemplateFormModal onSave={fetchTemplates} onClose={() => setTempAddOpen(false)} />
      )}

      {activeFormTemplate && (
        <TemplateFormModal template={activeFormTemplate} onSave={fetchTemplates} onClose={() => setActiveFormTemplate(null)} />
      )}

    </div>
  );
}
