import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLearnLoad, useLearnAction, LoadState } from '../Learn';
export default function NodePage() {
  const { id } = useParams();
  return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id || '') ? <Topic key={id} id={id!} /> : <p className="panel">This topic is unavailable. <Link to="/learn">Back to learning</Link>.</p>;
}
function Topic({ id }: { id: string }) {
  const load = useLearnLoad('/nodes/' + id), action = useLearnAction(), [guidance, setGuidance] = useState(''), [recommendation, setRecommendation] = useState<any>(null);
  useEffect(() => { setGuidance(''); setRecommendation(null); }, [id]);
  return <><Link to="/learn">← Back to my learning</Link>{!load.data ? <LoadState load={load} /> : <>
    <header className="learn-heading"><p className="eyebrow">{load.data.node.domain === 'dsa' ? 'Data structures & algorithms' : 'Web development'} / starting topic</p><h1>{load.data.node.label}</h1><p>{load.data.node.description}</p></header>
    <section className="panel stack"><p className="eyebrow">Curated reading</p><h2>Begin with one good resource.</h2><p>Read at your own pace, then try an example. These saved reading links work without AI generation.</p>
      {load.data.resources.map((r: any) => <article className="learn-resource stack" key={r.id}><h3>{r.title}</h3><p>{r.summary}</p><a href={r.url} target="_blank" rel="noopener noreferrer">Read on MDN Web Docs ↗ <span className="sr-only">(opens in a new tab)</span></a><small className="muted">{r.attribution}</small><button disabled={action.busy} onClick={() => action.run(async call => { const dto = await call('/tutor/fast', 'POST', { nodeId: id, contentId: r.id }); setGuidance(dto.explanation); })}>How should I approach this?</button></article>)}
      {!load.data.resources.length && <p>No reading resource is available for this topic yet.</p>}
      <button disabled={action.busy} onClick={() => action.run(async call => { setRecommendation(await call('/recommendation', 'POST', { nodeId: id })); })}>Suggest a starting resource</button>
      {recommendation && <p role="status">{recommendation.recommendedItem?.title && <strong>{recommendation.recommendedItem.title}: </strong>}{recommendation.reasoning}</p>}
      {guidance && <aside className="learn-guidance" role="status"><h3>Reading guidance</h3><p>{guidance}</p><small>Template guidance · no AI call</small></aside>}{action.error && <p role="alert">{action.error}</p>}
    </section><section className="panel stack"><h2>Assessment coming later</h2><p>Checkpoint and test-out are not available yet. Opening a resource does not mark this topic complete or award Aura.</p><button disabled>Checkpoint unavailable</button></section>
  </>}</>;
}
