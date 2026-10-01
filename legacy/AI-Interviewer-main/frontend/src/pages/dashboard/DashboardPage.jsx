import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, ClipboardList, TrendingUp, Star,
  Plus, ChevronRight, Clock, Building2
} from 'lucide-react';
import { userAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-6 flex items-start gap-4"
  >
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-3xl font-display font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  </motion.div>
);

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getDashboard()
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scoreData = [
    { name: 'Score', value: stats?.averageScore ?? 0, fill: '#6366f1' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">
            Good day, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h2>
          <p className="text-slate-400 mt-1">Ready to practice? Let&apos;s crush your next interview.</p>
        </div>
        <Link to="/interviews/new" className="btn-primary hidden sm:inline-flex">
          <Plus className="w-4 h-4" />
          New Interview
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardList} label="Total Interviews" color="bg-brand-600/20 text-brand-400"
          value={loading ? '—' : stats?.totalSessions ?? 0}
          sub="All time sessions"
        />
        <StatCard
          icon={Trophy} label="Completed" color="bg-emerald-600/20 text-emerald-400"
          value={loading ? '—' : stats?.completedSessions ?? 0}
          sub="Finished sessions"
        />
        <StatCard
          icon={TrendingUp} label="Avg. Score" color="bg-violet-600/20 text-violet-400"
          value={loading ? '—' : `${stats?.averageScore ?? 0}%`}
          sub="Across all sessions"
        />
        <StatCard
          icon={Star} label="Best Score" color="bg-amber-600/20 text-amber-400"
          value={loading ? '—' : `${stats?.bestScore ?? 0}%`}
          sub="Personal best"
        />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <div className="card p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Average Performance</h3>
          <ResponsiveContainer width="100%" height={160}>
            <RadialBarChart innerRadius="60%" outerRadius="90%" data={scoreData} startAngle={90} endAngle={-270}>
              <RadialBar background={{ fill: '#2a2a4a' }} dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-4xl font-display font-bold gradient-text -mt-4">
            {stats?.averageScore ?? 0}%
          </p>
          <p className="text-slate-500 text-xs mt-1">Overall score</p>
        </div>

        {/* Recent Sessions */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white">Recent Sessions</h3>
            <Link to="/sessions" className="btn-ghost text-xs">View all <ChevronRight className="w-3 h-3" /></Link>
          </div>

          {!stats?.recentSessions?.length ? (
            <div className="text-center py-10">
              <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No sessions yet</p>
              <Link to="/interviews/new" className="btn-primary mt-4 inline-flex">Start practicing</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentSessions.map((session) => (
                <Link
                  key={session._id}
                  to={`/sessions/${session._id}/results`}
                  className="flex items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-600/20 rounded-lg">
                      <Building2 className="w-4 h-4 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{session.interviewId?.jobTitle}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${session.overallScore >= 70 ? 'badge-success' : session.overallScore >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                      {session.overallScore}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/interviews/new', icon: Plus, label: 'Create Interview', desc: 'Setup a new mock session', color: 'from-brand-600 to-violet-600' },
            { to: '/resumes', icon: ClipboardList, label: 'Upload Resume', desc: 'Add your latest resume', color: 'from-emerald-600 to-teal-600' },
            { to: '/sessions', icon: TrendingUp, label: 'View Progress', desc: 'Review past performance', color: 'from-amber-600 to-orange-600' },
          ].map(({ to, icon: Icon, label, desc, color }) => (
            <Link key={to} to={to}
              className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-surface-border hover:border-brand-500/50 hover:bg-surface-hover transition-all group"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${color} flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
