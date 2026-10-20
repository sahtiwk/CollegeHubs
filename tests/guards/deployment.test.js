const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('release configuration keeps four free services, isolated read keys and gated AI',()=>{
 const yaml=fs.readFileSync('render.yaml','utf8'),services=yaml.split('  - type: web').slice(1);
 assert.equal(services.length,4);
 for(const service of services){
  assert.match(service,/plan: free/);assert.match(service,/healthCheckPath: \/health\/ready/);
  assert.match(service,/packages\/contracts\/\*\*/);assert.match(service,/deploy\/build.mjs/);
  if(service.includes('name: collegehubs-core'))for(const name of ['LEARN','ARCADE','INTERVIEW'])assert.match(service,new RegExp('key: '+name+'_READ_KEY\\s+sync: false'));
  else assert.match(service,/key: MODULE_READ_KEY\s+sync: false/);
 }
 assert.match(yaml,/key: INTERVIEW_AI_ENABLED\s+sync: false/);
 assert.ok(!/generateValue: true/.test(yaml.split('key: MODULE_READ_KEY')[1]?.split('  - type: web')[0]||''));
 assert.deepEqual(JSON.parse(fs.readFileSync('apps/web/public/_routes.json')),{version:1,include:['/api','/api/*'],exclude:[]});
});
test('calendar download passes gateway with authenticated boundary and no HTML fallback',async()=>{
 const {proxyApi}=await import('../../apps/web/functions/api/[[path]].ts');
 const response=await proxyApi(new Request('https://app.example/api/hubs/'+'a'.repeat(24)+'/calendar/export.ics',{headers:{Authorization:'Bearer fixture'}}),
  {CORE_API_ORIGIN:'https://core.example'},async(_url,options)=>{
   assert.equal(options.headers.get('authorization'),'Bearer fixture');
   return new Response('BEGIN:VCALENDAR\r\nEND:VCALENDAR',{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="calendar.ics"'}});
  });
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/calendar/);assert.match(await response.text(),/BEGIN:VCALENDAR/);
});
