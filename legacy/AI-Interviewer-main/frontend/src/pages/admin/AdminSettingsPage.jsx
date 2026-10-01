/**
 * pages/admin/AdminSettingsPage.jsx
 *
 * System Settings Configuration Workspace.
 * Segmented into tabs:
 *  - Tab 1: General (app metadata, maintenance toggle, contacts, socials).
 *  - Tab 2: Security & Keys (expiry dates, secret API tokens, rate throttlers).
 *  - Tab 3: AI Engine (Groq models selection, temperatures, token heights).
 *  - Tab 4: Cloud Storage (Providers routing: local disk, Cloudinary, AWS S3 buckets).
 *  - Tab 5: Feature Flags (Turn on/off system modules like ATS, career coach, scraper).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Key, Sparkles, Database, ToggleLeft, Save, Loader2,
  Globe, Info, Shield, HelpCircle, Link
} from 'lucide-react';
import { getAdminSettings, saveAdminSettings } from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'ai' | 'storage' | 'features'

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Unified Form settings state
  const [form, setForm] = useState({
    general: {
      appName: 'AI Interviewer',
      logo: '',
      theme: 'dark',
      maintenanceMode: false,
      supportEmail: 'support@interview.ai',
      supportPhone: '+1 (555) 019-2834',
      socialLinks: { github: '', twitter: '', linkedin: '' },
    },
    security: {
      jwtExpiry: '7d',
      apiKeys: { groq: '', stripe: '', adzunaId: '', adzunaKey: '' },
      rateLimits: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
    },
    ai: {
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      maxTokens: 1024,
    },
    storage: {
      provider: 'local',
      cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
      aws: { bucket: '', region: '', accessKey: '', secretKey: '' },
    },
    featureFlags: {
      enableJobs: true,
      enableScraper: true,
      enableATS: true,
      enableCoach: true,
    },
  });

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getAdminSettings();
      if (s) {
        setForm(s);
      }
    } catch {
      toast.error('Failed to load system settings configurations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Submit Handler
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveAdminSettings(form);
      toast.success('System settings saved successfully.');
    } catch {
      toast.error('Error saving settings changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 relative">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage global configurations, API integrations, LLM engines, and toggle module visibilities</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="card p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-3 card p-6 h-96 bg-white/5 animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ── Sidebar Tabs selector ──────────────────────────────── */}
          <div className="space-y-2 lg:sticky lg:top-4">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-2.5 transition-all text-xs font-semibold
                ${activeTab === 'general'
                  ? 'bg-brand-600/10 border-brand-500/30 text-white shadow-lg'
                  : 'bg-[#0f0f22]/30 border-white/[0.06] text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
            >
              <Settings size={14} /> General Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-2.5 transition-all text-xs font-semibold
                ${activeTab === 'security'
                  ? 'bg-brand-600/10 border-brand-500/30 text-white shadow-lg'
                  : 'bg-[#0f0f22]/30 border-white/[0.06] text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
            >
              <Key size={14} /> Security & API Keys
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-2.5 transition-all text-xs font-semibold
                ${activeTab === 'ai'
                  ? 'bg-brand-600/10 border-brand-500/30 text-white shadow-lg'
                  : 'bg-[#0f0f22]/30 border-white/[0.06] text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
            >
              <Sparkles size={14} /> AI Parameters
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('storage')}
              className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-2.5 transition-all text-xs font-semibold
                ${activeTab === 'storage'
                  ? 'bg-brand-600/10 border-brand-500/30 text-white shadow-lg'
                  : 'bg-[#0f0f22]/30 border-white/[0.06] text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
            >
              <Database size={14} /> Cloud Storage
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-2.5 transition-all text-xs font-semibold
                ${activeTab === 'features'
                  ? 'bg-brand-600/10 border-brand-500/30 text-white shadow-lg'
                  : 'bg-[#0f0f22]/30 border-white/[0.06] text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
            >
              <ToggleLeft size={14} /> Feature Flags
            </button>

            {/* Save Button */}
            <div className="pt-4 border-t border-white/[0.06] mt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-xs font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving Settings...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Configurations
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Active Tab Workspace Panel ───────────────────────── */}
          <div className="lg:col-span-3 card p-6 bg-[#0f0f22]/30 border-white/[0.06] space-y-6">
            
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2 border-b border-white/10 pb-2">
                  <Settings size={16} className="text-slate-400" />
                  General Application Configurations
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Platform Name</label>
                    <input
                      className="form-input"
                      value={form.general.appName}
                      onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, appName: e.target.value } }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Logo Asset URL</label>
                    <input
                      className="form-input"
                      value={form.general.logo}
                      onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, logo: e.target.value } }))}
                      placeholder="e.g. https://logo.domain.com/logo.png"
                    />
                  </div>

                  <div>
                    <label className="form-label">System Active Theme</label>
                    <select
                      className="form-select"
                      value={form.general.theme}
                      onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, theme: e.target.value } }))}
                    >
                      <option value="dark">Standard Dark Mode</option>
                      <option value="light">Standard Light Mode</option>
                    </select>
                  </div>

                  {/* Maintenance Mode */}
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.general.maintenanceMode}
                        onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, maintenanceMode: e.target.checked } }))}
                        className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-slate-300 text-xs font-semibold">Enable Maintenance Mode (Halts candidate portal)</span>
                    </label>
                  </div>

                  <div>
                    <label className="form-label">Support Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={form.general.supportEmail}
                      onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, supportEmail: e.target.value } }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Support Help Phone</label>
                    <input
                      className="form-input"
                      value={form.general.supportPhone}
                      onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, supportPhone: e.target.value } }))}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.04] space-y-3">
                  <h4 className="text-white text-xs font-semibold flex items-center gap-1.5"><Link size={13} className="text-slate-400" /> Social Profile Integrations</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">GitHub</label>
                      <input
                        className="form-input text-xs"
                        value={form.general.socialLinks.github}
                        onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, socialLinks: { ...p.general.socialLinks, github: e.target.value } } }))}
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div>
                      <label className="form-label">Twitter</label>
                      <input
                        className="form-input text-xs"
                        value={form.general.socialLinks.twitter}
                        onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, socialLinks: { ...p.general.socialLinks, twitter: e.target.value } } }))}
                        placeholder="https://twitter.com/..."
                      />
                    </div>
                    <div>
                      <label className="form-label">LinkedIn</label>
                      <input
                        className="form-input text-xs"
                        value={form.general.socialLinks.linkedin}
                        onChange={(e) => setForm(p => ({ ...p, general: { ...p.general, socialLinks: { ...p.general.socialLinks, linkedin: e.target.value } } }))}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2 border-b border-white/10 pb-2">
                  <Shield size={16} className="text-slate-400" />
                  Security Protocols & Integration Keys
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">JWT Token Expiry (Days/Hours)</label>
                    <input
                      className="form-input"
                      value={form.security.jwtExpiry}
                      onChange={(e) => setForm(p => ({ ...p, security: { ...p.security, jwtExpiry: e.target.value } }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Groq API Key (AI Client Access)</label>
                    <input
                      type="password"
                      className="form-input"
                      value={form.security.apiKeys.groq}
                      onChange={(e) => setForm(p => ({ ...p, security: { ...p.security, apiKeys: { ...p.security.apiKeys, groq: e.target.value } } }))}
                      placeholder="gsk_..."
                    />
                  </div>

                  <div>
                    <label className="form-label">Stripe Private Key (Payment Gateway)</label>
                    <input
                      type="password"
                      className="form-input"
                      value={form.security.apiKeys.stripe}
                      onChange={(e) => setForm(p => ({ ...p, security: { ...p.security, apiKeys: { ...p.security.apiKeys, stripe: e.target.value } } }))}
                      placeholder="sk_test_..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="form-label">Adzuna App ID</label>
                      <input
                        className="form-input text-xs"
                        value={form.security.apiKeys.adzunaId}
                        onChange={(e) => setForm(p => ({ ...p, security: { ...p.security, apiKeys: { ...p.security.apiKeys, adzunaId: e.target.value } } }))}
                      />
                    </div>
                    <div>
                      <label className="form-label">Adzuna Key</label>
                      <input
                        type="password"
                        className="form-input text-xs"
                        value={form.security.apiKeys.adzunaKey}
                        onChange={(e) => setForm(p => ({ ...p, security: { ...p.security, apiKeys: { ...p.security.apiKeys, adzunaKey: e.target.value } } }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">API Throttler window (Minutes)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.security.rateLimits.windowMs / 60 / 1000}
                      onChange={(e) => setForm(p => ({ ...p, security: { ...p.security, rateLimits: { ...p.security.rateLimits, windowMs: (parseInt(e.target.value) || 15) * 60 * 1000 } } }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Max Requests per Window</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.security.rateLimits.maxRequests}
                      onChange={(e) => setForm(p => ({ ...p, security: { ...p.security, rateLimits: { ...p.security.rateLimits, maxRequests: parseInt(e.target.value) || 100 } } }))}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AI Settings */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2 border-b border-white/10 pb-2">
                  <Sparkles size={16} className="text-slate-400" />
                  AI Models & Hyperparameter Presets
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Default LLM Model Name</label>
                    <input
                      className="form-input font-mono text-xs"
                      value={form.ai.model}
                      onChange={(e) => setForm(p => ({ ...p, ai: { ...p.ai, model: e.target.value } }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">LLM Temperature ({form.ai.temperature})</label>
                    <input
                      type="range"
                      min="0"
                      max="2.0"
                      step="0.05"
                      className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer mt-3"
                      value={form.ai.temperature}
                      onChange={(e) => setForm(p => ({ ...p, ai: { ...p.ai, temperature: parseFloat(e.target.value) } }))}
                    />
                  </div>

                  <div>
                    <label className="form-label">LLM Max Completion Tokens</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.ai.maxTokens}
                      onChange={(e) => setForm(p => ({ ...p, ai: { ...p.ai, maxTokens: parseInt(e.target.value) || 1024 } }))}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Storage Settings */}
            {activeTab === 'storage' && (
              <div className="space-y-4">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2 border-b border-white/10 pb-2">
                  <Database size={16} className="text-slate-400" />
                  Upload Storage Buckets Routing
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="form-label">Primary Active Provider</label>
                    <select
                      className="form-select"
                      value={form.storage.provider}
                      onChange={(e) => setForm(p => ({ ...p, storage: { ...p.storage, provider: e.target.value } }))}
                    >
                      <option value="local">Local Disk Node storage</option>
                      <option value="cloudinary">Cloudinary Asset Server</option>
                      <option value="s3">AWS S3 Simple Storage Buckets</option>
                    </select>
                  </div>

                  {/* Cloudinary credentials */}
                  {form.storage.provider === 'cloudinary' && (
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white/2 rounded-xl border border-white/[0.04]">
                      <div className="sm:col-span-3 text-xs text-indigo-400 font-semibold mb-1">Cloudinary Access Keys</div>
                      <div>
                        <label className="form-label">Cloud Name</label>
                        <input className="form-input text-xs" value={form.storage.cloudinary.cloudName} onChange={(e) => setForm(p => ({ ...p, storage: { ...p.storage, cloudinary: { ...p.storage.cloudinary, cloudName: e.target.value } } }))} />
                      </div>
                      <div>
                        <label className="form-label">API Key</label>
                        <input className="form-input text-xs" value={form.storage.cloudinary.apiKey} onChange={(e) => setForm(p => ({ ...p, storage: { ...p.storage, cloudinary: { ...p.storage.cloudinary, apiKey: e.target.value } } }))} />
                      </div>
                      <div>
                        <label className="form-label">API Secret</label>
                        <input type="password" className="form-input text-xs" value={form.storage.cloudinary.apiSecret} onChange={(e) => setForm(p => ({ ...p, storage: { ...p.storage, cloudinary: { ...p.storage.cloudinary, apiSecret: e.target.value } } }))} />
                      </div>
                    </div>
                  )}

                  {/* AWS S3 credentials */}
                  {form.storage.provider === 's3' && (
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white/2 rounded-xl border border-white/[0.04]">
                      <div className="sm:col-span-2 text-xs text-indigo-400 font-semibold mb-1">AWS Simple Storage Bucket Configs</div>
                      <div>
                        <label className="form-label">Bucket Name</label>
                        <input className="form-input text-xs" value={form.storage.aws.bucket} onChange={(e) => setForm(p => ({ ...p, storage: { ...p.storage, aws: { ...p.storage.aws, bucket: e.target.value } } }))} />
                      </div>
                      <div>
                        <label className="form-label">Region Code</label>
                        <input className="form-input text-xs" value={form.storage.aws.region} onChange={(e) => setForm(p => ({ ...p, storage: { ...p.storage, aws: { ...p.storage.aws, region: e.target.value } } }))} placeholder="e.g. us-east-1" />
                      </div>
                      <div>
                        <label className="form-label">AWS Access Key</label>
                        <input className="form-input text-xs" value={form.storage.aws.accessKey} onChange={(e) => setForm(p => ({ ...p, storage: { ...p.storage, aws: { ...p.storage.aws, accessKey: e.target.value } } }))} />
                      </div>
                      <div>
                        <label className="form-label">AWS Secret Key</label>
                        <input type="password" className="form-input text-xs" value={form.storage.aws.secretKey} onChange={(e) => setForm(p => ({ ...p, storage: { ...p.storage, aws: { ...p.storage.aws, secretKey: e.target.value } } }))} />
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Feature Flags settings */}
            {activeTab === 'features' && (
              <div className="space-y-4">
                <h3 className="text-white text-sm font-semibold flex items-center gap-2 border-b border-white/10 pb-2">
                  <ToggleLeft size={16} className="text-slate-400" />
                  Application Active Modules
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white">Jobs Module</p>
                      <p className="text-[10px] text-slate-500">Enable searching, applying and matching custom postings</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.featureFlags.enableJobs}
                      onChange={(e) => setForm(p => ({ ...p, featureFlags: { ...p.featureFlags, enableJobs: e.target.checked } }))}
                      className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white">Adzuna Job Scraper</p>
                      <p className="text-[10px] text-slate-500">Enable background sync timers imports lists</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.featureFlags.enableScraper}
                      onChange={(e) => setForm(p => ({ ...p, featureFlags: { ...p.featureFlags, enableScraper: e.target.checked } }))}
                      className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white">ATS Evaluator Scorer</p>
                      <p className="text-[10px] text-slate-500">Allows candidates to test resume matching scores</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.featureFlags.enableATS}
                      onChange={(e) => setForm(p => ({ ...p, featureFlags: { ...p.featureFlags, enableATS: e.target.checked } }))}
                      className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white">Interactive Career Coach</p>
                      <p className="text-[10px] text-slate-500">Renders AI feedback advice chats dashboards</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.featureFlags.enableCoach}
                      onChange={(e) => setForm(p => ({ ...p, featureFlags: { ...p.featureFlags, enableCoach: e.target.checked } }))}
                      className="w-4 h-4 bg-surface-card border-slate-600 rounded text-brand-600 focus:ring-brand-500"
                    />
                  </label>
                </div>
              </div>
            )}

          </div>

        </form>
      )}

    </div>
  );
}
