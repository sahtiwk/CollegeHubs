const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID,generateKeyPairSync,randomBytes}=require('node:crypto');
const {validateSummary,countFields}=require('../../packages/contracts/module-read.cjs');
const summary=(name)=>({schemaVersion:2,status:'ok',asOf:new Date().toISOString(),...Object.fromEntries(countFields[name].map(k=>[k,0])),next:null,...(name==='learn'?{paths:[]}: {})});
test('TP10.1 minimized summaries reject private fields, unsafe actions and impossible paths',()=>{
 for(const name of Object.keys(countFields)){
  const row=summary(name);assert.equal(validateSummary(name,row),row);
  assert.throws(()=>validateSummary(name,{...row,answers:['private']}));
  assert.throws(()=>validateSummary(name,{...row,next:{kind:'url',id:'https://evil.example'}}));
  assert.throws(()=>validateSummary(name,{...row,schemaVersion:99}));
 }
 const row=summary('learn'),path={domain:'devops',version:'foundations-v1',required:3,completed:1};
 validateSummary('learn',{...row,paths:[path],next:{kind:'node',id:randomUUID()}});
 for(const paths of [[{...path,completed:4}],[path,path],[{...path,domain:'unknown'}]])assert.throws(()=>validateSummary('learn',{...row,paths}));
});
test('TP10.1 one aggregate deadline bounds stalled streams and keeps other summaries useful',async()=>{
 const {createModuleReader}=require('../../services/core/services/moduleReadService'),{privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const env={};for(const name of Object.keys(countFields)){env[name.toUpperCase()+'_API_ORIGIN']='https://'+name+'.example';env[name.toUpperCase()+'_READ_KEY']=randomBytes(32).toString('base64url');}
 let active=0,peak=0;
 const reader=createModuleReader({enabled:Object.keys(countFields),privateKey,kid:'test',issuer:'core'},{env,fetcher:async(url,options)=>{
  active++;peak=Math.max(peak,active);const name=new URL(url).hostname.split('.')[0];
  if(name==='learn')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{active--;reject(Error('timeout'));},{once:true}));
  active--;return Response.json(summary(name));
 }});
 const start=performance.now(),data=await reader.summary({userId:'a'.repeat(24),hubId:'b'.repeat(24),membershipVersion:1});
 assert.ok(performance.now()-start<1100);assert.ok(peak<=2);assert.equal(data.schemaVersion,2);assert.equal(data.modules.learn.status,'unavailable');assert.equal(data.modules.interview.status,'ok');
});
test('TP10.1 browser continuation routes are allowlisted and stale snapshots do not offer direct actions',async()=>{
 const {continuation}=await import('../../apps/web/src/components/moduleContinuation.js');
 const data={...summary('interview'),next:{kind:'report',id:'a'.repeat(24)}};
 assert.equal(continuation('interview',data).to,'/interview/results/'+'a'.repeat(24));
 assert.equal(continuation('interview',{...data,status:'stale'}),null);
 assert.equal(continuation('arcade',{...summary('arcade'),next:{kind:'game',gameId:'../../bad',id:'a'.repeat(24)}}),null);
 assert.equal(continuation('learn',{...summary('learn'),next:{kind:'node',id:'//evil'}}),null);
});
test('TP10.1 topic domains and versions remain bounded without exposing raw assessment data',()=>{
 const {validateTopics}=require('../../packages/contracts/learn-topics.cjs');
 for(const domain of ['dsa','web','ml','backend','devops']){
  const item={domain,nodeId:randomUUID(),label:'Reviewed topic',version:'foundations-v1',reason:'Last assessed ratio below 0.6',asOf:new Date().toISOString()};
  assert.equal(validateTopics([item])[0].domain,domain);
  assert.throws(()=>validateTopics([{...item,version:'retired-v99'}]));
  assert.throws(()=>validateTopics([{...item,answers:[]}]));
 }
});
