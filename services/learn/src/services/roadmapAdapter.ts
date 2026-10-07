// MargaAI Wikipedia fallback adapted to fixed topics, bounded reads and SQL cache.
import type { Database,Owner } from '../db/index.ts';
import { owned } from '../db/index.ts';
import { accessibleNode } from './learnerService.ts';
import { curriculum } from './plannerAgent.ts';
export function resourceLookup(pool:Database,{enabled=process.env.LEARN_RESOURCE_LOOKUP_ENABLED==='true',fetcher=fetch}:{enabled?:boolean;fetcher?:typeof fetch}={}){
  return (o:Owner,id:string)=>owned(pool,o,async c=>{
    const n=await accessibleNode(c,o,id); // Always before cache reads or provider work.
    const seeds=(await c.query('SELECT title,url,summary,attribution FROM content_item WHERE hub_id=$1 AND node_id=$2 ORDER BY title LIMIT 10',[o.hubId,id])).rows;
    const fallback=()=>({source:seeds.length?'seed':'unavailable',items:seeds,fetchedAt:null,stale:false});
    if(!enabled)return fallback();
    const topic=curriculum.nodes.find(t=>t.label===n.label&&t.domain===n.domain);if(!topic)return fallback();
    await c.query('INSERT INTO resource_cache(hub_id,node_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[o.hubId,id]);
    const saved=(await c.query('SELECT * FROM resource_cache WHERE hub_id=$1 AND node_id=$2 FOR UPDATE',[o.hubId,id])).rows[0];
    const cached=()=>saved.resource?{source:'cache',items:[saved.resource],fetchedAt:saved.fetched_at,stale:+saved.fetched_at<Date.now()-86400000}:fallback();
    if(+saved.retry_at>Date.now())return cached();
    await c.query("UPDATE resource_cache SET retry_at=now()+interval '1 hour' WHERE hub_id=$1 AND node_id=$2",[o.hubId,id]);
    try{
      const url='https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'opensearch',search:topic.wikipediaTitle,limit:'1',namespace:'0',format:'json'});
      const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(1500),headers:{'User-Agent':'CollegeHubs/1.0 (https://github.com/sahtiwk/CollegeHubs)'}});
      if(!r.ok){await r.body?.cancel();throw Error('provider');}const reader=r.body?.getReader();if(!reader)throw Error('empty');let size=0;const chunks:Uint8Array[]=[];
      for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>16384){await reader.cancel();throw Error('large');}chunks.push(chunk.value);}
      const data=JSON.parse(Buffer.concat(chunks).toString('utf8')),title=data?.[1]?.[0],href=data?.[3]?.[0];
      if(typeof title!=='string'||!title||title.length>200||typeof href!=='string'||href.length>1000)throw Error('shape');
      const link=new URL(href);if(link.origin!=='https://en.wikipedia.org'||!link.pathname.startsWith('/wiki/')||link.username||link.password||link.search||link.hash)throw Error('link');
      const item={title,url:link.toString(),summary:'Optional background reading; not part of the assessment answer bank.',attribution:'Wikipedia contributors; see the linked article history and license.'};
      const {rows}=await c.query("UPDATE resource_cache SET resource=$3,fetched_at=now(),retry_at=now()+interval '24 hours' WHERE hub_id=$1 AND node_id=$2 RETURNING fetched_at",[o.hubId,id,JSON.stringify(item)]);
      return {source:'live',items:[item],fetchedAt:rows[0].fetched_at,stale:false};
    }catch{return cached();}
  });
}
