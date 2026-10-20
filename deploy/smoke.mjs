// Read-only, one bounded pass. Never logs response bodies, cookies or credentials.
import fs from 'node:fs';
const config=JSON.parse(fs.readFileSync(process.argv[2]||'.local/deployment-origins.json','utf8'));
const names=['app','coreApi','learnApi','arcadeApi','interviewApi'];
for(const name of names){const u=new URL(config[name+'Origin']);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Expected explicit HTTPS service origins');}
const checks=[
 ...['/','/dashboard','/learn','/arcade','/interview/history'].map(p=>['app',p,200,'html']),
 ...['coreApi','learnApi','arcadeApi','interviewApi'].map(n=>[n,'/health/ready',200,'json']),
 ['app','/api/health',200,'json'],
 ...['learn','arcade','interview'].map(n=>['app','/api/'+n+'/session',401,'json']),
 ['app','/api/me',401,'json'],
 ['app','/api/no-such-route',404,'json'],
];
const results=[];let index=0;
async function worker(){while(index<checks.length){
 const [service,route,expected,format]=checks[index++],started=performance.now();
 try{
  const response=await fetch(config[service+'Origin']+route,{redirect:'manual',signal:AbortSignal.timeout(25000),headers:{Accept:format==='json'?'application/json':'text/html'}});
  const type=response.headers.get('content-type')||'';
  results.push({service,route,status:response.status,expected,format,pass:response.status===expected&&type.includes(format==='json'?'application/json':'text/html'),milliseconds:Math.round(performance.now()-started)});
  await response.body?.cancel();
 }catch{results.push({service,route,expected,pass:false,error:'unavailable-or-timeout',milliseconds:Math.round(performance.now()-started)});}
}}
await Promise.all([worker(),worker()]);
const report={checkedAt:new Date().toISOString(),scope:'anonymous read-only smoke, no auth or deployment mutation',temperature:'unknown: first observation may be warm or cold; not a cold-start benchmark',results,artifactIdentity:'not verified by anonymous route success'};
fs.mkdirSync('.local/tp111',{recursive:true});fs.writeFileSync('.local/tp111/hosted-smoke.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failures:results.filter(r=>!r.pass)}));
if(results.some(r=>!r.pass))process.exitCode=1;
