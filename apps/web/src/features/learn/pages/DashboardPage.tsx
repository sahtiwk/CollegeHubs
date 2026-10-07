// Dashboard/graph journey adapted from supplied MargaAI, using shared React routing.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RoadmapView from '../RoadmapView';
import { useLearnLoad, LoadState } from '../Learn';
export default function DashboardPage() {
  const graph = useLearnLoad('/dashboard/graph'), domains = useLearnLoad('/dashboard/domains'), stats = useLearnLoad('/dashboard/stats'), milestones = useLearnLoad('/dashboard/milestones');
  const [domain, setDomain] = useState('dsa'), navigate = useNavigate();
  const active = domains.data?.domains.filter((d: any) => d.enrolled) || [];
  const selected = active.some((d: any) => d.domain === domain) ? domain : active[0]?.domain;
  const nodes = graph.data?.nodes.filter((n: any) => n.domain === selected) || [];
  const ids = new Set(nodes.map((n: any) => n.id));
  return <>
    <header className="learn-heading"><p className="eyebrow">Learn / your next step</p><h1>A little curiosity.<br />A clear next step.</h1><p>Make time for the foundations. Your learning paths stay here, ready when you are.</p></header>
    {!graph.data || !domains.data ? <LoadState load={graph.error || !graph.data ? graph : domains} /> : !active.length ? <section className="panel stack"><h2>Where would you like to begin?</h2><p>Choose data structures or web development, set your pace and open your first reading.</p><Link className="learn-cta" to="/learn/onboarding">Choose a learning path →</Link></section> : <>
      <div className="learn-overview"><section className="panel"><p className="eyebrow">Your rhythm</p>{stats.data ? <p><strong>{stats.data.activePaths}</strong> active paths · <strong>{stats.data.availableTopics}</strong> topics ready to read</p> : <LoadState load={stats} />}<Link to="/learn/preferences">Adjust your learning preferences</Link></section><section className="panel"><p className="eyebrow">Milestones</p>{milestones.data ? <>{milestones.data.milestones.length > 0 && <ul>{milestones.data.milestones.map((m: any) => <li key={m.nodeId}>{m.label}</li>)}</ul>}<p>Assessments are not available yet. Reading a topic does not record mastery or award Aura.</p></> : <LoadState load={milestones} />}</section></div>
      <div className="learn-domain-tabs" role="group" aria-label="Your learning paths">{active.map((d: any) => <button key={d.domain} aria-pressed={selected === d.domain} onClick={() => setDomain(d.domain)}>{d.label}</button>)}<Link to="/learn/onboarding">Add a path</Link></div>
      <RoadmapView graphData={{ nodes, links: graph.data.links.filter((l: any) => ids.has(l.source) && ids.has(l.target)) }} onNodeClick={n => navigate('/learn/nodes/' + n.id)} />
      <p className="muted">Connected topics open after prerequisite assessments become available. You can read the starting topic now.</p>
    </>}
  </>;
}
