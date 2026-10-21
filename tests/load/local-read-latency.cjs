// Bounded local read latency probe. This is NOT the full N1/N2 mixed workload.
const fs = require('node:fs/promises');
const base = new URL(process.env.LOAD_BASE_URL || 'http://127.0.0.1:5183');
if (!['127.0.0.1','localhost'].includes(base.hostname) || base.protocol !== 'http:') throw Error('Local fixtures only');
async function request(path, token, body) {
 const start = performance.now();
 const response = await fetch(new URL(path,base), {method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 const data = await response.json(); return {status:response.status,ms:performance.now()-start,data};
}
(async()=>{
 const login=await request('/api/auth/login',null,{email:'preview@cvr.ac.in',password:'Preview-only-32!'});
 if(login.status!==200||!login.data.token)throw Error('Disposable fixture login failed');
 const token=login.data.token,results=[];
 for(const path of ['/api/me','/api/me/hub','/api/me/module-progress']){
  for(let n=0;n<5;n++)await request(path,token);
  const samples=[];for(let n=0;n<100;n++){try{samples.push(await request(path,token));}catch{samples.push({status:0,ms:10000});}}
  const sorted=samples.map(x=>x.ms).sort((a,b)=>a-b),percentile=p=>Math.round(sorted[Math.ceil(p*sorted.length)-1]*100)/100;
  results.push({path,samples:samples.length,failures:samples.filter(x=>x.status!==200).length,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99)});
 }
 const report={at:new Date().toISOString(),environment:'local disposable fixture',concurrency:1,warmup:'five requests per endpoint',units:'milliseconds',fullN1N2Acceptance:false,results};
 await fs.mkdir('.local/tp111',{recursive:true});await fs.writeFile('.local/tp111/read-latency.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
