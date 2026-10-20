import type {PoolClient} from 'pg';
import type {Owner} from '../db/index.ts';
import {release,canonicalId} from './plannerAgent.ts';

// Called inside the assessment's owned transaction, after state and unlock updates.
export async function completePath(c:PoolClient,o:Owner,a:any,principal:any,now:Date){
 if(a.version!=='foundations-v1')return;
 const required=release(a.version).curriculum.nodes.filter((n:any)=>n.domain===a.domain&&n.required);
 const states=(await c.query(`SELECT n.slug,s.status FROM learner_node_state s JOIN skill_node n ON n.hub_id=s.hub_id AND n.id=s.node_id
 WHERE s.hub_id=$1 AND s.user_id=$2 AND s.domain=$3 AND s.version=$4`,[o.hubId,o.userId,a.domain,a.version])).rows;
 if(!required.length||!required.every((n:any)=>states.some(s=>s.slug===n.slug&&s.status==='completed')))return;
 const snapshot=required.map((n:any)=>canonicalId(n.domain,n.slug,a.version));
 const first=await c.query(`INSERT INTO path_completion(hub_id,user_id,domain,version,attempt_id,required_nodes,completed_at)
 VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING domain`,[o.hubId,o.userId,a.domain,a.version,a.id,JSON.stringify(snapshot),now]);
 if(!first.rowCount)return;
 const eventId=`learn:${a.id}:path:v1`,pathId=`foundations:${a.domain}`;
 const payload={schemaVersion:1,eventId,userId:o.userId,hubId:o.hubId,source:'learn',type:'learn.path_completed',value:1,occurredAt:now.toISOString(),metadata:{accessJti:principal.jti,domainVersion:'v1',sourceId:pathId+':'+a.version,pathId,curriculumVersion:a.version,completedNodeCount:snapshot.length,requiredNodeCount:snapshot.length}};
 await c.query('INSERT INTO learn_event(hub_id,user_id,attempt_id,event_id,payload) VALUES($1,$2,$3,$4,$5)',[o.hubId,o.userId,a.id,eventId,JSON.stringify(payload)]);
}
