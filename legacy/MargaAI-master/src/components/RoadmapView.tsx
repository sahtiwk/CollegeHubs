import React, { useMemo } from 'react';

const statusColors: Record<string, { bg: string, text: string, border: string }> = {
  locked: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },
  unlocked: { bg: '#EFF6FF', text: '#1E3A8A', border: '#BFDBFE' },
  'in-progress': { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
  completed: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  'test-out': { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A' }
};

export default function RoadmapView({ graphData, onNodeClick }: { graphData: { nodes: any[], links: any[] }, onNodeClick: (node: any, e: any) => void }) {
  
  const tiers = useMemo(() => {
    // 1. Calculate in-degrees and build adjacency list
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};
    
    graphData.nodes.forEach(n => {
      inDegree[n.id] = 0;
      adjList[n.id] = [];
    });
    
    graphData.links.forEach(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      if (adjList[sourceId]) {
        adjList[sourceId].push(targetId);
      }
      if (inDegree[targetId] !== undefined) {
        inDegree[targetId]++;
      }
    });

    // 2. Topological sort with levels
    let currentLevelNodes = graphData.nodes.filter(n => inDegree[n.id] === 0);
    const levels: any[][] = [];
    const processed = new Set<string>();

    while (currentLevelNodes.length > 0) {
      levels.push(currentLevelNodes);
      currentLevelNodes.forEach(n => processed.add(n.id));
      
      const nextLevelNodes: any[] = [];
      currentLevelNodes.forEach(n => {
        adjList[n.id].forEach(targetId => {
          inDegree[targetId]--;
          if (inDegree[targetId] === 0) {
            const targetNode = graphData.nodes.find(node => node.id === targetId);
            if (targetNode) nextLevelNodes.push(targetNode);
          }
        });
      });
      
      currentLevelNodes = nextLevelNodes;
      
      // Safety break to prevent infinite loops from cycles
      if (levels.length > 100) break;
    }
    
    // Add any remaining nodes that were caught in cycles
    const remaining = graphData.nodes.filter(n => !processed.has(n.id));
    if (remaining.length > 0) {
      levels.push(remaining);
    }
    
    return levels;
  }, [graphData]);

  return (
    <div className="w-full h-full overflow-y-auto p-8 relative flex flex-col items-center">
      {/* Center line */}
      <div className="absolute top-16 bottom-16 w-1 bg-black/10 left-1/2 -translate-x-1/2 z-0 rounded-full" />
      
      <div className="z-10 w-full max-w-4xl flex flex-col gap-16 pb-12" style={{ paddingTop: '120px' }}>
        {tiers.map((tier, tierIndex) => (
          <div key={tierIndex} className="flex flex-col items-center gap-8 relative">
            <div className="bg-white border-2 border-black/10 px-6 py-2 text-sm font-bold text-[var(--text-tertiary)] uppercase rounded-full shadow-sm z-10 bg-white">
              Tier {tierIndex + 1}
            </div>
            <div className="flex flex-wrap justify-center gap-8 w-full z-10">
              {tier.map(node => {
                const colors = statusColors[node.status] || statusColors.locked;
                return (
                  <div 
                    key={node.id} 
                    onClick={(e) => onNodeClick(node, e)}
                    className="bg-white border-2 rounded-2xl shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md flex flex-col relative group"
                    style={{ borderColor: colors.border, width: '360px', padding: '24px', gap: '20px' }}
                  >
                    {/* Status Badge */}
                    <div 
                      className="absolute -top-3 -right-3 text-[10px] font-bold px-3 py-1 rounded-full uppercase border shadow-sm"
                      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                    >
                      {node.status.replace('-', ' ')}
                    </div>
                    
                    <div>
                      <div className="font-bold text-[var(--text-tertiary)] uppercase tracking-wider" style={{ fontSize: '11px', marginBottom: '8px' }}>
                        {node.category || 'Foundations'}
                      </div>
                      <h3 className="font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors" style={{ fontSize: '18px', lineHeight: '1.4' }}>
                        {node.label}
                      </h3>
                    </div>
                    
                    <div className="flex justify-between items-end mt-auto pt-4 border-t border-black/5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Difficulty</span>
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div 
                              key={i} 
                              className={`w-2 h-2 rounded-full ${i <= Math.ceil(node.difficulty) ? 'bg-[var(--text-secondary)]' : 'bg-black/10'}`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {(node.status === 'completed' || node.status === 'test-out') && (
                        <span className="material-symbols-outlined text-[20px]" style={{ color: colors.text }}>check_circle</span>
                      )}
                      {(node.status === 'locked') && (
                        <span className="material-symbols-outlined text-[20px]" style={{ color: colors.text }}>lock</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
