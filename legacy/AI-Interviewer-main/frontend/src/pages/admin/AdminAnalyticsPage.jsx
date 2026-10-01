/**
 * pages/admin/AdminAnalyticsPage.jsx
 *
 * Full-scale AI Interviewer Platform Analytics Dashboard.
 * Visualizes user growth signups, monthly revenue generation,
 * session performance ratings, and weekly candidate retention cohorts.
 * Includes time-range selectors and raw JSON compile exports actions.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  BarChart2, Calendar, Download, Sparkles, TrendingUp,
  Percent, Star, Briefcase, Activity, Loader2
} from 'lucide-react';
import { getAdminAnalytics } from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function AdminAnalyticsPage() {
  const [range, setRange]       = useState('30d');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);

  // Fetch metrics data based on range
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminAnalytics({ range });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch {
      toast.error('Failed to load platform analytics report.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Export full JSON report
  const handleExportReport = () => {
    if (!data) return toast.error('No analytics report compiled to export.');

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `platform_analytics_report_${range}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('JSON analytical report compiled and downloaded.');
  };

  const metrics = data?.metrics || {};
  const trends  = data?.trends || {};
  const cohort  = data?.retention || [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 relative">

      {/* ── Header & Filters ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track growth trends, mock session completions, conversation feedback scores, and monthly revenue flows</p>
        </div>

        {/* Filters and Export tools */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-shrink-0">
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              className="form-select text-xs pl-8 pr-8 py-2"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="7d">Range: Last 7 Days</option>
              <option value="30d">Range: Last 30 Days</option>
              <option value="90d">Range: Last 90 Days</option>
              <option value="1y">Range: Last 1 Year</option>
            </select>
          </div>

          <button
            onClick={handleExportReport}
            disabled={loading || !data}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 hover:text-indigo-400"
          >
            <Download size={13} />
            Export Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="animate-spin text-brand-500" size={32} />
          <span className="text-slate-500 text-xs font-semibold">Aggregating platform datasets...</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Analytical Metrics Cards ───────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* User Growth */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-500 text-xs font-semibold">Candidates Registered</span>
                <p className="text-2xl font-bold text-white mt-1 leading-none">{metrics.totalCandidates ?? 0}</p>
                <p className="text-[10px] text-indigo-400">Premium: {metrics.premiumCandidates ?? 0}</p>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Conversions rate */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-500 text-xs font-semibold">Premium Conversion Rate</span>
                <p className="text-2xl font-bold text-white mt-1 leading-none">{metrics.conversionRate ?? 0}%</p>
                <p className="text-[10px] text-slate-500">Subscribers / Total ratio</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <Percent size={20} />
              </div>
            </div>

            {/* Mock completion rate */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-500 text-xs font-semibold">Session Completion Rate</span>
                <p className="text-2xl font-bold text-white mt-1 leading-none">{metrics.completionRate ?? 0}%</p>
                <p className="text-[10px] text-slate-500">{metrics.completedSessionsCount ?? 0} finished attempts</p>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400">
                <Activity size={20} />
              </div>
            </div>

            {/* Average Mock Score */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-500 text-xs font-semibold">Average Mock Rating</span>
                <p className="text-2xl font-bold text-white mt-1 leading-none">{metrics.averageMockScore ?? 0}/100</p>
                <p className="text-[10px] text-amber-400">Candidate evaluations rating</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                <Star size={20} />
              </div>
            </div>

          </div>

          {/* ── Charts Grid section ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Chart 1: User Growth Area Chart */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] space-y-4">
              <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-400" />
                Signups Growth Curve
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends.users} margin={{ left: -20, top: 10, right: 10 }}>
                    <defs>
                      <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#14142a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Area type="monotone" dataKey="count" name="Signups" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#userGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Revenue Bar Chart */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] space-y-4">
              <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" />
                Platform Billing Income
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends.revenue} margin={{ left: -20, top: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} unit="$" />
                    <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']} contentStyle={{ backgroundColor: '#14142a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Mock sessions runs Line Chart */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] space-y-4">
              <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-teal-400" />
                Candidate Mock Attempts
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.sessions} margin={{ left: -20, top: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#14142a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Line type="monotone" dataKey="count" name="Attempts Started" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Job listings imports Bar Chart */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] space-y-4">
              <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={14} className="text-blue-400" />
                Scrape Jobs Imports Growth
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends.jobs} margin={{ left: -20, top: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#14142a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Bar dataKey="count" name="Jobs Posted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Weekly Retention Cohort Bar Chart */}
            <div className="card p-5 bg-[#0f0f22]/30 border-white/[0.06] space-y-4 lg:col-span-2">
              <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Percent size={14} className="text-violet-400" />
                Candidate Engagement Cohort Retention
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cohort} layout="vertical" margin={{ left: 10, top: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} unit="%" domain={[0, 100]} />
                    <YAxis type="category" dataKey="cohort" stroke="#64748b" fontSize={10} width={90} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Retention Rate']} contentStyle={{ backgroundColor: '#14142a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Bar dataKey="rate" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
