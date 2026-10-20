const test = require('node:test');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const policy = require('@collegehubs/contracts/day-policy.cjs');
const {createAuraEventService, validateEvent, businessKey} = require('../../services/core/services/auraEventService');

test('TP5.2: India boundary and unreleased policy cannot change silently', async () => {
  assert.equal(policy.dayKey('2026-10-01T18:29:59.000Z'),'2026-10-01');
  assert.equal(policy.dayKey('2026-10-01T18:30:00.000Z'),'2026-10-02');
  assert.throws(()=>policy.assertPolicy({timezone:'UTC',timezonePolicyVersion:1}));
  assert.throws(()=>policy.assertPolicy({timezone:'Asia/Kolkata',timezonePolicyVersion:2}));
  await assert.rejects(require('../../services/core/services/nativeAuraService').activate(require('../../services/core/config/auraRules.future.v1.json')),/Unreleased/);
});

test('TP5.2: consumer receipts, shared caps and durable coordinator', {skip:!process.env.GUARD_MONGO_URI}, async t => {
  const mongoose=require('mongoose');
  mongoose.set('autoCreate',false).set('autoIndex',false);
  const names=['College','Hub','User','ModuleGrant','AuraRuleSet','AuraEvent','AuraBalance','AuraDayCounter','DailyActivity','ReconciliationLease'];
  const m=Object.fromEntries(names.map(n=>[n,require('../../services/core/models/'+n)]));
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.GUARD_MONGO_URI).hostname));
  await mongoose.connect(process.env.GUARD_MONGO_URI,{dbName:'collegehubs_demo_tp52_'+randomUUID().replaceAll('-','')});
  let server;
  try {
    for(const model of Object.values(m)){await model.createCollection();await model.createIndexes();}
    const college=await m.College.create({name:'Recovery fixture',slug:'recovery',status:'active',timezone:'Asia/Kolkata',domains:[{normalizedDomain:'recovery.example.test',verifiedAt:new Date(),evidenceRef:'fixture'}]});
    const hub=await m.Hub.create({name:college.name,slug:college.slug,collegeId:college.id,themeTokens:require('../../services/core/config/collegeRegistry').config.defaultTheme,themeVersion:1,timezone:college.timezone});
    const user=await m.User.create({username:'recovery',email:'fixture@recovery.example.test',password:randomUUID(),hubId:hub.id,membershipStatus:'active',membershipVerified:true,membershipVersion:1});
    const at=new Date(Date.now()-86400000).toISOString(), grants={};
    for(const source of ['arcade','learn']) grants[source]=await m.ModuleGrant.create({userId:user.id,hubId:hub.id,module:source,grantHash:require('../../services/core/services/moduleTokenService').digest(randomUUID()),stateHash:require('../../services/core/services/moduleTokenService').digest(randomUUID()),returnPath:'/'+source,membershipVersion:1,themeVersion:1,expiresAt:new Date(),consumedAt:new Date(+new Date(at)-60000),accessJti:randomUUID(),accessExpiresAt:new Date(+new Date(at)+60000),retainUntil:new Date(Date.now()+86400000)});
    const rules={version:'fixture-recovery-v1',timezone:policy.timezone,timezonePolicyVersion:1,types:{
      'arcade.game_completed':{weight:5,countCap:3,sourceCap:30},'arcade.daily_completed':{weight:15,countCap:1,sourceCap:30},
      'learn.node_mastered':{weight:15,countCap:100,sourceCap:100},'learn.path_completed':{weight:30,countCap:100,sourceCap:100}}};
    const service=createAuraEventService({rules});
    const credential=source=>({service:source,eventTypes:Object.keys(rules.types).filter(x=>x.startsWith(source+'.'))});
    let pathIndex=0;const pathIds=['dsa','web','ml','backend','devops'];
    const event=(type,extra={})=>{const source=type.split('.')[0],sourceId=randomUUID();return {schemaVersion:1,eventId:sourceId,userId:user.id,hubId:hub.id,source,type,value:1,occurredAt:at,metadata:{sourceId,accessJti:grants[source].accessJti,domainVersion:'v1',...(type==='arcade.daily_completed'?{challengeId:'daily-one',challengeDay:policy.dayKey(at),rulesVersion:'v1',outcome:'success',serverDurationSeconds:90}:type==='arcade.game_completed'?{gameId:'sorting',rulesVersion:'v1',outcome:'success',serverDurationSeconds:90}:type==='learn.path_completed'?(()=>{const pathId='foundations:'+pathIds[pathIndex++];return {pathId,sourceId:pathId+':foundations-v1',curriculumVersion:'foundations-v1',completedNodeCount:3,requiredNodeCount:3};})():{nodeId:sourceId,curriculumVersion:'v1',masteryMethod:'checkpoint',sourceId:sourceId+':v1'}),...extra}};};
    await t.test('inactive production and scopes; original day and duplicate receipts',async()=>{
      const daily=event('arcade.daily_completed');
      await assert.rejects(createAuraEventService().ingest(credential('arcade'),daily),{code:'AURA_RULES_INACTIVE'});
      await assert.rejects(service.ingest({service:'arcade',eventTypes:[]},daily),{code:'EVENT_SCOPE_FORBIDDEN'});
      assert.throws(()=>validateEvent({...daily,metadata:{...daily.metadata,challengeDay:'2000-01-01'}}));
      const first=await service.ingest(credential('arcade'),daily);
      assert.equal(first.body.receipt.awardedAura,15);assert.equal(first.body.receipt.dayKey,policy.dayKey(at));
      const retry=await service.ingest(credential('arcade'),daily);assert.deepEqual(retry.body.receipt,first.body.receipt);
      const alias={...daily,eventId:randomUUID(),metadata:{...daily.metadata,sourceId:randomUUID()}};
      assert.deepEqual((await service.ingest(credential('arcade'),alias)).body.receipt,first.body.receipt);
      assert.deepEqual((await service.ingest(credential('arcade'),alias)).body.receipt,first.body.receipt);
      assert.equal(businessKey({...daily,hubId:'f'.repeat(24)}),businessKey(daily));
      await assert.rejects(service.ingest(credential('arcade'),{...daily,metadata:{...daily.metadata,serverDurationSeconds:91}}),{code:'EVENT_ID_CONFLICT'});
      assert.throws(()=>validateEvent({...daily,occurredAt:new Date(Date.now()-31*86400000).toISOString()}),{code:'EVENT_REPLAY_EXPIRED'});
    });
    await t.test('concurrent existing and new types share source caps',async()=>{
      const arcade=await Promise.all(['sorting','mathamplitude','numberguess'].map(gameId=>service.ingest(credential('arcade'),event('arcade.game_completed',{gameId}))));
      assert.equal(arcade.reduce((sum,r)=>sum+r.body.receipt.awardedAura,0),15);
      const next=await service.ingest(credential('arcade'),event('arcade.daily_completed',{challengeId:'second'}));assert.equal(next.body.receipt.awardedAura,0);
      const inputs=Array.from({length:6},(_,i)=>event(i%2?'learn.node_mastered':'learn.path_completed'));
      const replies=await Promise.all(inputs.map(e=>service.ingest(credential('learn'),e)));
      assert.equal(replies.reduce((sum,r)=>sum+r.body.receipt.awardedAura,0),100);
      const path=inputs[0],alias={...path,eventId:randomUUID(),metadata:{...path.metadata}};
      assert.deepEqual((await service.ingest(credential('learn'),alias)).body.receipt,replies[0].body.receipt);
      assert.equal(businessKey({...path,hubId:'f'.repeat(24)}),businessKey(path));
      assert.equal((await m.AuraBalance.findOne({userId:user.id})).total,130);
    });
    await t.test('path replay after a Hub change returns original receipt including alias retries',async()=>{
      const path=event('learn.path_completed'),first=await service.ingest(credential('learn'),path);
      const college2=await m.College.create({name:'Second fixture',slug:'second-fixture',status:'active',timezone:policy.timezone,domains:[{normalizedDomain:'second.example.test',verifiedAt:new Date(),evidenceRef:'fixture'}]});
      const hub2=await m.Hub.create({name:college2.name,slug:college2.slug,collegeId:college2.id,themeTokens:hub.themeTokens,themeVersion:1,timezone:policy.timezone});
      await m.User.updateOne({_id:user.id},{$set:{hubId:hub2.id,membershipVersion:2}});
      const grant=grants.learn.toObject();delete grant._id;delete grant.__v;
      const binding=await m.ModuleGrant.create({...grant,hubId:hub2.id,membershipVersion:2,accessJti:randomUUID(),grantHash:require('../../services/core/services/moduleTokenService').digest(randomUUID())});
      const alias={...path,hubId:hub2.id,eventId:randomUUID(),metadata:{...path.metadata,accessJti:binding.accessJti}};
      assert.deepEqual((await service.ingest(credential('learn'),alias)).body.receipt,first.body.receipt);
      assert.deepEqual((await service.ingest(credential('learn'),alias)).body.receipt,first.body.receipt);
      assert.equal(await m.AuraBalance.countDocuments({hubId:hub2.id}),0);
    });
    await t.test('module databases preserve expired results and stop retrying attention',async()=>{
      for(const source of ['arcade','interview']) {
        const model=require('../../services/'+source+'/src/models/'+(source==='arcade'?'GameSession':'Session.model'))(mongoose.connection);
        await model.createCollection();await model.createIndexes();
        const event={eventId:randomUUID(),occurredAt:new Date(Date.now()-31*86400000).toISOString()};
        const row=await model.create({userId:user.id,hubId:hub.id,event,deliveryStatus:'pending',...(source==='arcade'?{clientSessionId:randomUUID(),gameId:'numberguess',rulesVersion:'numberguess-v1',target:42,status:'won',createdAt:new Date(),expiresAt:new Date()}:{interviewId:new mongoose.Types.ObjectId(),status:'completed'})});
        let calls=0;const delivery=require('../../services/'+source+'/src/services/coreEvents').createCoreEvents(model,{core:'http://localhost'},async()=>{calls++;throw Error();});
        await Promise.all([delivery.deliver(row.id),delivery.deliver(row.id)]);await delivery.deliver(row.id);
        const saved=await model.findById(row.id);assert.equal(saved.deliveryStatus,'attention');assert.equal(saved.lastDeliveryError,'EVENT_REPLAY_EXPIRED');assert.deepEqual(saved.event,event);assert.equal(saved.attempts,1);assert.equal(calls,0);
      }
    });
    await t.test('persisted leases prevent parallel work; all-module timeout leaves Core responsive',async()=>{
      const {createCoordinator}=require('../../services/core/services/reconciliationCoordinator');
      const env={ENABLE_MODULES:'arcade,interview,learn',NODE_ENV:'test'};
      for(const source of ['arcade','interview','learn']){env[source.toUpperCase()+'_API_ORIGIN']='http://127.0.0.1:1';env[source.toUpperCase()+'_RECONCILE_KEY']='a'.repeat(43);}
      let calls=0;
      const fetcher=async(url,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('offline')),{once:true}));};
      const a=createCoordinator({env,fetcher}),b=createCoordinator({env,fetcher});
      process.env.JWT_SECRET='recovery-fixture-secret';process.env.ALLOWED_ORIGINS='http://localhost:5173';process.env.ENABLE_MODULES='';
      server=require('../../services/core/app').createApp({connection:mongoose.connection}).listen(0);await new Promise(r=>server.once('listening',r));
      const start=Date.now(),pending=Promise.all([a.tick(),b.tick()]);
      const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/health');assert.ok(response.status<500);assert.ok(Date.now()-start<2000);
      await pending;assert.equal(calls,3);assert.ok(Date.now()-start<10000);
      assert.equal(await m.ReconciliationLease.countDocuments({failures:1,lastResult:'unavailable'}),3);
      assert.ok((await a.tick()).every(r=>r.status==='deferred'));assert.equal(calls,3);
      await m.ReconciliationLease.updateMany({},{$set:{nextAttemptAt:new Date(0)}});
      const recovery=createCoordinator({env,fetcher:async()=>Response.json({attempted:3})});
      assert.ok((await recovery.tick()).every(r=>r.status==='ok'));
      assert.equal(await m.ReconciliationLease.countDocuments({failures:0,lastResult:'ok'}),3);
    });
  } finally {if(server)await new Promise(r=>server.close(r));await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});

