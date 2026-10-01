// Ported from supplied MargaAI RoadmapView. See THIRD_PARTY.md.
import React, { useMemo, useState } from 'react';
export type RoadmapNode = { id: string; label: string; category: string; status: string; description: string };
export type GraphData = { nodes: RoadmapNode[]; links: { source: string | { id: string }; target: string | { id: string } }[] };
export default function RoadmapView({ graphData, onNodeClick }: { graphData: GraphData; onNodeClick: (node: RoadmapNode) => void }) {
  const [list, setList] = useState(false);
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
    const levels: RoadmapNode[][] = [];
    const processed = new Set<string>();

    while (currentLevelNodes.length > 0) {
      levels.push(currentLevelNodes);
      currentLevelNodes.forEach(n => processed.add(n.id));

      const nextLevelNodes: RoadmapNode[] = [];
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

  return <section className="learn-roadmap" aria-label="Sample learning roadmap">
    <div className="learn-roadmap-heading"><div><p className="eyebrow">Follow the connections</p><h2>Your sample roadmap</h2></div><button aria-pressed={list} onClick={() => setList(value => !value)}>{list ? 'Show roadmap' : 'Show accessible list'}</button></div>
    {list ? <ol className="learn-list">{tiers.flat().map(node => <li key={node.id}><button onClick={() => onNodeClick(node)}>{node.label}</button><span>{node.status} &middot; {node.description}</span></li>)}</ol> :
    <div className="learn-tiers">{tiers.map((tier, index) => <section className="learn-tier" key={index} aria-label={'Step ' + (index + 1)}><span className="learn-tier-label">Step {index + 1}</span><div className="learn-cards">{tier.map(node => <button className={'learn-node ' + node.status} key={node.id} onClick={() => onNodeClick(node)}><span className="eyebrow">{node.category}</span><strong>{node.label}</strong><span className="learn-node-status">{node.status === 'locked' ? 'Later in the sample' : 'Start exploring'}<span aria-hidden="true">&#8599;</span></span></button>)}</div></section>)}</div>}
  </section>;
}
