import {createHash} from 'node:crypto';
import type {Database,Owner} from '../db/index.ts';
import {owned} from '../db/index.ts';
import {accessibleNode,schemaVersion,fail} from './learnerService.ts';
import {createInference} from '@collegehubs/contracts/inference.cjs';

export function rankContext(label:string,items:any[]){
 const words=new Set(label.toLowerCase().match(/[a-z]{3,}/g)||[]);
 const score=(r:any)=>(String(r.title)+' '+r.summary).toLowerCase().split(/\W+/).filter(w=>words.has(w)).length;
 return [...items].sort((a,b)=>score(b)-score(a)||a.title.localeCompare(b.title)).slice(0,3);
}
export function contextualTutor(pool:Database,{env=process.env,fetcher=fetch}:any={}){
 // Learn never borrows Interview credentials or sends answers/resumes. Local-only opt-in.
 const inference=createInference({env:{INTERVIEW_AI_PROVIDER:'local',INTERVIEW_AI_ENABLED:env.LEARN_TUTOR_ENABLED==='true'?'true':'false',LOCAL_INFERENCE_ENABLED:env.LOCAL_INFERENCE_ENABLED,LOCAL_INFERENCE_URL:env.LOCAL_INFERENCE_URL,LOCAL_INFERENCE_MODEL:env.LOCAL_INFERENCE_MODEL},fetcher,timeoutMs:5000});
 return async(o:Owner,id:string,contentId:string)=>{
  const reservation=await owned(pool,o,async c=>{
   const node=await accessibleNode(c,o,id);
   const items=(await c.query('SELECT id,title,summary,url,attribution FROM content_item WHERE hub_id=$1 AND node_id=$2 ORDER BY title LIMIT 10',[o.hubId,id])).rows;
   const selected=items.find(r=>r.id===contentId);if(!selected)throw fail(404,'RESOURCE_NOT_FOUND','This resource does not belong to the topic.');
   const context={topic:node.label,description:node.description,reading:selected,related:rankContext(node.label,items.filter(r=>r.id!==contentId))};
   const fallback={source:'template',version:'context-v1',explanation:`${node.label}: ${selected.summary} Read “${selected.title}”. Identify the main idea, work through one concrete example, then explain when it is useful and one limitation. This guidance does not assess your ability.`,attribution:selected.attribution,resourceUrl:selected.url};
   if(!inference.enabled||!node.active||await schemaVersion(c)<5)return {result:fallback};
   const hash=createHash('sha256').update(JSON.stringify({context,model:inference.model,version:'context-v1'})).digest('hex');
   await c.query('INSERT INTO tutor_cache(hub_id,user_id,node_id,content_id,version,context_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[o.hubId,o.userId,id,contentId,'context-v1',hash]);
   const saved=(await c.query('SELECT * FROM tutor_cache WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND content_id=$4 FOR UPDATE',[o.hubId,o.userId,id,contentId])).rows[0];
   const cached=saved.context_hash===hash&&saved.explanation?{...fallback,source:'cache',explanation:saved.explanation,provider:saved.provider,model:saved.model,fetchedAt:saved.fetched_at}:fallback;
   if(+saved.retry_at>Date.now())return {result:cached};
   const lease=(await c.query("UPDATE tutor_cache SET retry_at=now()+interval '1 hour' WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND content_id=$4 RETURNING retry_at::text AS token",[o.hubId,o.userId,id,contentId])).rows[0].token;
   return {context,hash,lease,generation:node.generation,cached,fallback};
  });
  if(reservation.result)return reservation.result;
  let explanation:string|null=null;
  try{
   const result=await inference.request('learning_explanation','Explain only the approved topic and reading summaries in at most 1800 characters. Include one example and a self-check. Do not invent citations, URLs, grades or rewards.',reservation.context,{type:'object',additionalProperties:false,required:['explanation'],properties:{explanation:{type:'string',maxLength:1800}}});
   if(Object.keys(result).length!==1||typeof result.explanation!=='string'||!result.explanation.trim()||result.explanation.length>1800||/https?:\/\//i.test(result.explanation))throw Error('Invalid explanation');
   explanation=result.explanation;
  }catch{/* Explicit, attributed template/last-good fallback, never another provider. */}
  return owned(pool,o,async c=>{
   const current=await accessibleNode(c,o,id);if(!current.active||current.generation!==reservation.generation)throw fail(409,'PATH_CHANGED','Your path changed. Reopen the topic.');
   if(!explanation)return reservation.cached;
   const updated=await c.query("UPDATE tutor_cache SET explanation=$5,context_hash=$6,provider=$7,model=$8,fetched_at=now(),retry_at=now()+interval '24 hours' WHERE hub_id=$1 AND user_id=$2 AND node_id=$3 AND content_id=$4 AND retry_at::text=$9 RETURNING fetched_at",[o.hubId,o.userId,id,contentId,explanation,reservation.hash,inference.provider,inference.model,reservation.lease]);
   return updated.rowCount?{...reservation.fallback,source:'local-model',explanation,provider:inference.provider,model:inference.model,fetchedAt:updated.rows[0].fetched_at}:reservation.cached;
  });
 };
}
