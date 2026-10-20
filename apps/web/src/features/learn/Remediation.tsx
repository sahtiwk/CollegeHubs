import React from 'react';
import {useLearnAction} from './Learn';
export default function Remediation({plans,onReviewed}:{plans:any[];onReviewed:()=>void}){
 const action=useLearnAction();
 if(!plans?.length)return null;
 return <section className="learn-guidance stack" aria-label="Optional review"><p className="eyebrow">A smaller next step</p><h3>Review, then try again.</h3><p>These optional steps revisit concepts you missed. They do not add required topics or award Aura. A passing assessment is still needed to move forward.</p>{plans.map(p=><div className="stack" key={p.id}><ol>{p.steps.map((s:any)=><li key={s.id}><strong>{s.prompt}</strong><p>{s.explanation}</p><a href={s.url} target="_blank" rel="noopener noreferrer">Revisit the source reading ↗</a><p className="muted">Explain the idea in your own words and work through a new example.</p></li>)}</ol>{p.resolved?<p role="status">Recovered — your later assessment passed.</p>:p.reviewed?<p role="status">Review marked done. Return to the topic when you’re ready for another checkpoint.</p>:<button disabled={action.busy} onClick={()=>action.run(async call=>{await call('/remediation/review','POST',{id:p.id});onReviewed();})}>I’ve reviewed these steps</button>}</div>)}{action.error&&<p role="alert">{action.error}</p>}</section>;
}
