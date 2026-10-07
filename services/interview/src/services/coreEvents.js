const { randomUUID }=require('node:crypto');const {jsonRequest}=require('./http');
function createCoreEvents(Session,config,fetcher=fetch){
  async function deliver(id){
    const now=new Date(),lease=randomUUID();
    const session=await Session.findOneAndUpdate({_id:id,deliveryStatus:'pending',nextAttemptAt:{$lte:now},deliveryLeaseUntil:{$lte:now}},{$set:{deliveryLeaseId:lease,deliveryLeaseUntil:new Date(+now+15000),nextAttemptAt:new Date(+now+30000)},$inc:{attempts:1}},{new:true});
    if(!session)return;
    try{
      const result=await jsonRequest(config.core+'/api/aura/events',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.serviceKey},body:JSON.stringify(session.event)},fetcher);
      const r=result.data?.receipt;
      if(![200,201].includes(result.status)||!r||r.eventId!==session.event.eventId||r.userId!==session.userId||r.hubId!==session.hubId||!Number.isSafeInteger(r.awardedAura)||r.awardedAura<0||r.awardedAura>30||typeof r.reason!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.dayKey))throw Error('Receipt unavailable');
      await Session.updateOne({_id:id,deliveryLeaseId:lease,deliveryStatus:'pending'},{$set:{receipt:{eventId:r.eventId,awardedAura:r.awardedAura,reason:r.reason,dayKey:r.dayKey},deliveryStatus:'settled',deliveryLeaseId:null,deliveryLeaseUntil:new Date(0),lastDeliveryError:null}});
    }catch{
      await Session.updateOne({_id:id,deliveryLeaseId:lease,deliveryStatus:'pending'},{$set:{deliveryLeaseId:null,deliveryLeaseUntil:new Date(0),lastDeliveryError:'CORE_RECEIPT_PENDING',nextAttemptAt:new Date(Date.now()+Math.min(3600000,30000*2**Math.min(session.attempts-1,7)))}});
    }
  }
  const trigger=id=>{void deliver(id).catch(()=>{});};
  async function reconcile(){const rows=await Session.find({deliveryStatus:'pending',nextAttemptAt:{$lte:new Date()}}).sort({nextAttemptAt:1,_id:1}).limit(3).select('_id');await Promise.all(rows.map(row=>deliver(row.id)));return {attempted:rows.length};}
  return {deliver,trigger,reconcile};
}
module.exports={createCoreEvents};
