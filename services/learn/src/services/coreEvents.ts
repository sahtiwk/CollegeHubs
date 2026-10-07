import { randomUUID } from 'node:crypto';
import type { Database, Owner } from '../db/index.ts';
import type { LearnConfig } from '../auth/sessionService.ts';
export function coreEvents(pool:Database,config:LearnConfig,fetcher:typeof fetch=fetch){
  async function deliver(eventId:string){
    const lease=randomUUID();
    const {rows}=await pool.query(`UPDATE learn_event SET lease_id=$2,lease_until=now()+interval '15 seconds',next_attempt_at=now()+interval '30 seconds',tries=tries+1
      WHERE event_id=$1 AND status='pending' AND next_attempt_at<=now() AND lease_until<=now() RETURNING *`,[eventId,lease]);
    const e=rows[0];if(!e)return;
    try{
      const response=await fetcher(String(config.core)+'/api/aura/events',{method:'POST',redirect:'error',signal:AbortSignal.timeout(4000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.serviceKey},body:JSON.stringify(e.payload)});
      const reader=response.body?.getReader();if(!reader)throw Error('empty');let size=0;const chunks:Uint8Array[]=[];
      for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>16384){await reader.cancel();throw Error('large');}chunks.push(p.value);}
      const receipt=JSON.parse(Buffer.concat(chunks).toString('utf8')).receipt;
      const limit=e.payload.type==='learn.quiz_completed'?5:15;
      if(![200,201].includes(response.status)||!receipt||receipt.eventId!==e.event_id||receipt.userId!==e.user_id||receipt.hubId!==e.hub_id||!Number.isSafeInteger(receipt.awardedAura)||receipt.awardedAura<0||receipt.awardedAura>limit||typeof receipt.reason!=='string'||receipt.reason.length>100||!/^\d{4}-\d{2}-\d{2}$/.test(receipt.dayKey))throw Error('receipt');
      await pool.query("UPDATE learn_event SET status='settled',receipt=$3,lease_id=NULL,lease_until=to_timestamp(0) WHERE event_id=$1 AND lease_id=$2 AND status='pending'",[eventId,lease,JSON.stringify({eventId:receipt.eventId,awardedAura:receipt.awardedAura,reason:receipt.reason,dayKey:receipt.dayKey})]);
    }catch{
      await pool.query("UPDATE learn_event SET lease_id=NULL,lease_until=to_timestamp(0),next_attempt_at=now()+$3*interval '1 second' WHERE event_id=$1 AND lease_id=$2 AND status='pending'",[eventId,lease,Math.min(3600,30*2**Math.min(e.tries-1,7))]);
    }
  }
  async function reconcile(owner?:Owner,attemptId?:string){
    const {rows}=await pool.query("SELECT event_id FROM learn_event WHERE status='pending' AND next_attempt_at<=now() AND lease_until<=now() AND ($1::text IS NULL OR (hub_id=$1 AND user_id=$2 AND attempt_id=$3::uuid)) ORDER BY next_attempt_at,event_id LIMIT 3",[owner?.hubId||null,owner?.userId||null,attemptId||null]);
    await Promise.all(rows.map(r=>deliver(r.event_id)));return {attempted:rows.length};
  }
  return {deliver,reconcile,trigger:(o:Owner,id:string)=>{void reconcile(o,id).catch(()=>{});}};
}