for(const moduleName of ['arcade','interview']) test('TP5.2: '+moduleName+' expires saved results without altering facts',async()=>{
  const original={eventId:randomUUID(),occurredAt:new Date(Date.now()-31*86400000).toISOString()};
  const row={event:structuredClone(original),deliveryStatus:'pending'};
  const model={findOneAndUpdate:async()=>row.deliveryStatus==='pending'?row:null,updateOne:async(filter,update)=>Object.assign(row,update.$set)};
  let calls=0;const service=require('../../services/'+moduleName+'/src/services/coreEvents').createCoreEvents(model,{core:'http://localhost',serviceKey:'fixture'},async()=>{calls++;throw Error();});
  await service.deliver('fixture');await service.deliver('fixture');
  assert.equal(row.deliveryStatus,'attention');assert.equal(row.lastDeliveryError,'EVENT_REPLAY_EXPIRED');assert.deepEqual(row.event,original);assert.equal(calls,0);
});

test('TP5.2: Learn retains expired payload in operator-review state',async()=>{
  const {coreEvents}=await import('../../services/learn/src/services/coreEvents.ts');
  const payload={occurredAt:new Date(Date.now()-31*86400000).toISOString()};let status='pending',code;
  const pool={query:async(sql,args)=>{if(sql.includes('RETURNING'))return {rows:status==='pending'?[{payload}]:[]};assert.ok(sql.includes("status='attention'"));status='attention';code=args[2];return {rows:[]};}};
  const events=coreEvents(pool,{core:'http://localhost'},async()=>{throw Error('must not send expired fact');});
  await events.deliver('fixture');assert.equal(status,'attention');assert.equal(code,'EVENT_REPLAY_EXPIRED');
});
