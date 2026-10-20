const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createInference}=require('../../packages/contracts/inference.cjs');
const local={INTERVIEW_AI_PROVIDER:'local',LOCAL_INFERENCE_ENABLED:'true'};
const response=value=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]}));
test('TP9.1 fixed inference contract, cancellation, truncation, context bounds and no grader fallback',async()=>{
 let calls=0;const p=createInference({env:local,fetcher:async(url,o)=>{calls++;assert.equal(url,'http://127.0.0.1:8080/v1/chat/completions');assert.equal(o.headers.Authorization,undefined);return response({explanation:'Practice'});}});
 assert.equal(p.rewardable,false);assert.deepEqual(await p.request('test','Explain',{},{}),{explanation:'Practice'});
 for(const env of [{...local,LOCAL_INFERENCE_URL:'https://evil.test/v1/chat/completions'},{...local,LOCAL_INFERENCE_MODEL:'unknown'},{INTERVIEW_AI_PROVIDER:'disabled'}])await assert.rejects(createInference({env}).request('test','',{},{}),{code:'AI_UNAVAILABLE'});
 await assert.rejects(p.request('test','',{text:'x'.repeat(24001)},{}),{code:'AI_CONTEXT_LIMIT'});assert.equal(calls,1);
 const controller=new AbortController();controller.abort();await assert.rejects(p.request('test','',{}, {},{signal:controller.signal}),{code:'AI_CANCELLED'});assert.equal(calls,1);
 const active=new AbortController();let began;const started=new Promise(r=>began=r);
 const pending=createInference({env:local,fetcher:()=>{began();return new Promise(()=>{});}}).request('test','',{}, {},{signal:active.signal});
 await started;active.abort();await assert.rejects(pending,{code:'AI_CANCELLED'});
 const keep=setTimeout(()=>{},100);try{await assert.rejects(createInference({env:local,timeoutMs:10,fetcher:()=>new Promise(()=>{})}).request('test','',{},{}),{code:'AI_TIMEOUT'});}finally{clearTimeout(keep);}
 for(const output of [new Response('{bad'),new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]})),new Response('x'.repeat(65537))])await assert.rejects(createInference({env:local,fetcher:async()=>output}).request('test','',{},{}),{code:'AI_INVALID_RESPONSE'});
 const ai=require('../../services/interview/src/services/ai.service').createAiService({env:local});assert.throws(()=>ai.evaluate({}),{code:'AI_GRADING_UNSUPPORTED'});
});
test('TP9.1 slow resources release learner locks; reset invalidates response; tutor ownership and cache',{skip:!process.env.GUARD_LEARN_DATABASE_URL},async()=>{
 const {Pool}=require('pg'),u=new URL(process.env.GUARD_LEARN_DATABASE_URL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));u.pathname='/postgres';const admin=new Pool({connectionString:u.toString()}),name='collegehubs_demo_tp91_'+randomUUID().replaceAll('-','');let pool;
 try{await admin.query('CREATE DATABASE '+name);u.pathname='/'+name;pool=new Pool({connectionString:u.toString()});await pool.query((await import('../../services/learn/src/db/schema.ts')).schemaDDL);await(await import('../../services/learn/src/db/migrations/runner.ts')).migrate(pool,{dryRun:false});
 const learn=(await import('../../services/learn/src/services/learnerService.ts')).learnerService(pool),o={hubId:'a'.repeat(24),userId:'b'.repeat(24)};await learn.initialize(o,'dsa');const nodes=(await learn.graph(o)).nodes;const node=await learn.node(o,nodes[0].id);
 let release,started;const begin=new Promise(r=>started=r),fetcher=()=>{started();return new Promise(r=>release=r);};
 const lookup=(await import('../../services/learn/src/services/roadmapAdapter.ts')).resourceLookup(pool,{enabled:true,fetcher});const pending=lookup(o,node.node.id);await begin;
 await learn.reset(o,'dsa');await learn.initialize(o,'dsa');release(new Response(JSON.stringify(['Array',['Array'],[''],['https://en.wikipedia.org/wiki/Array']])));await assert.rejects(pending,{code:'PATH_CHANGED'});
 assert.equal((await pool.query('SELECT resource FROM resource_cache')).rows[0].resource,null);
 const {contextualTutor}=await import('../../services/learn/src/services/contextualTutor.ts');const tutor=contextualTutor(pool,{env:{}});const template=await tutor(o,node.node.id,node.resources[0].id);assert.equal(template.source,'template');assert.ok(template.attribution);
 await assert.rejects(tutor({...o,userId:'c'.repeat(24)},node.node.id,node.resources[0].id),{code:'NODE_NOT_FOUND'});await assert.rejects(tutor(o,nodes[1].id,node.resources[0].id),{code:'NODE_LOCKED'});await assert.rejects(tutor(o,node.node.id,randomUUID()),{code:'RESOURCE_NOT_FOUND'});
 let count=0;const optional=contextualTutor(pool,{env:{LEARN_TUTOR_ENABLED:'true',LOCAL_INFERENCE_ENABLED:'true'},fetcher:async()=>{count++;return response({explanation:'Use an array to collect related values. Read the first value at index zero; check the length before accessing it.'});}});
 assert.equal((await optional(o,node.node.id,node.resources[0].id)).source,'local-model');assert.equal((await optional(o,node.node.id,node.resources[0].id)).source,'cache');assert.equal(count,1);
 await pool.query('UPDATE tutor_cache SET retry_at=to_timestamp(0)');
 let tutorRelease,tutorStarted;const tutorBegin=new Promise(r=>tutorStarted=r);
 const slowTutor=contextualTutor(pool,{env:{LEARN_TUTOR_ENABLED:'true',LOCAL_INFERENCE_ENABLED:'true'},fetcher:()=>{tutorStarted();return new Promise(r=>tutorRelease=r);}});
 const tutorPending=slowTutor(o,node.node.id,node.resources[0].id);await tutorBegin;await learn.reset(o,'dsa');await learn.initialize(o,'dsa');tutorRelease(response({explanation:'This stale response must not replace saved guidance.'}));await assert.rejects(tutorPending,{code:'PATH_CHANGED'});
 assert.ok(!(await pool.query('SELECT explanation FROM tutor_cache')).rows[0].explanation.includes('stale response'));
 }finally{if(pool)await pool.end();await admin.query('DROP DATABASE IF EXISTS '+name);await admin.end();}
});
test('TP9.1 provider-disabled curated session is owned, saved, ungraded and zero event',{skip:!process.env.GUARD_MONGO_URI},async()=>{
 const mongoose=require('mongoose');mongoose.set('autoCreate',false).set('autoIndex',false);const db=await mongoose.createConnection(process.env.GUARD_MONGO_URI,{dbName:'collegehubs_demo_tp91_'+randomUUID().replaceAll('-',''),serverSelectionTimeoutMS:3000}).asPromise();
 try{const models=Object.fromEntries(['Interview','Resume','Session','AiControl'].map(n=>[n,require('../../services/interview/src/models/'+n+(n==='AiControl'?'':'.model'))(db)]));for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
 const ai=require('../../services/interview/src/services/ai.service').createAiService({env:{INTERVIEW_AI_ENABLED:'false'}}),service=require('../../services/interview/src/services/practiceService').createPracticeService(db,models,ai,{trigger:()=>{}});
 const identity={user_id:'a'.repeat(24),hub_id:'b'.repeat(24),principal:{exp:Math.floor(Date.now()/1000)+900,jti:randomUUID()}};
 let row=await service.curated(identity,{});assert.equal(row.practiceMode,true);await assert.rejects(service.readSession({...identity,user_id:'c'.repeat(24)},row.id),{code:'NOT_FOUND'});
 for(const q of row.questions)row=await service.saveAnswer(identity,row.id,q.id,{revision:1,answer:'Synthetic example and a tradeoff.',skipped:false});
 const done=await service.complete(identity,row.id,{});assert.equal(done.report.ungraded,true);assert.equal(done.report.score,undefined);assert.equal(done.deliveryStatus,'none');assert.equal((await models.Session.findById(row.id)).event,null);assert.deepEqual(JSON.parse(JSON.stringify((await service.complete(identity,row.id,{})).report)),JSON.parse(JSON.stringify(done.report)));
 const bound=await models.Session.create({userId:identity.user_id,hubId:identity.hub_id,interviewId:new mongoose.Types.ObjectId(),questions:row.questions,answers:row.answers,providerId:'groq',providerModel:'openai/gpt-oss-20b'});
 const localService=require('../../services/interview/src/services/practiceService').createPracticeService(db,models,require('../../services/interview/src/services/ai.service').createAiService({env:local}),{trigger:()=>{}});
 await assert.rejects(localService.complete(identity,bound.id,{}),{code:'AI_PROVIDER_CHANGED'});
 await models.Session.updateOne({_id:bound._id},{$set:{status:'completed',report:{score:80,summary:'Previously evaluated report',providerId:'groq',providerModel:'openai/gpt-oss-20b'}}});
 assert.equal((await service.readSession(identity,bound.id)).report.score,80);
 }finally{await db.dropDatabase();await db.close();}
});

