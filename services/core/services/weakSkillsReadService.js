const budget = require('./optionalReadBudget');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { validateTopics } = require('@collegehubs/contracts/learn-topics.cjs');
function createWeakSkillsReader(config, { env=process.env, fetcher=fetch }={}) {
  let retryAt=0;
  return async owner => {
    if(Date.now()<retryAt) throw Error('Suggestions unavailable');
    const url=new URL(env.LEARN_API_ORIGIN), key=env.LEARN_READ_KEY;
    if(!config.enabled.includes('learn') || !config.enabled.includes('interview') || !/^[a-zA-Z0-9_-]{43}$/.test(key||'') || url.username || url.password || url.search || url.hash || url.pathname!=='/' ||
       url.protocol!=='https:' && !(env.NODE_ENV!=='production' && url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw Error('Suggestions unavailable');
    if(!budget.acquire())throw Error('Suggestions busy');
    try {
      const now=Math.floor(Date.now()/1000);
      const token=jwt.sign({iss:config.issuer,aud:'collegehubs-learn',sub:String(owner.userId),hubId:String(owner.hubId),membershipVersion:owner.membershipVersion,scope:['module:learn:weak-skills:read'],iat:now,nbf:now,exp:now+30,jti:randomUUID()},config.privateKey,{algorithm:'RS256',keyid:config.kid});
      const response=await fetcher(url.origin+'/api/learn/integration/weak-skills',{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(800),headers:{Authorization:'Bearer '+key,'X-Module-Read':token}});
      if(!response.ok||!response.body) {await response.body?.cancel();throw Error('unavailable');}
      const reader=response.body.getReader(), chunks=[]; let size=0;
      for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>4096){await reader.cancel();throw Error('oversize');}chunks.push(Buffer.from(part.value));}
      const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(Object.keys(data).sort().join(',')!=='asOf,items,status'||data.status!=='ok'||typeof data.asOf!=='string'||!Number.isFinite(Date.parse(data.asOf))||Math.abs(Date.now()-Date.parse(data.asOf))>30000)throw Error('invalid');
      return {status:'ok',asOf:data.asOf,items:validateTopics(data.items)};
    } catch(error){retryAt=Date.now()+60000;throw error;} finally{budget.release();}
  };
}
module.exports={createWeakSkillsReader};
