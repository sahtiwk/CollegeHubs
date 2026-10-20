const { randomUUID } = require('node:crypto');
const Lease = require('../models/ReconciliationLease');
function createCoordinator({env=process.env,fetcher=fetch}={}) {
  const targets=[];
  for(const name of ['arcade','interview','learn']) {
    if(!(env.ENABLE_MODULES||'').split(',').map(x=>x.trim()).includes(name))continue;
    try {
      const url=new URL(env[name.toUpperCase()+'_API_ORIGIN']),key=env[name.toUpperCase()+'_RECONCILE_KEY'];
      if(!/^[a-zA-Z0-9_-]{43}$/.test(key||'')||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||(env.NODE_ENV!=='production'&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))continue;
      targets.push({name,url:url.origin+'/api/'+name+'/integration/reconcile',key});
    }catch{}
  }
  let running=null;
  async function attempt(target) {
    const now=new Date(),token=randomUUID();
    try {await Lease.updateOne({_id:target.name},{$setOnInsert:{leaseUntil:new Date(0),nextAttemptAt:new Date(0),failures:0}},{upsert:true}).maxTimeMS(2000);}catch(error){if(error.code!==11000)throw error;}
    const row=await Lease.findOneAndUpdate({_id:target.name,leaseUntil:{$lte:now},nextAttemptAt:{$lte:now}},{$set:{token,leaseUntil:new Date(+now+30000),lastAttemptAt:now}},{new:true}).maxTimeMS(2000);
    if(!row)return {module:target.name,status:'deferred'};
    let success=false;
    try {
      const response=await fetcher(target.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),headers:{Authorization:'Bearer '+target.key,'Content-Type':'application/json'},body:'{}'});
      if(!response.ok||!response.body)throw Error();
      const reader=response.body.getReader();let size=0;const chunks=[];
      try {for(;;){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>2048)throw Error();chunks.push(Buffer.from(item.value));}}finally{await reader.cancel().catch(()=>{});}
      const data=JSON.parse(Buffer.concat(chunks).toString());
      success=Number.isSafeInteger(data.attempted)&&data.attempted>=0&&data.attempted<=3;
    }catch{}
    const failures=success?0:Math.min(10,row.failures+1);
    await Lease.updateOne({_id:target.name,token},{$set:{token:null,leaseUntil:new Date(0),failures,lastResult:success?'ok':'unavailable',nextAttemptAt:new Date(Date.now()+(success?60000:Math.min(3600000,30000*2**failures)))}}).maxTimeMS(2000);
    return {module:target.name,status:success?'ok':'unavailable'};
  }
  function tick(){if(running)return running;running=Promise.all(targets.map(target=>attempt(target).catch(()=>({module:target.name,status:'unavailable'})))).finally(()=>{running=null;});return running;}
  function start(){void tick();const timer=setInterval(()=>void tick(),60000);timer.unref();return ()=>clearInterval(timer);}
  return {tick,start};
}
module.exports={createCoordinator};
