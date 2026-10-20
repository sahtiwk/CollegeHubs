import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {Owner} from '../db/index.ts';
import {permittedUrl,release} from './plannerAgent.ts';

// A finite chain of reviewed concepts attached to one owned failed topic. No model call.
export function validateRemedialSteps(steps:any[],parent:string){
 if(!Array.isArray(steps)||steps.length<1||steps.length>3)throw Error('Invalid remedial size');
 const seen=new Set([parent]);
 for(const step of steps){if(!step||typeof step.id!=='string'||seen.has(step.id)||!seen.has(step.prerequisite)||!permittedUrl(step.url)||typeof step.explanation!=='string'||!step.explanation.length||step.explanation.length>1500)throw Error('Invalid remedial attachment');seen.add(step.id);}
}
export async function planRemediation(c:PoolClient,o:Owner,a:any){
 const node=(await c.query('SELECT slug,domain FROM skill_node WHERE hub_id=$1 AND id=$2',[o.hubId,a.node_id])).rows[0];
 const publication=release(a.version),group=publication.bank.nodes.find((n:any)=>n.slug===node.slug&&n.domain===node.domain);
 const failed=a.questions.filter((q:any)=>a.answers[q.id].optionId!==q.correct).slice(0,3);
 const steps=failed.map((q:any,i:number)=>{const reviewed=group.items.find((item:any)=>item.id===q.seedId);if(!reviewed)throw Error('Unreviewed remediation');return {id:`review-${i+1}`,prerequisite:i?`review-${i}`:a.node_id,prompt:reviewed.prompt,explanation:reviewed.explanation,url:group.source};});
 validateRemedialSteps(steps,a.node_id);
 await c.query(`INSERT INTO remedial_plan(id,hub_id,user_id,node_id,version,attempt_id,steps) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(hub_id,user_id,node_id,version) DO NOTHING`,[randomUUID(),o.hubId,o.userId,a.node_id,a.version,a.id,JSON.stringify(steps)]);
}
export async function remedialPlans(c:PoolClient,o:Owner,nodeId?:string){
 return (await c.query(`SELECT r.id,r.node_id AS "nodeId",r.steps,r.reviewed,r.resolved FROM remedial_plan r
 JOIN enrollment e ON e.hub_id=r.hub_id AND e.user_id=r.user_id AND e.version=r.version
 JOIN skill_node n ON n.hub_id=r.hub_id AND n.id=r.node_id AND n.domain=e.domain
 WHERE r.hub_id=$1 AND r.user_id=$2 AND e.active AND ($3::uuid IS NULL OR r.node_id=$3) ORDER BY r.created_at`,[o.hubId,o.userId,nodeId||null])).rows;
}
