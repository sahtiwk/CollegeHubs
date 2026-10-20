const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
process.env.JWT_SECRET='external-fixture-secret';process.env.ALLOWED_ORIGINS='http://localhost:5173';process.env.ENABLE_MODULES='';process.env.CORE_SESSION_ENABLED='false';
const adapter=require('../../services/core/integrations/codeforcesStats');
test('TP6.2: normalized exact handle/current rating; no aggregate All double count',()=>{
  assert.deepEqual(adapter.normalize({status:'OK',result:[{handle:'Tourist',rating:100,maxRating:999,organization:'Proof'}]},'tourist'),{handle:'tourist',rating:100,organization:'Proof'});
  assert.equal(adapter.normalize({status:'OK',result:[{handle:'unrated'}]},'unrated').rating,0);
  for(const row of [{handle:'other',rating:1},{handle:'tourist',rating:1.5},{handle:'tourist',rating:Infinity},{handle:'tourist',organization:[]}])assert.throws(()=>adapter.normalize({status:'OK',result:[row]},'tourist'));
  const {amount}=require('../../services/core/config/externalBonus');assert.equal(amount({rating:100,leetcode:{easy:2,medium:3,hard:1,All:6}}),260);assert.equal(amount({rating:-10}),0);assert.throws(()=>amount({leetcode:{easy:1,medium:2,hard:-1}}));
  assert.throws(()=>require('../../services/core/config/externalProviders').config({CODEFORCES_STATS_ENABLED:'yes'}));
});
test('TP6.2: provider byte/deadline/429/redirect bounds and fixed URL',async()=>{
  const opts={reserve:async()=>{},timeoutMs:30,maxBytes:500};
  assert.equal((await adapter.fetchStats('tourist',{...opts,fetcher:async(url,options)=>{assert.equal(url,'https://codeforces.com/api/user.info?handles=tourist&checkHistoricHandles=false');assert.equal(options.redirect,'error');return Response.json({status:'OK',result:[{handle:'tourist',rating:100}]});}})).rating,100);
  for(const fetcher of [async()=>new Promise(()=>{}),async()=>new Response('',{status:429}),async()=>new Response('',{status:302}),async()=>new Response('x'.repeat(501)),async()=>Response.json({status:'FAILED'})])await assert.rejects(adapter.fetchStats('tourist',{...opts,fetcher}));
});
test('TP6.2: owned bindings, evidence, snapshots and transactional bonus replacement',{skip:!process.env.GUARD_MONGO_URI},async t=>{
  const mongoose=require('mongoose');mongoose.set('autoCreate',false).set('autoIndex',false);assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.GUARD_MONGO_URI).hostname));
  await mongoose.connect(process.env.GUARD_MONGO_URI,{dbName:'collegehubs_demo_external_'+randomUUID().replaceAll('-','')});
  const names=['User','Hub','College','ExternalAccount','ExternalSnapshot','AuraBalance','ProviderRequestLease'];const m=Object.fromEntries(names.map(n=>[n,require('../../services/core/models/'+n)]));
  process.env.CODEFORCES_STATS_ENABLED='true';process.env.EXTERNAL_BONUS_ENABLED='true';let server;
  try{
    for(const model of Object.values(m)){await model.createCollection();await model.createIndexes();}
    const college=await m.College.create({name:'External test',slug:'external-test',status:'active',timezone:'Asia/Kolkata',domains:[{normalizedDomain:'external.example.test',verifiedAt:new Date(),evidenceRef:'test'}]});
    const hub=await m.Hub.create({name:college.name,slug:college.slug,collegeId:college.id,themeTokens:require('../../services/core/config/collegeRegistry').config.defaultTheme,themeVersion:1,timezone:college.timezone});
    const user=await m.User.create({username:'external',email:'one@external.example.test',password:randomUUID(),hubId:hub.id,membershipVersion:1,membershipStatus:'active',membershipVerified:true,verificationMethod:'email',emailVerificationMethod:'email',emailVerifiedAt:new Date()});
    const peer=await m.User.create({username:'peer',email:'two@external.example.test',password:randomUUID(),hubId:hub.id,membershipVersion:1,membershipStatus:'active',membershipVerified:true,verificationMethod:'email',emailVerificationMethod:'email',emailVerifiedAt:new Date()});
    const ctx={userId:user.id,hubId:hub.id,membershipVersion:1},peerCtx={...ctx,userId:peer.id},service=require('../../services/core/services/externalAccountService');
    const due=()=>m.ExternalAccount.updateMany({},{$set:{nextAttemptAt:new Date(0),leaseUntil:new Date(0)}});
    const account=()=>m.ExternalAccount.findOne({userId:user.id});
    await m.AuraBalance.create({userId:user.id,hubId:hub.id,engagement:50,total:50,externalBonus:0,asOf:new Date()});
    await t.test('pending link never awards; unknown score/owner input is rejected; review needs current challenge',async()=>{
      await assert.rejects(service.link(ctx,{provider:'codeforces',handle:'tourist',rating:999}),{status:400});
      await service.link(ctx,{provider:'codeforces',handle:'tourist'});let calls=0;assert.equal((await service.refresh(ctx,{load:async()=>{calls++;}})).status,'deferred');assert.equal(calls,0);assert.equal((await m.AuraBalance.findOne({userId:user.id})).total,50);
      const row=await account();await assert.rejects(service.review({accountId:row.id,bindingVersion:row.bindingVersion,reviewer:'fixture-operator'},{load:async()=>({handle:'tourist',organization:'wrong'})}),{code:'OWNERSHIP_NOT_PROVEN'});
      await due();await service.review({accountId:row.id,bindingVersion:row.bindingVersion,reviewer:'fixture-operator'},{load:async()=>({handle:'tourist',organization:row.challenge,rating:100})});
      assert.equal((await account()).verified,true);assert.equal((await account()).challenge,null);assert.match((await account()).proofHash,/^[a-f0-9]{64}$/);
      assert.equal((await service.read(peerCtx)).items.length,0);
    });
    await t.test('verified handle cannot be claimed by another user',async()=>{
      await service.link(peerCtx,{provider:'codeforces',handle:'Tourist'});const other=await m.ExternalAccount.findOne({userId:peer.id});
      await assert.rejects(service.review({accountId:other.id,bindingVersion:other.bindingVersion,reviewer:'fixture-operator'},{load:async()=>({handle:'tourist',organization:other.challenge,rating:100})}),{code:'HANDLE_ALREADY_VERIFIED'});
      assert.equal((await m.ExternalAccount.findById(other.id)).verified,false);
    });
    await t.test('parallel refresh leases, delta arithmetic and failure preserve engagement/last-good',async()=>{
      let calls=0;const load=async()=>{calls++;await new Promise(r=>setTimeout(r,10));return {handle:'tourist',rating:100};};
      await Promise.all([service.refresh(ctx,{load}),service.refresh(ctx,{load}),service.refresh(ctx,{load})]);assert.equal(calls,1);
      let balance=await m.AuraBalance.findOne({userId:user.id});assert.equal(balance.engagement,50);assert.equal(balance.externalBonus,200);assert.equal(balance.total,250);
      await due();await service.refresh(ctx,{load:async()=>({handle:'tourist',rating:80})});balance=await m.AuraBalance.findOne({userId:user.id});assert.equal(balance.total,210);assert.equal(balance.engagement,50);
      const before=await m.ExternalSnapshot.findOne({userId:user.id}).lean();await due();await service.refresh(ctx,{load:async()=>{throw Error('429');}});assert.deepEqual(await m.ExternalSnapshot.findOne({userId:user.id}).lean(),before);assert.equal((await service.read(ctx)).items[0].snapshot.stale,true);
      assert.equal((await service.refresh(ctx,{load})).status,'deferred');assert.equal((await m.AuraBalance.findOne({userId:user.id})).total,210);
    });
    await t.test('failed snapshot transaction rolls back its bonus delta',async()=>{
      const prior=await m.AuraBalance.findOne({userId:user.id}).lean(),write=m.ExternalSnapshot.updateOne;
      await due();m.ExternalSnapshot.updateOne=async()=>{throw Error('injected write failure');};
      try{assert.equal((await service.refresh(ctx,{load:async()=>({handle:'tourist',rating:900})})).status,'unavailable');}finally{m.ExternalSnapshot.updateOne=write;}
      assert.deepEqual(await m.AuraBalance.findOne({userId:user.id}).lean(),prior);
    });
    await t.test('unlink during in-flight request discards stale snapshot and removes only bonus',async()=>{
      await due();let release,started;const begun=new Promise(r=>started=r);const pending=service.refresh(ctx,{load:()=>{started();return new Promise(r=>release=r);}});await begun;
      await service.unlink(ctx,'codeforces');release({handle:'tourist',rating:999});assert.equal((await pending).status,'discarded');
      const balance=await m.AuraBalance.findOne({userId:user.id});assert.equal(balance.total,50);assert.equal(balance.engagement,50);assert.equal(balance.externalBonus,0);assert.equal(await m.ExternalSnapshot.countDocuments({userId:user.id}),0);
      await service.unlink(ctx,'codeforces');assert.equal((await m.AuraBalance.findOne({userId:user.id})).total,50);
    });
    await t.test('handle change invalidates pending refresh; new binding needs fresh proof',async()=>{
      await m.ExternalAccount.collection.updateOne({userId:user._id},{$set:{updatedAt:new Date(0)}});
      await service.link(ctx,{provider:'codeforces',handle:'tourist'});let row=await account();
      await service.review({accountId:row.id,bindingVersion:row.bindingVersion,reviewer:'fixture-operator'},{load:async()=>({handle:'tourist',organization:row.challenge})});
      let release,started;const begun=new Promise(r=>started=r);const pending=service.refresh(ctx,{load:()=>{started();return new Promise(r=>release=r);}});await begun;
      await m.ExternalAccount.collection.updateOne({userId:user._id},{$set:{updatedAt:new Date(0)}});
      await service.link(ctx,{provider:'codeforces',handle:'different'});release({handle:'tourist',rating:100});assert.equal((await pending).status,'discarded');
      row=await account();assert.equal(row.handle,'different');assert.equal(row.verified,false);assert.equal((await m.AuraBalance.findOne({userId:user.id})).externalBonus,0);
      await m.ExternalAccount.updateOne({_id:row.id},{$set:{challengeExpiresAt:new Date(0)}});
      await assert.rejects(service.review({accountId:row.id,bindingVersion:row.bindingVersion,reviewer:'fixture-operator'},{load:async()=>{throw Error('expired must not fetch');}}),{code:'REVIEW_NOT_DUE'});
    });
    await t.test('provider-wide budget persists and only one concurrent call wins',async()=>{
      const {reserve}=require('../../services/core/services/providerBudget');const replies=await Promise.allSettled([reserve(),reserve(),reserve()]);assert.equal(replies.filter(r=>r.status==='fulfilled').length,1);assert.equal(await m.ProviderRequestLease.countDocuments(),1);
    });
    await t.test('HTTP binds link/read/delete to caller and cannot accept provider scores',async()=>{
      server=require('../../services/core/app').createApp({connection:mongoose.connection}).listen(0);await new Promise(r=>server.once('listening',r));
      const base='http://127.0.0.1:'+server.address().port+'/api/me/external-accounts',token=require('../../services/core/config/auth').generateToken(user),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
      assert.equal((await fetch(base)).status,401);assert.equal((await fetch(base+'?userId='+peer.id,{headers})).status,400);
      assert.equal((await fetch(base,{method:'POST',headers,body:JSON.stringify({provider:'codeforces',handle:'other',score:100})})).status,400);
      assert.equal((await fetch(base,{headers})).status,200);
      process.env.CODEFORCES_STATS_ENABLED='false';process.env.EXTERNAL_BONUS_ENABLED='false';
      assert.equal((await fetch(base,{method:'POST',headers,body:JSON.stringify({provider:'codeforces',handle:'other'})})).status,503);
      assert.equal((await service.read(peerCtx)).capabilities.every(c=>!c.enabled),true);
    });
  }finally{if(server)await new Promise(r=>server.close(r));delete process.env.CODEFORCES_STATS_ENABLED;delete process.env.EXTERNAL_BONUS_ENABLED;await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
