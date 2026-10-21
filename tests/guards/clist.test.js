const test=require('node:test'),assert=require('node:assert/strict');
const adapter=require('../../services/core/integrations/clist');
const row={id:12,event:'Weekly contest',host:'leetcode.com',href:'https://leetcode.com/contest/weekly-contest-1/',start:'2026-10-25T02:30:00',end:'2026-10-25T04:00:00'};
test('Clist dates are UTC; unsafe links, bad bounds and conflicting identities are rejected',()=>{
 const items=adapter.normalize({objects:[row,row]});assert.equal(items.length,1);assert.equal(items[0].startsAt.toISOString(),'2026-10-25T02:30:00.000Z');
 for(const change of [{href:'javascript:alert(1)'},{href:'https://evil.example/'},{href:'https://secret@leetcode.com/'},{host:'evil.example'},{start:'invalid'},{end:row.start},{id:-1}])assert.throws(()=>adapter.normalize({objects:[{...row,...change}]}));
 assert.throws(()=>adapter.normalize({objects:[row,{...row,event:'different'}]}));
});
test('Clist authenticated requests keep keys out of URLs and bound failures',async()=>{
 process.env.CLIST_CONTESTS_ENABLED='true';process.env.CLIST_USERNAME='fixture';process.env.CLIST_API_KEY='fixture-key';
 try{
 const options={timeoutMs:30,maxBytes:2048};
 assert.equal((await adapter.fetchContests({...options,fetcher:async(url,request)=>{assert.equal(url,adapter.ENDPOINT);assert.ok(!url.includes('fixture'));assert.equal(request.headers.Authorization,'ApiKey fixture:fixture-key');assert.equal(request.redirect,'error');return Response.json({objects:[row]});}})).length,1);
 for(const fetcher of [async()=>new Response('',{status:429}),async()=>new Response('',{status:302}),async()=>new Response('x'.repeat(2049)),async()=>new Promise(()=>{})])await assert.rejects(adapter.fetchContests({...options,fetcher}));
 }finally{delete process.env.CLIST_CONTESTS_ENABLED;delete process.env.CLIST_USERNAME;delete process.env.CLIST_API_KEY;}
});
