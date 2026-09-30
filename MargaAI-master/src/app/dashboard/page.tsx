'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useDashboard } from './DashboardContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SkillGraph = dynamic(() => import('@/components/SkillGraph'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center">Initializing Graph...</div>
});

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, userId, activeDomain, setSelectedNodeId } = useDashboard();
  
  const [activeObjective, setActiveObjective] = useState<string>('Loading...');
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [skillBreakdown, setSkillBreakdown] = useState<Record<string, { completed: number, total: number }>>({});
  const [milestones, setMilestones] = useState<any[]>([]);

  const [learnerStats, setLearnerStats] = useState({ auraPoints: 0, streakDays: 0, auraTier: '...', activitiesDone: 0, createdAt: '' });
  const [nodeCountStr, setNodeCountStr] = useState('0 / 0');
  const [totalNodes, setTotalNodes] = useState(0);
  const [completedNodes, setCompletedNodes] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.stats) {
          setLearnerStats(data.stats);
        }
      })
      .catch(console.error);
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!activeDomain) return;
    setActiveObjective('Loading...');
    fetch(`/api/dashboard/graph?domain=${encodeURIComponent(activeDomain)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.graphData) {
          const nodes = data.graphData.nodes || [];
          if (nodes.length === 0) {
            setActiveObjective('No Nodes');
            return;
          }
          const completed = nodes.filter((n: any) => n.status === 'completed' || n.status === 'test-out').length;
          setCompletionPercentage(Math.round((completed / nodes.length) * 100));
          setNodeCountStr(`${completed} / ${nodes.length}`);
          setTotalNodes(nodes.length);
          setCompletedNodes(completed);
          
          const breakdown: Record<string, { completed: number, total: number }> = {};
          for (const n of nodes) {
            const cat = n.category || 'Foundations';
            if (!breakdown[cat]) breakdown[cat] = { completed: 0, total: 0 };
            breakdown[cat].total++;
            if (n.status === 'completed' || n.status === 'test-out') {
              breakdown[cat].completed++;
            }
          }
          setSkillBreakdown(breakdown);

          const objective = nodes.find((n: any) => n.status === 'in-progress') || nodes.find((n: any) => n.status === 'unlocked');
          if (objective) {
            setActiveObjective(objective.label || objective.id);
            setActiveObjectiveId(objective.id);
          } else {
            setActiveObjective('Domain Mastered');
            setActiveObjectiveId(null);
          }
        }
      })
      .catch(console.error);

    // Fetch Milestones
    fetch(`/api/dashboard/milestones?domain=${encodeURIComponent(activeDomain)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.milestones) {
          setMilestones(data.milestones);
        }
      })
      .catch(console.error);
  }, [activeDomain]);

  useEffect(() => {
    if (!learnerStats.createdAt || totalNodes === 0) return;
    
    const sorted = [...milestones].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const data = [];
    
    // Day 0
    data.push({
      date: new Date(learnerStats.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      mastery: 0
    });
    
    let currentMastery = 0;
    for (let i = 0; i < sorted.length; i++) {
      currentMastery = Math.round(((i + 1) / totalNodes) * 100);
      data.push({
        date: new Date(sorted[i].createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        mastery: currentMastery
      });
    }
    
    if (sorted.length > 0) {
      const lastDate = new Date(sorted[sorted.length - 1].createdAt).toDateString();
      const today = new Date().toDateString();
      if (lastDate !== today) {
        data.push({
          date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          mastery: currentMastery
        });
      }
    }
    
    setChartData(data);
  }, [milestones, learnerStats.createdAt, totalNodes]);

  if (!isLoaded || !activeDomain) {
    return <div className="w-full h-[80vh] flex items-center justify-center text-gradient text-xl font-bold">Loading Aura...</div>;
  }

  return (
    <>
      {/* Active Objective Widget */}
      <div className="w-full max-w-6xl mx-auto px-6 mb-8 mt-4">
        <div className="glass-card rounded-2xl z-20 shadow-sm border border-black/10 pointer-events-auto w-full bg-white">
          <div className="p-2 px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-bold border border-black/20 px-2 py-0.5 text-[var(--text-secondary)] bg-white uppercase rounded">Active Objective</span>
                <span className="material-symbols-outlined text-[var(--text-secondary)] text-sm">target</span>
                <div className="text-xs font-bold text-[var(--text-tertiary)] ml-2 border-l border-black/10 pl-3">COMPLETION: <span className="text-[var(--brand-blue-navy)]">{completionPercentage}%</span></div>
              </div>
              <div className="flex items-end gap-4">
                <h2 className="text-xl font-bold tracking-tight text-[var(--brand-slate-deep)] m-0">{activeObjective}</h2>
                <button 
                  className="hover:opacity-90 transition-all flex items-center group shadow-sm flex-shrink-0 cursor-pointer"
                  onClick={() => activeObjectiveId && router.push(`/module/${activeObjectiveId}`)}
                  disabled={!activeObjectiveId}
                  style={{
                    backgroundColor: 'var(--brand-blue-navy)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    padding: '5px 13px',
                    borderRadius: '9999px',
                    gap: '5px',
                    lineHeight: '1',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>ENTER MODULE</span>
                  <span 
                    className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform" 
                    style={{ fontSize: '13px', lineHeight: 1, display: 'inline-block' }}
                  >
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
            
            <div className="w-px h-16 bg-black/10 hidden md:block"></div>
            
            <div className="flex items-center gap-8 md:pl-2">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-0.5">Aura Points</span>
                <span className="font-bold text-blue-600 leading-none tracking-tighter text-2xl">{learnerStats.auraPoints} AP</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-0.5">Streak</span>
                <div className="flex items-center gap-1 text-[var(--text-primary)]">
                  <span className="material-symbols-outlined text-orange-500 text-[20px]">local_fire_department</span>
                  <span className="font-bold text-base">{learnerStats.streakDays} Days</span>
                </div>
              </div>
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-0.5">Tier</span>
                <div className="flex items-center gap-1 text-[var(--text-primary)]">
                  <span className="material-symbols-outlined text-purple-600 text-[20px]">military_tech</span>
                  <span className="font-bold text-base">{learnerStats.auraTier}</span>
                </div>
              </div>
              <div className="flex flex-col items-end hidden xl:flex">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-0.5">Nodes</span>
                <div className="flex items-center gap-1 text-[var(--text-primary)]">
                  <span className="material-symbols-outlined text-cyan-600 text-[20px]">share</span>
                  <span className="font-bold text-base">{nodeCountStr}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className="w-full max-w-6xl mx-auto px-6 mb-32">
        <div 
          className="relative w-full h-[60vh] min-h-[450px] flex items-center justify-center border border-black/10 rounded-[32px] overflow-hidden shadow-sm"
          style={{
            backgroundColor: '#FAFAFA',
            backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        >
          <SkillGraph learnerId={userId!} ambient={false} domain={activeDomain} onNodeSelect={setSelectedNodeId} />
        </div>
        <p className="text-center text-sm font-medium text-[var(--text-tertiary)] mt-4 mb-2 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[16px]">touch_app</span>
          Click on the nodes to interact with them and explore your learning path.
        </p>
      </div>

      {/* Below Fold Content */}
      <div className="px-6 max-w-6xl mx-auto w-full flex flex-col gap-12">
        
        {/* Learning Analytics Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Your Learning Analytics</h4>
              <h2 className="text-3xl font-black text-[var(--brand-slate-deep)] tracking-tight m-0">Progress</h2>
            </div>
            <button className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/5 transition-colors cursor-pointer">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>sync</span>
            </button>
          </div>



          {/* Graph Card */}
          <div className="glass-card bg-white p-6 pb-2 rounded-2xl border border-black/10 shadow-sm w-full h-[350px] flex flex-col">
            <h3 className="text-base font-bold text-[var(--brand-slate-deep)] mb-4">Mastery over time</h3>
            <div className="flex-1 w-full min-h-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500 }}
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '13px' }}
                      itemStyle={{ color: 'var(--brand-blue-navy)' }}
                      formatter={(value: any) => [`${value}%`, 'Mastery']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mastery" 
                      stroke="var(--brand-blue-navy)" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: 'var(--brand-blue-navy)', strokeWidth: 2, stroke: 'white' }}
                      activeDot={{ r: 6, fill: 'var(--brand-blue-sky)', stroke: 'white', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-[var(--text-tertiary)]">
                  Loading graph data...
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-4 px-2 text-center md:text-left">
            * <strong>How is Mastery calculated?</strong> Your mastery score represents the percentage of modules you have successfully completed in this path. Every time you pass a module's final quiz or test out of a topic, your overall mastery increases!
          </p>
        </section>

        {/* Skill Breakdown */}
        <section>
          <h2 className="text-2xl mb-8 flex items-center gap-3 font-bold text-[var(--brand-slate-deep)]">
            <span className="material-symbols-outlined text-[var(--text-tertiary)]">analytics</span>
            Skill Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {Object.entries(skillBreakdown).map(([category, stats]) => {
              const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
              return (
                <div key={category} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{category}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{percentage}%</span>
                  </div>
                  <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: percentage === 100 ? '#16A34A' : '#2563EB' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Completed Chapters */}
        <section>
          <h2 className="text-2xl mb-8 flex items-center gap-3 font-bold text-[var(--brand-slate-deep)]">
            <span className="material-symbols-outlined text-[var(--text-tertiary)]">task_alt</span>
            Recent Milestones
          </h2>
          <div className="flex flex-col gap-3">
            {milestones.length === 0 ? (
              <div className="text-[var(--text-tertiary)] text-sm">No milestones reached in this path yet.</div>
            ) : (
              milestones.map((milestone, idx) => (
                <div key={milestone.id || idx} className="glass-card flex items-center justify-between group hover:bg-white/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    <span className="font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      {milestone.nodeLabel}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)] font-bold">
                    {new Date(milestone.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
