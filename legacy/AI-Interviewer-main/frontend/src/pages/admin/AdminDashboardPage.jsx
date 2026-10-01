/**
 * pages/admin/AdminDashboardPage.jsx
 *
 * Fully-featured Admin Dashboard Home.
 * Displays platform-wide statistics, interactive growth & revenue trends,
 * active mock session distributions, user activity logs, quick system actions,
 * and standard system error reports.
 *
 * Utilizes recharts for clean data visualizations.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Briefcase, MessageSquare, FileText,
  TrendingUp, UserCheck, Star, Activity,
  ArrowRight, RefreshCw, DollarSign, AlertCircle,
  Shield, CheckCircle2, UserPlus, Play, Terminal, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { getAdminStats } from '@/services/admin.service';
import toast from 'react-hot-toast';

// ─── Stat Card Component ──────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, to }) => {
  const colors = {
    blue:    'from-blue-600/15 to-blue-600/5 border-blue-500/20 text-blue-400',
    purple:  'from-purple-600/15 to-purple-600/5 border-purple-500/20 text-purple-400',
    emerald: 'from-emerald-600/15 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    orange:  'from-orange-600/15 to-orange-600/5 border-orange-500/20 text-orange-400',
    red:     'from-red-600/15 to-red-600/5 border-red-500/20 text-red-400',
    amber:   'from-amber-600/15 to-amber-600/5 border-amber-500/20 text-amber-400',
    teal:    'from-teal-600/15 to-teal-600/5 border-teal-500/20 text-teal-400',
    indigo:  'from-indigo-600/15 to-indigo-600/5 border-indigo-500/20 text-indigo-400',
  };

  return (
    <Link
      to={to || '#'}
      className={`block bg-gradient-to-br ${colors[color] || colors.blue} border rounded-2xl p-5 hover:scale-[1.01] hover:border-white/15 transition-all duration-200 group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl bg-white/5">
          <Icon size={18} />
        </div>
        {to && <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight mb-1">
        {value !== undefined ? value : <span className="animate-pulse bg-white/10 rounded h-7 w-12 inline-block" />}
      </p>
      <p className="text-slate-400 text-xs font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </Link>
  );
};

// ─── Custom Recharts Tooltip ──────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121225] border border-white/10 p-3 rounded-xl shadow-xl">
        <p className="text-slate-400 text-xs font-semibold mb-1">{label}</p>
        {payload.map((item, index) => (
          <p key={index} className="text-white text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color || item.fill }} />
            {item.name}: <span className="font-bold">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">Key metrics, transaction records, and candidate activity</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm hover:bg-white/10 hover:border-white/15 disabled:opacity-50 transition-all font-medium self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {/* ── Primary Statistics (8 metrics) ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers}
          sub={`${stats?.newUsersThisWeek ?? 0} new registrations`}
          color="blue"
          to="/admin/users"
        />
        <StatCard
          icon={Star}
          label="Premium Users"
          value={stats?.premiumUsers}
          sub="Paid subscriptions"
          color="amber"
          to="/admin/users"
        />
        <StatCard
          icon={UserCheck}
          label="Free Users"
          value={stats?.freeUsers}
          sub="Basic tier plan"
          color="indigo"
          to="/admin/users"
        />
        <StatCard
          icon={DollarSign}
          label="Estimated Monthly Revenue"
          value={stats?.totalRevenue ? `$${stats.totalRevenue}` : undefined}
          sub="Derived billing value"
          color="emerald"
          to="/admin/payments"
        />
        <StatCard
          icon={Activity}
          label="Interviews Today"
          value={stats?.interviewsToday}
          sub="Mock sessions scheduled"
          color="red"
          to="/admin/interviews"
        />
        <StatCard
          icon={Briefcase}
          label="Total Interviews"
          value={stats?.totalInterviews}
          sub="All-time generated"
          color="purple"
          to="/admin/interviews"
        />
        <StatCard
          icon={Briefcase}
          label="Active Jobs"
          value={stats?.jobsCount}
          sub="Available Listings"
          color="teal"
          to="/admin/jobs"
        />
        <StatCard
          icon={FileText}
          label="Total Applications"
          value={stats?.applicationsCount}
          sub="Sessions & resume parsed"
          color="orange"
          to="/admin/resumes"
        />
      </div>

      {/* ── Graphical Trends Section ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* User Growth Chart */}
        <div className="card p-5 bg-[#0f0f22]/50 border-white/[0.06]">
          <h3 className="text-white text-sm font-semibold mb-4">User Registrations</h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full w-full bg-white/[0.02] animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.charts?.userGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="users" name="Users" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#userGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Platform Revenue Chart */}
        <div className="card p-5 bg-[#0f0f22]/50 border-white/[0.06]">
          <h3 className="text-white text-sm font-semibold mb-4">Monthly Revenue Trends</h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full w-full bg-white/[0.02] animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.charts?.revenue} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="amount" name="Revenue ($)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#revGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Total Interviews Chart */}
        <div className="card p-5 bg-[#0f0f22]/50 border-white/[0.06]">
          <h3 className="text-white text-sm font-semibold mb-4">Interview Setup Growth</h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full w-full bg-white/[0.02] animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.charts?.interviews} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Interviews" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Daily Activity Chart */}
        <div className="card p-5 bg-[#0f0f22]/50 border-white/[0.06]">
          <h3 className="text-white text-sm font-semibold mb-4">Weekly Engagement Matrix</h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full w-full bg-white/[0.02] animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.charts?.dailyActivity} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="sessions" name="Sessions Run" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="users" name="Active Candidates" stroke="#06b6d4" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── System Details Section (Activity, Actions, Errors) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 card p-5 bg-[#0f0f22]/50 border-white/[0.06] flex flex-col h-[400px]">
          <h3 className="text-white text-sm font-semibold mb-3 flex-shrink-0">Recent Platform Activity</h3>
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 pt-3.5 first:pt-0">
                  <div className="w-8 h-8 rounded bg-white/5 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 animate-pulse rounded w-1/3" />
                    <div className="h-2.5 bg-white/5 animate-pulse rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : !stats?.activities || stats.activities.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs py-8">
                No recent activity recorded
              </div>
            ) : (
              stats.activities.map((act, index) => (
                <div key={act.id} className={`flex items-start gap-3 pt-3.5 first:pt-0`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                    ${act.type === 'user' ? 'bg-blue-500/10 text-blue-400' :
                      act.type === 'session' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-orange-500/10 text-orange-400'}`}>
                    {act.type === 'user' ? <Users size={14} /> :
                     act.type === 'session' ? <CheckCircle2 size={14} /> :
                     <FileText size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-xs font-semibold truncate">{act.title}</p>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{act.message}</p>
                    {act.score !== undefined && act.score !== null && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        Score: {act.score}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions & Recent Errors */}
        <div className="space-y-6 flex flex-col h-[400px]">

          {/* Quick System Actions */}
          <div className="card p-5 bg-[#0f0f22]/50 border-white/[0.06]">
            <h3 className="text-white text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/admin/users" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-slate-300 text-xs font-medium transition-colors">
                <UserPlus size={13} className="text-blue-400" />
                Manage Users
              </Link>
              <Link to="/admin/settings" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-slate-300 text-xs font-medium transition-colors">
                <Shield size={13} className="text-purple-400" />
                System Audit
              </Link>
              <Link to="/admin/jobs" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-slate-300 text-xs font-medium transition-colors">
                <Play size={13} className="text-emerald-400" />
                Sync Listings
              </Link>
              <Link to="/admin/settings" className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-slate-300 text-xs font-medium transition-colors">
                <Terminal size={13} className="text-orange-400" />
                Error Logs
              </Link>
            </div>
          </div>

          {/* System Error Logs */}
          <div className="card p-5 bg-[#0f0f22]/50 border-white/[0.06] flex-1 flex flex-col overflow-hidden">
            <h3 className="text-white text-sm font-semibold mb-3 flex-shrink-0">Recent Warnings & Logs</h3>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-white/5 animate-pulse space-y-1.5">
                    <div className="h-2.5 bg-white/5 animate-pulse rounded w-1/4" />
                    <div className="h-2.5 bg-white/5 animate-pulse rounded w-3/4" />
                  </div>
                ))
              ) : (
                stats?.recentErrors?.map((err) => (
                  <div key={err.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5">
                    <AlertCircle size={14} className={`flex-shrink-0 mt-0.5
                      ${err.severity === 'error' ? 'text-red-400' :
                        err.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">{err.service}</span>
                        <span className="text-[8px] text-slate-500">• {new Date(err.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-normal break-words">{err.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
