// Dashboard/graph journey adapted from supplied MargaAI, using shared React routing.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NodePopover from '../NodePopover';
import {domainLabel} from '../domainLabels';
import RoadmapView from '../RoadmapView';
import { useLearnLoad, useLearnAction, LoadState } from '../Learn';
export default function DashboardPage() {
  const graph = useLearnLoad('/dashboard/graph'), domains = useLearnLoad('/dashboard/domains'), stats = useLearnLoad('/dashboard/stats'), milestones = useLearnLoad('/dashboard/milestones');
  const action=useLearnAction();
  const [domain, setDomain] = useState('dsa'), [selectedNode,selectNode] = useState<any>(null);
  const active = domains.data?.domains.filter((d: any) => d.enrolled) || [];
  const selected = active.some((d: any) => d.domain === domain) ? domain : active[0]?.domain;
  const nodes = graph.data?.nodes.filter((n: any) => n.domain === selected) || [];
  const ids = new Set(nodes.map((n: any) => n.id));
  return <>
    <header className="learn-heading"><p className="eyebrow">Learn / your next step</p><h1>A little curiosity.<br />A clear next step.</h1><p>Make time for the foundations. Your learning paths stay here, ready when you are.</p></header>
    {!graph.data || !domains.data ? <LoadState load={graph.error || !graph.data ? graph : domains} /> : !active.length ? <section className="panel stack"><h2>Where would you like to begin?</h2><p>Choose from the published paths, set your pace and open your first reading.</p><Link className="learn-cta" to="/learn/onboarding">Choose a learning path →</Link></section> : <>
      <div className="learn-overview"><section className="panel"><p className="eyebrow">Your rhythm</p>{stats.data ? <p><strong>{stats.data.activePaths}</strong> active paths · <strong>{stats.data.availableTopics}</strong> topics ready to read</p> : <LoadState load={stats} />}<Link to="/learn/preferences">Adjust your learning preferences</Link></section><section className="panel"><p className="eyebrow">Milestones</p>{milestones.data ? <>{milestones.data.milestones.length > 0 && <ul>{milestones.data.milestones.map((m: any) => <li key={m.nodeId}>{m.label}</li>)}</ul>}{milestones.data.paths?.filter((p:any)=>p.completion).map((p:any)=><p key={p.domain}><Link to={'/learn/quiz/'+p.completion.attemptId}>{domainLabel(p.domain)} path completed →</Link></p>)}<p>Passed assessments record mastery. Opening a reading alone does not award Aura.</p></> : <LoadState load={milestones} />}</section></div>
      <div className="learn-domain-tabs" role="group" aria-label="Your learning paths">{active.map((d: any) => <button key={d.domain} aria-pressed={selected === d.domain} onClick={() => { setDomain(d.domain); selectNode(null); }}>{d.label}</button>)}<Link to="/learn/onboarding">Add a path</Link></div>
      <section className="panel stack learn-version"><p><strong>{nodes.length} required topics</strong> · {nodes.filter((n:any)=>n.status==='completed').length} completed · {active.find((d:any)=>d.domain===selected)?.version}</p>
      {active.find((d:any)=>d.domain===selected)?.upgradeAvailable&&<><h2>A longer path is ready.</h2><p>The new version has {active.find((d:any)=>d.domain===selected)?.latestNodeCount} required topics. Equivalent completed topics carry forward without new rewards. Saved results and old readings remain available. Any unfinished quiz on this path will be cancelled.</p><button disabled={action.busy} onClick={()=>action.run(async call=>{const d=active.find((d:any)=>d.domain===selected);await call('/profile/path/upgrade','POST',{domain:selected,fromVersion:d.version,toVersion:d.latestVersion});graph.refresh();domains.refresh();stats.refresh();milestones.refresh();selectNode(null);})}>Upgrade this path and keep my history</button></>}{action.error&&<p role="alert">{action.error}</p>}</section>
      <RoadmapView graphData={{ nodes, links: graph.data.links.filter((l: any) => ids.has(l.source) && ids.has(l.target)) }} onNodeClick={selectNode} />
      {stats.data?.paths?.filter((p:any)=>p.domain===selected).map((p:any)=><section key={p.domain} className="panel stack" aria-label="Path progress"><h2>{p.completedCount===p.requiredCount?'You’ve finished this path.':'Your path, at a glance.'}</h2><p>{p.completedCount}/{p.requiredCount} required topics completed · {p.optionalCompletedCount}/{p.optionalCount} optional review steps done</p><progress max={p.requiredCount} value={p.completedCount} aria-label="Required path progress"/>{p.nextNode&&<Link to={'/learn/nodes/'+p.nextNode.id}>Continue with {p.nextNode.label} →</Link>}{p.completion&&<Link to={'/learn/quiz/'+p.completion.attemptId}>View path completion and award confirmation</Link>}<p className="muted">Optional reviews never block completion. Self-rating is separate from assessed progress.</p></section>)}
      {selectedNode && <NodePopover node={selectedNode} onClose={()=>selectNode(null)}/>}<p className="muted">Complete a topic assessment to open its connected topics. Your saved assessments are available from the Learn navigation.</p>
    </>}
  </>;
}
